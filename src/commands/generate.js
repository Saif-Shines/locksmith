import chalk from 'chalk';
import { execa } from 'execa';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { startSpinner, startBrokerSpinner } from '../utils/display/spinner.js';

// Using alias files for cleaner imports
import {
  multiselectIfInteractive,
  promptIfInteractive,
  selectIfInteractive,
} from '../utils/interactive/interactive.js';
import { CommandHandler, CommandResult } from '../core/command-base.js';
import { ErrorHandler } from '../core/error-handler.js';
import {
  AUTH_MODULE_SETTINGS,
  AUTH_MODULE_GUIDES,
  SUPPORTED_AUTH_MODULES,
  AVAILABLE_BROKERS,
} from '../core/constants.js';
import {
  getAuthModules,
  getCallbackUri,
  loadPreferredBroker,
  hasCredentials,
  hasAuthModules,
  saveCredentials,
  saveAuthModules,
  savePreferredBroker,
  loadCredentials,
  loadAuthModules,
} from '../utils/core/config.js';
import {
  hasClaudeCode,
  hasGemini,
  hasCursor,
} from '../utils/core/detection.js';
import {
  promptEnvironmentId,
  promptRemainingCredentials,
  confirmAction,
} from '../utils/interactive/prompts.js';
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

  const moduleChoices = SUPPORTED_AUTH_MODULES.map((moduleKey) => {
    const settings = AUTH_MODULE_SETTINGS[moduleKey];
    const isAlreadyConfigured = savedModules.includes(moduleKey);
    return {
      name: `${settings.name} - ${settings.description}`,
      value: moduleKey,
      short: settings.name,
      checked: isAlreadyConfigured,
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
 * Prompts for missing auth credentials with full setup flow (like init command)
 */
async function promptMissingCredentials(handler) {
  console.log(chalk.yellow('⚠️  Auth credentials not configured'));
  console.log(chalk.blue('🔐 Setting up authentication credentials...'));

  if (!handler.useInteractive) {
    console.log(chalk.red('❌ Interactive mode required for credential setup'));
    console.log(chalk.cyan('💡 Run: locksmith init --interactive'));
    return false;
  }

  try {
    // Import the init command functions we need
    const {
      handleProviderSelection,
      openScaleKitSignup,
      collectEnvironmentId,
      openApiCredentialsPage,
      collectAndValidateCredentials,
      confirmAndSaveCredentials,
    } = await import('./init.js');

    // Step 1: Handle provider selection (should always be ScaleKit for now)
    console.log(chalk.blue('📋 ScaleKit Setup:'));
    console.log(
      chalk.gray('  • Enterprise-grade authentication for AI applications')
    );
    console.log(
      chalk.gray('  • Supports SSO, multi-tenant, and custom auth flows')
    );
    console.log(chalk.gray('  • Perfect for production AI applications'));
    console.log(
      chalk.cyan("  💡 We'll help you set up your API credentials securely\n")
    );

    // Step 2: Open browser for ScaleKit signup
    await openScaleKitSignup();

    // Step 3: Collect environment ID
    const environmentId = await collectEnvironmentId();
    if (!environmentId) {
      console.log(chalk.yellow('⚠️ Environment ID collection cancelled'));
      return false;
    }

    // Step 4: Open API credentials page
    await openApiCredentialsPage(environmentId);

    // Step 5: Collect and validate credentials
    const credentials = await collectAndValidateCredentials(environmentId);
    if (!credentials) {
      console.log(chalk.yellow('⚠️ Credential collection cancelled or failed'));
      return false;
    }

    // Step 6: Confirm and save credentials
    console.log(chalk.blue('\n📋 Setup Summary:'));
    console.log(chalk.gray(`  Provider: ScaleKit`));
    console.log(chalk.gray(`  Environment ID: ${credentials.environmentId}`));
    console.log(chalk.gray(`  Client ID: ${credentials.clientId}`));
    console.log(chalk.gray(`  Configured at: ${new Date().toISOString()}`));
    console.log(chalk.gray('  🔐 Credentials will be saved securely'));

    console.log();

    const { confirmAction } = await import('../utils/interactive/prompts.js');
    const shouldSave = await confirmAction(
      'Save these authentication credentials?'
    );

    if (!shouldSave) {
      console.log(chalk.cyan('💡 Setup cancelled. No credentials were saved.'));
      console.log(
        chalk.cyan(
          "💡 You can run `locksmith init` again whenever you're ready."
        )
      );
      return false;
    }

    // Save the credentials
    saveCredentials(credentials);
    console.log(chalk.green('✅ Auth credentials configured\n'));
    return true;
  } catch (error) {
    console.log(
      chalk.red(`❌ Failed to collect credentials: ${error.message}`)
    );
    return false;
  }
}

/**
 * Prompts for missing callback URI only
 */
async function promptMissingCallbackUri(handler) {
  console.log(chalk.yellow('⚠️  Callback URI not configured'));
  console.log(chalk.blue('🔧 Configuring callback URI...'));

  if (!handler.useInteractive) {
    console.log(
      chalk.red('❌ Interactive mode required for callback URI setup')
    );
    console.log(chalk.cyan('💡 Run: locksmith init --interactive'));
    return false;
  }

  try {
    const callbackUri = await promptIfInteractive(
      handler.useInteractive,
      'Callback URI (redirect URL for your application):',
      '',
      (input) => {
        if (!input.trim()) return 'Callback URI is required';
        if (!input.startsWith('http://') && !input.startsWith('https://')) {
          return 'Callback URI must be a valid HTTP/HTTPS URL';
        }
        return true;
      }
    );

    if (!callbackUri) {
      console.log(chalk.red('❌ Callback URI is required'));
      return false;
    }

    // Load existing auth modules config and update callback URI
    const existingModulesConfig = loadAuthModules() || {
      selectedModules: [],
      selectedAt: new Date().toISOString(),
      version: '1.0',
    };
    const updatedModulesConfig = {
      ...existingModulesConfig,
      callbackUri: callbackUri.trim(),
    };

    saveAuthModules([], updatedModulesConfig);
    console.log(chalk.green('✅ Callback URI configured\n'));
    return true;
  } catch (error) {
    console.log(
      chalk.red(`❌ Failed to configure callback URI: ${error.message}`)
    );
    return false;
  }
}

/**
 * Prompts for missing auth modules only
 */
async function promptMissingAuthModules(handler) {
  console.log(chalk.yellow('⚠️  No auth modules configured'));
  console.log(chalk.blue('🔧 Adding authentication modules...'));

  if (!handler.useInteractive) {
    console.log(chalk.red('❌ Interactive mode required for module selection'));
    console.log(chalk.cyan('💡 Run: locksmith add --interactive'));
    return false;
  }

  try {
    const moduleChoices = SUPPORTED_AUTH_MODULES.map((moduleKey) => {
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
      'Select authentication modules to add:',
      moduleChoices,
      SUPPORTED_AUTH_MODULES,
      { pageSize: 10 }
    );

    if (selectedModules.length === 0) {
      console.log(chalk.yellow('⚠️  No modules selected - proceeding anyway'));
      return true; // Not a failure, just no modules added
    }

    saveAuthModules(selectedModules);
    displaySelectedModules(selectedModules);
    console.log(chalk.green('✅ Auth modules configured\n'));
    return true;
  } catch (error) {
    console.log(
      chalk.red(`❌ Failed to configure auth modules: ${error.message}`)
    );
    return false;
  }
}

/**
 * Prompts for missing LLM broker only
 */
async function promptMissingLLMBroker(handler) {
  console.log(chalk.yellow('⚠️  No LLM broker configured'));
  console.log(chalk.blue('🤖 Configuring LLM broker...'));

  if (!handler.useInteractive) {
    console.log(chalk.red('❌ Interactive mode required for broker selection'));
    console.log(chalk.cyan('💡 Run: locksmith configure llm --interactive'));
    return false;
  }

  try {
    const brokerChoices = AVAILABLE_BROKERS.map((broker) => ({
      name: broker,
      value: broker,
      short: broker,
    }));

    const selectedBroker = await selectIfInteractive(
      handler.useInteractive,
      'Select your preferred LLM broker:',
      brokerChoices,
      AVAILABLE_BROKERS[0] // Default to first broker
    );

    if (!selectedBroker) {
      console.log(chalk.red('❌ LLM broker selection is required'));
      return false;
    }

    savePreferredBroker(selectedBroker);
    console.log(chalk.green(`✅ LLM broker configured: ${selectedBroker}\n`));
    return true;
  } catch (error) {
    console.log(
      chalk.red(`❌ Failed to configure LLM broker: ${error.message}`)
    );
    return false;
  }
}

/**
 * Comprehensive setup validation with targeted prompts
 */
async function ensureCompleteSetup(handler) {
  let setupSpinner = startSpinner('SETUP_VALIDATION');

  try {
    // 1. Check auth credentials
    setupSpinner.text = '🔐 Checking authentication credentials...';
    if (!hasCredentials()) {
      setupSpinner.stop();
      const success = await promptMissingCredentials(handler);
      if (!success) {
        return false;
      }
      setupSpinner = startSpinner('SETUP_VALIDATION');
    }

    // 2. Check callback URI
    setupSpinner.text = '🔗 Checking callback URI configuration...';
    const callbackUri = getCallbackUri();
    if (!callbackUri) {
      setupSpinner.stop();
      const success = await promptMissingCallbackUri(handler);
      if (!success) {
        return false;
      }
      setupSpinner = startSpinner('SETUP_VALIDATION');
    }

    // 3. Check auth modules
    setupSpinner.text = '📦 Checking authentication modules...';
    if (!hasAuthModules()) {
      setupSpinner.stop();
      const success = await promptMissingAuthModules(handler);
      if (!success) {
        return false;
      }
      setupSpinner = startSpinner('SETUP_VALIDATION');
    }

    // 4. Check LLM broker
    setupSpinner.text = '🤖 Checking LLM broker configuration...';
    const preferredBroker = loadPreferredBroker();
    if (!preferredBroker) {
      setupSpinner.stop();
      const success = await promptMissingLLMBroker(handler);
      if (!success) {
        return false;
      }
      setupSpinner = startSpinner('SETUP_VALIDATION');
    }

    setupSpinner.succeed('Setup validation complete');
    console.log(
      chalk.green('🎉 All prerequisites met and ready for generation.\n')
    );
    return true;
  } catch (error) {
    setupSpinner.fail('Setup validation failed');
    throw error;
  }
}

export async function handleGenerateCommand(options = {}) {
  return await ErrorHandler.withErrorHandling(async () => {
    const handler = new CommandHandler(options);
    const { verbose, module: moduleFlag, promptOut } = options;

    handler.showInfo(
      'Generating secure configurations for your AI applications...',
      'This will create encrypted configs based on your authentication setup.'
    );

    // Ensure all prerequisites are met
    const setupComplete = await ensureCompleteSetup(handler);
    if (!setupComplete) {
      return CommandResult.failure(
        'Setup incomplete - cannot proceed with generation'
      );
    }

    // Get available modules and validate selection
    const savedModules = getAuthModules();
    const moduleValidation = await validateModuleSelection(
      handler,
      moduleFlag,
      savedModules
    );

    if (!moduleValidation.shouldContinue) {
      return moduleValidation.error
        ? CommandResult.failure(moduleValidation.error)
        : CommandResult.success('Operation cancelled');
    }

    const { selectedModules } = moduleValidation;

    // Build and optionally save the generation prompt
    const combinedPrompt = buildGenerationPrompt(selectedModules);
    if (promptOut) {
      savePromptToFile(combinedPrompt, promptOut);
    }

    // Log generation details
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

    // Execute with configured LLM broker
    const preferredBroker = (loadPreferredBroker() || '').toLowerCase();

    const generationSpinner = startBrokerSpinner(preferredBroker);

    try {
      switch (preferredBroker) {
        case 'claude':
          await handleClaudeIntegration(handler, combinedPrompt, verbose);
          break;
        case 'gemini':
          await handleGeminiIntegration(handler, combinedPrompt, verbose);
          break;
        case 'cursor':
          await handleCursorAgentIntegration(handler, combinedPrompt, verbose);
          break;
        default:
          generationSpinner.fail(`Unsupported LLM broker: ${preferredBroker}`);
          console.log(
            chalk.cyan('💡 Supported brokers: claude, gemini, cursor')
          );
          return CommandResult.failure(
            `Unsupported LLM broker: ${preferredBroker}. Supported: claude, gemini, cursor`
          );
      }

      generationSpinner.succeed(
        `Configuration generation complete with ${preferredBroker}`
      );
    } catch (error) {
      generationSpinner.fail(`Generation failed with ${preferredBroker}`);
      throw error;
    }

    return CommandResult.success('Generation process completed');
  }, 'generate');
}
