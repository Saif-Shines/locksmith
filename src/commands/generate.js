import chalk from 'chalk';
import { execa } from 'execa';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Using alias files for cleaner imports
import { multiselectIfInteractive } from '../utils/interactive/interactive.js';
import { CommandHandler, CommandResult } from '../core/command-base.js';
import { ErrorHandler } from '../core/error-handler.js';
import { AUTH_MODULE_SETTINGS, AUTH_MODULE_GUIDES } from '../core/constants.js';
import {
  getAuthModules,
  getCallbackUri,
  loadPreferredBroker,
  hasCredentials,
  hasAuthModules,
} from '../utils/core/config.js';
import {
  hasClaudeCode,
  hasGemini,
  hasCursor,
} from '../utils/core/detection.js';
import { handleConfigureLLMBroker } from './configure.js';
import { handleInitCommand } from './init.js';
import { handleAddCommand } from './add.js';

// Constants for LLM integrations
const CLAUDE_PROMPT_LIMIT = 8000;
const CLAUDE_MAX_LIMIT = 10000;
const TEMP_FILE_PREFIX = 'locksmith-prompt-';

/**
 * Validates module selection and returns selected modules
 */
function validateModuleSelection(handler, moduleFlag, savedModules) {
  if (savedModules.length === 0) {
    console.log(chalk.yellow('⚠️  No authentication modules configured.'));
    console.log(chalk.cyan('💡 Add modules first with: locksmith add'));
    console.log(
      chalk.cyan('💡 Or add modules with: locksmith add --module=<module-name>')
    );
    return { selectedModules: [], shouldContinue: false };
  }

  if (moduleFlag) {
    const normalized = String(moduleFlag).toLowerCase();
    if (!savedModules.includes(normalized)) {
      console.log(chalk.red(`❌ Module not configured: ${moduleFlag}`));
      console.log(
        chalk.cyan('💡 Configured modules:'),
        chalk.white(savedModules.join(', ') || 'none')
      );
      console.log(
        chalk.cyan(
          '💡 Add modules with: locksmith add auth --module=<module-name>'
        )
      );
      return {
        selectedModules: [],
        shouldContinue: false,
        error: `Module not configured: ${moduleFlag}`,
      };
    }
    return { selectedModules: [normalized], shouldContinue: true };
  }

  if (handler.useInteractive) {
    return validateInteractiveModuleSelection(handler, savedModules);
  }

  return { selectedModules: savedModules, shouldContinue: true };
}

/**
 * Handles interactive module selection
 */
async function validateInteractiveModuleSelection(handler, savedModules) {
  console.log(chalk.blue('📋 Available Authentication Modules:'));
  console.log(
    chalk.gray('  Choose which modules to generate configurations for:')
  );
  console.log();

  const moduleChoices = savedModules.map((moduleKey) => {
    const settings = AUTH_MODULE_SETTINGS[moduleKey];
    if (!settings) {
      return {
        name: `${moduleKey} - Unknown module`,
        value: moduleKey,
        short: moduleKey,
        checked: false,
      };
    }
    return {
      name: `${settings.name} - ${settings.description}`,
      value: moduleKey,
      short: settings.name,
      checked: true,
    };
  });

  const selectedModules = await multiselectIfInteractive(
    handler.useInteractive,
    'Select modules to generate configurations for:',
    moduleChoices,
    savedModules,
    { pageSize: 10 }
  );

  if (selectedModules.length === 0) {
    console.log(chalk.yellow('⚠️  No modules selected.'));
    console.log(
      chalk.cyan('💡 Select at least one module to generate configurations.')
    );
    return { selectedModules: [], shouldContinue: false };
  }

  displaySelectedModules(selectedModules);
  return { selectedModules, shouldContinue: true };
}

/**
 * Displays selected modules information
 */
function displaySelectedModules(selectedModules) {
  console.log(chalk.blue('📋 Selected Modules for Generation:'));
  selectedModules.forEach((moduleKey) => {
    const settings = AUTH_MODULE_SETTINGS[moduleKey];
    if (settings) {
      console.log(chalk.gray(`  • ${settings.name}`));
      console.log(chalk.gray(`    ${settings.description}`));
    } else {
      console.log(chalk.gray(`  • ${moduleKey} (unknown module)`));
    }
  });
  console.log();
}

/**
 * Builds the simplified generation prompt with guide URL based on selected modules
 */
function buildGenerationPrompt(selectedModules) {
  // Use the first selected module to determine the guide URL
  // If multiple modules selected, default to full-stack-auth
  const primaryModule =
    selectedModules.length > 0 ? selectedModules[0] : 'full-stack-auth';
  const guideUrl =
    AUTH_MODULE_GUIDES[primaryModule] || AUTH_MODULE_GUIDES['full-stack-auth'];

  return `Integrate Scalekit into your technology stack by intelligently analyzing your project environment, including secrets and configuration found in your \`~/.locksmith\` directory. Reference the [FSA Quickstart guide](${guideUrl}) for step-by-step integration, ensuring correct SDK installation, secure environment variable management, and robust authentication flow implementation. Adapt all instructions to fit your project's conventions for maximum reliability and security, and request any missing context if your tech stack or token management details are unclear.`;
}

/**
 * Saves the prompt to a file for debugging/review
 */
function savePromptToFile(prompt, customPath) {
  const defaultPath = path.join(
    os.homedir(),
    '.locksmith',
    'combined-prompt.txt'
  );
  const savePath = customPath || defaultPath;

  try {
    fs.writeFileSync(savePath, prompt, 'utf8');
    console.log(chalk.gray(`💾 Saved prompt to: ${savePath}`));
  } catch (e) {
    console.log(
      chalk.yellow(`⚠️  Failed to save prompt file: ${e?.message || e}`)
    );
  }
}

/**
 * Creates a temporary file with the prompt content
 */
function createTempPromptFile(prompt) {
  const tempFile = path.join(
    os.tmpdir(),
    `${TEMP_FILE_PREFIX}${Date.now()}.txt`
  );
  fs.writeFileSync(tempFile, prompt, 'utf8');
  return tempFile;
}

/**
 * Cleans up temporary files
 */
function cleanupTempFiles(tempFile) {
  try {
    if (tempFile && fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  } catch (e) {
    // Ignore cleanup errors
  }
}

/**
 * Handles Claude CLI integration
 */
async function handleClaudeIntegration(handler, prompt, verbose) {
  const claudeAvailable = hasClaudeCode();
  if (!claudeAvailable) {
    console.log(
      chalk.yellow(
        '⚠️  Claude CLI not detected. Launching broker configuration...'
      )
    );
    await handleConfigureLLMBroker({
      interactive: true,
      verbose: !!verbose,
    });
  }

  const claudeStillAvailable = hasClaudeCode();
  if (!claudeStillAvailable) {
    console.log(
      chalk.red('❌ Claude CLI still not available. Skipping invocation.')
    );
    return;
  }

  if (handler.isDryRun()) {
    console.log(chalk.yellow('⚠️  Dry run mode - Claude invocation skipped'));
    return;
  }

  console.log(chalk.cyan('🤖 Invoking Claude with the combined prompt...'));

  const tempFile = createTempPromptFile(prompt);
  const promptContent = fs.readFileSync(tempFile, 'utf8');
  const isInteractive = process.stdout.isTTY && process.stdin.isTTY;

  try {
    if (isInteractive) {
      await invokeClaudeInteractive(
        promptContent,
        tempFile,
        handler.useInteractive
      );
    } else {
      await invokeClaudeHeadless(promptContent, tempFile);
    }
  } catch (e) {
    console.log(chalk.gray('💡 Claude session ended'));
  } finally {
    cleanupTempFiles(tempFile);
  }
}

/**
 * Invokes Claude in interactive mode
 */
async function invokeClaudeInteractive(
  promptContent,
  tempFile,
  useInteractive
) {
  console.log(chalk.cyan('🚀 Starting Claude in Plan Mode...'));
  console.log(
    chalk.gray('💡 Claude will show full activity logs and handle the prompt')
  );

  const args = ['--permission-mode', 'plan'];

  // Pass the temp file containing the prompt
  if (tempFile) {
    args.push(tempFile);
  }

  // Debug log: Show the Claude command being invoked
  console.log(chalk.gray(`🔧 Debug: Invoking: claude ${args.join(' ')}`));

  await execa('claude', args, { stdio: 'inherit' });
}

/**
 * Invokes Claude in headless mode
 */
async function invokeClaudeHeadless(promptContent, tempFile) {
  console.log(chalk.yellow('⚠️  Non-interactive environment detected'));
  console.log(chalk.gray('💡 Using headless mode with prompt'));

  const args = ['--permission-mode', 'plan'];

  // Pass the temp file containing the prompt
  if (tempFile) {
    args.push(tempFile);
  }

  // Debug log: Show the Claude command being invoked
  console.log(chalk.gray(`🔧 Debug: Invoking: claude ${args.join(' ')}`));

  await execa('claude', args, {
    stdio: 'inherit',
  });
}

/**
 * Handles Gemini CLI integration
 */
async function handleGeminiIntegration(handler, prompt, verbose) {
  const geminiAvailable = hasGemini();
  if (!geminiAvailable) {
    console.log(
      chalk.yellow(
        '⚠️  Gemini CLI not detected. Launching broker configuration...'
      )
    );
    await handleConfigureLLMBroker({
      interactive: true,
      verbose: !!verbose,
    });
  }

  const geminiStillAvailable = hasGemini();
  if (!geminiStillAvailable) {
    console.log(
      chalk.red('❌ Gemini CLI still not available. Skipping invocation.')
    );
    return;
  }

  if (handler.isDryRun()) {
    console.log(chalk.yellow('⚠️  Dry run mode - Gemini invocation skipped'));
    return;
  }

  console.log(chalk.cyan('🤖 Invoking Gemini with the combined prompt...'));

  const tempFile = createTempPromptFile(prompt);
  const promptContent = fs.readFileSync(tempFile, 'utf8');
  const isInteractive = process.stdout.isTTY && process.stdin.isTTY;

  try {
    if (isInteractive) {
      await invokeGeminiInteractive(
        promptContent,
        tempFile,
        handler.useInteractive
      );
    } else {
      await invokeGeminiHeadless(promptContent, tempFile);
    }
  } catch (e) {
    console.log(chalk.gray('💡 Gemini session ended'));
  } finally {
    cleanupTempFiles(tempFile);
  }
}

/**
 * Invokes Gemini in interactive mode
 */
async function invokeGeminiInteractive(
  promptContent,
  tempFile,
  useInteractive
) {
  console.log(chalk.cyan('🚀 Starting Gemini in interactive mode...'));
  console.log(chalk.gray('💡 Gemini will process the prompt and show results'));

  const args = ['-p', promptContent];

  // Debug log: Show the Gemini command being invoked
  console.log(chalk.gray(`🔧 Debug: Invoking: gemini ${args.join(' ')}`));

  await execa('gemini', args, { stdio: 'inherit' });
}

/**
 * Invokes Gemini in headless mode
 */
async function invokeGeminiHeadless(promptContent, tempFile) {
  console.log(chalk.yellow('⚠️  Non-interactive environment detected'));
  console.log(chalk.gray('💡 Using headless mode with prompt'));

  const args = ['-p', promptContent];

  // Debug log: Show the Gemini command being invoked
  console.log(chalk.gray(`🔧 Debug: Invoking: gemini ${args.join(' ')}`));

  await execa('gemini', args, {
    stdio: 'inherit',
  });
}

/**
 * Handles Cursor Agent CLI integration
 */
async function handleCursorAgentIntegration(handler, prompt, verbose) {
  const cursorAvailable = hasCursor();
  if (!cursorAvailable) {
    console.log(
      chalk.yellow(
        '⚠️  Cursor Agent not detected. Launching broker configuration...'
      )
    );
    await handleConfigureLLMBroker({
      interactive: true,
      verbose: !!verbose,
    });
  }

  const cursorStillAvailable = hasCursor();
  if (!cursorStillAvailable) {
    console.log(
      chalk.red('❌ Cursor Agent still not available. Skipping invocation.')
    );
    return;
  }

  if (handler.isDryRun()) {
    console.log(
      chalk.yellow('⚠️  Dry run mode - Cursor Agent invocation skipped')
    );
    return;
  }

  console.log(
    chalk.cyan('🤖 Invoking Cursor Agent with the combined prompt...')
  );

  const tempFile = createTempPromptFile(prompt);
  const promptContent = fs.readFileSync(tempFile, 'utf8');
  const isInteractive = process.stdout.isTTY && process.stdin.isTTY;

  try {
    if (isInteractive) {
      await invokeCursorAgentInteractive(
        promptContent,
        tempFile,
        handler.useInteractive
      );
    } else {
      await invokeCursorAgentHeadless(promptContent, tempFile);
    }
  } catch (e) {
    console.log(chalk.gray('💡 Cursor Agent session ended'));
  } finally {
    cleanupTempFiles(tempFile);
  }
}

/**
 * Invokes Cursor Agent in interactive mode
 */
async function invokeCursorAgentInteractive(
  promptContent,
  tempFile,
  useInteractive
) {
  console.log(chalk.cyan('🚀 Starting Cursor Agent in interactive mode...'));
  console.log(
    chalk.gray('💡 Cursor Agent will process the prompt and show results')
  );

  // For cursor-agent, we pass the prompt directly as the argument
  const args = [promptContent];

  // Debug log: Show the Cursor Agent command being invoked
  console.log(
    chalk.gray(
      `🔧 Debug: Invoking: cursor-agent "${promptContent.substring(0, 50)}..."`
    )
  );

  await execa('cursor-agent', args, { stdio: 'inherit' });
}

/**
 * Invokes Cursor Agent in headless mode
 */
async function invokeCursorAgentHeadless(promptContent, tempFile) {
  console.log(chalk.yellow('⚠️  Non-interactive environment detected'));
  console.log(chalk.gray('💡 Using headless mode with prompt'));

  // For cursor-agent, we pass the prompt directly as the argument
  const args = [promptContent];

  // Debug log: Show the Cursor Agent command being invoked
  console.log(
    chalk.gray(
      `🔧 Debug: Invoking: cursor-agent "${promptContent.substring(0, 50)}..."`
    )
  );

  await execa('cursor-agent', args, {
    stdio: 'inherit',
  });
}

/**
 * Checks for existing setup and runs init/add flows if needed
 */
async function ensureSetupExists(handler) {
  const hasExistingCredentials = hasCredentials();
  const hasExistingModules = hasAuthModules();

  // If credentials exist, we can proceed (modules are optional)
  if (hasExistingCredentials) {
    // If modules also exist, we're fully set up
    if (hasExistingModules) {
      return true;
    }

    // If only credentials exist but no modules, offer to add modules but don't require it
    console.log(
      chalk.yellow(
        '⚠️  Credentials found but no authentication modules configured.'
      )
    );
    console.log(
      chalk.cyan(
        '💡 You can add modules now or proceed with generation (modules can be added later).\n'
      )
    );

    console.log(chalk.blue('🔧 Adding authentication modules...'));
    await handleAddCommand({
      interactive: true,
      ...handler.options,
    });

    // Even if no modules were added, we can still proceed with generation
    // The original generate logic handles the case of no modules gracefully
    console.log(chalk.green('\n✅ Proceeding with generation...\n'));
    return true;
  }

  // No credentials exist, need full setup
  console.log(chalk.yellow('⚠️  No existing Locksmith setup found.'));
  console.log(chalk.cyan("💡 Let's get you set up first...\n"));

  // Run init flow to get credentials
  console.log(chalk.blue('🔐 Running authentication setup...'));
  await handleInitCommand({
    interactive: true,
    ...handler.options,
  });

  // Check if init was successful
  if (!hasCredentials()) {
    console.log(
      chalk.red('❌ Setup incomplete. Cannot proceed with generation.')
    );
    return false;
  }

  // Now try to add modules (optional)
  console.log(chalk.blue('🔧 Adding authentication modules...'));
  await handleAddCommand({
    interactive: true,
    ...handler.options,
  });

  // Even if no modules were added, we can proceed since we have credentials
  console.log(
    chalk.green('\n✅ Setup complete! Proceeding with generation...\n')
  );
  return true;
}

export async function handleGenerateCommand(options = {}) {
  return await ErrorHandler.withErrorHandling(async () => {
    const handler = new CommandHandler(options);
    const {
      verbose,
      module: moduleFlag,
      'prompt-out': promptOutPath,
      promptOut,
      ...otherFlags
    } = options;

    handler.showInfo(
      'Generating secure configurations for your AI applications...',
      'This will create encrypted configs based on your authentication setup.'
    );

    // Check for existing setup and run init/add flows if needed
    const setupExists = await ensureSetupExists(handler);
    if (!setupExists) {
      return CommandResult.success('Setup cancelled or incomplete');
    }

    // 1. Validate and select modules
    const savedModules = getAuthModules();
    const moduleValidation = await validateModuleSelection(
      handler,
      moduleFlag,
      savedModules
    );

    if (!moduleValidation.shouldContinue) {
      return moduleValidation.error
        ? CommandResult.error(moduleValidation.error)
        : CommandResult.success(
            moduleValidation.message || 'Operation cancelled'
          );
    }

    const { selectedModules } = moduleValidation;

    // 3. Build the generation prompt
    const combinedPrompt = buildGenerationPrompt(selectedModules);

    // 4. Save prompt to file if requested
    const promptSavePath = promptOutPath || promptOut;
    if (promptSavePath) {
      savePromptToFile(combinedPrompt, promptSavePath);
    }

    // 5. Log generation details
    if (handler.isDryRun()) {
      handler.showWarning('Dry run mode - no files will be created');
    }

    const callbackUri = getCallbackUri();
    handler.logVerbose(
      'Generation details:',
      `Modules: ${selectedModules.join(', ')}, Dry run: ${
        handler.isDryRun() ? 'Yes' : 'No'
      }${callbackUri ? `, Callback URI: ${callbackUri}` : ''}`
    );

    // 6. Handle LLM broker integration
    const preferredBroker = (loadPreferredBroker() || '').toLowerCase();

    switch (preferredBroker) {
      case 'claude':
        await handleClaudeIntegration(handler, combinedPrompt, verbose);
        break;
      case 'gemini':
        await handleGeminiIntegration(handler, combinedPrompt, verbose);
        break;
      case 'cursor-agent':
        await handleCursorAgentIntegration(handler, combinedPrompt, verbose);
        break;
      default:
        if (preferredBroker) {
          console.log(
            chalk.yellow(
              `⚠️  Broker "${preferredBroker}" is not yet supported for generation.`
            )
          );
          console.log(
            chalk.cyan(
              '💡 Supported brokers for generation: claude, gemini, cursor-agent'
            )
          );
        } else {
          console.log(
            chalk.yellow(
              '⚠️  No preferred LLM broker configured. Run: locksmith configure llm'
            )
          );
          console.log(
            chalk.cyan(
              '💡 Configure a broker with: locksmith configure llm --interactive'
            )
          );
        }
        break;
    }

    return CommandResult.success('Generation process completed');
  }, 'generate');
}
