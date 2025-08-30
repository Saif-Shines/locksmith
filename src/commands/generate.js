import chalk from 'chalk';
import { execa } from 'execa';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Using alias files for cleaner imports
import { multiselectIfInteractive } from '../utils/interactive/interactive.js';
import { CommandHandler, CommandResult } from '../core/command-base.js';
import { ErrorHandler } from '../core/error-handler.js';
import {
  SUPPORTED_FORMATS,
  DEFAULT_FORMAT,
  DEFAULT_COUNT,
  AUTH_MODULE_SETTINGS,
} from '../core/constants.js';
import {
  getAuthModules,
  getCallbackUri,
  loadPreferredBroker,
} from '../utils/core/config.js';
import { hasClaudeCode } from '../utils/core/detection.js';
import { handleConfigureLLMBroker } from './configure.js';

// Constants for Claude integration
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
 * Builds the combined generation prompt from templates and config
 */
function buildGenerationPrompt() {
  let combinedPrompt = '';

  try {
    const templateUrl =
      'https://raw.githubusercontent.com/scalekit-inc/developer-docs/refs/heads/main/src/components/templates/prompts/fsa-quickstart.mdx';

    combinedPrompt += '=== Template: fsa-quickstart.mdx (link) ===\n';
    combinedPrompt += templateUrl + '\n\n';

    const configDir = path.join(os.homedir(), '.locksmith');
    const authModulesPath = path.join(configDir, 'auth-modules.json');

    if (fs.existsSync(authModulesPath)) {
      combinedPrompt += '=== Locksmith Config Files ===\n';
      try {
        const content = fs.readFileSync(authModulesPath, 'utf8');
        combinedPrompt += `\n--- auth-modules.json ---\n` + content + '\n';
      } catch {
        // ignore file read errors
      }
    }
  } catch (e) {
    console.log(chalk.yellow(`⚠️  Failed to build prompt: ${e?.message || e}`));
  }

  return combinedPrompt;
}

/**
 * Validates generation options (format, count, output)
 */
function validateGenerationOptions(handler, format, output, count) {
  const selectedFormat = format || DEFAULT_FORMAT;

  if (!SUPPORTED_FORMATS.includes(selectedFormat.toLowerCase())) {
    return {
      isValid: false,
      error: `Unsupported format: ${selectedFormat}. Supported: ${SUPPORTED_FORMATS.join(
        ', '
      )}`,
    };
  }

  const itemCount = count || DEFAULT_COUNT;
  if (isNaN(itemCount) || itemCount < 1) {
    return {
      isValid: false,
      error: 'Count must be a positive number.',
    };
  }

  return {
    isValid: true,
    options: {
      format: selectedFormat,
      output: output,
      count: itemCount,
    },
  };
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
  const preferredBroker = (loadPreferredBroker() || '').toLowerCase();

  if (preferredBroker !== 'claude') {
    if (preferredBroker) {
      console.log(
        chalk.yellow(
          `⚠️  Broker "${preferredBroker}" not yet supported here. Claude only for now.`
        )
      );
    } else {
      console.log(
        chalk.yellow(
          '⚠️  No preferred LLM broker configured. Run: locksmith configure llm'
        )
      );
    }
    return;
  }

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

  // In interactive mode (default), don't pass -p flag - let Claude prompt for input
  // In non-interactive mode but still TTY, pass the prompt via -p flag
  if (!useInteractive) {
    if (promptContent.length < CLAUDE_PROMPT_LIMIT) {
      args.push('-p', promptContent);
    } else {
      const promptWithFile = `${promptContent}\n\nNote: For additional context, also check: ${tempFile}`;
      args.push('-p', promptWithFile);
    }
  }

  await execa('claude', args, { stdio: 'inherit' });
}

/**
 * Invokes Claude in headless mode
 */
async function invokeClaudeHeadless(promptContent, tempFile) {
  console.log(chalk.yellow('⚠️  Non-interactive environment detected'));
  console.log(chalk.gray('💡 Using headless mode with prompt'));

  const promptArg =
    promptContent.length < CLAUDE_MAX_LIMIT
      ? promptContent
      : `Read and follow the prompt from this file: ${tempFile}`;

  await execa('claude', ['--permission-mode', 'plan', '-p', promptArg], {
    stdio: 'inherit',
  });
}

export async function handleGenerateCommand(options = {}) {
  return await ErrorHandler.withErrorHandling(async () => {
    const handler = new CommandHandler(options);
    const {
      format,
      output,
      count,
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

    // 2. Validate generation options
    const optionsValidation = validateGenerationOptions(
      handler,
      format,
      output,
      count
    );
    if (!optionsValidation.isValid) {
      return handler.handleValidationError(optionsValidation.error);
    }

    const {
      format: selectedFormat,
      output: outputPath,
      count: itemCount,
    } = optionsValidation.options;

    // 3. Build the generation prompt
    const combinedPrompt = buildGenerationPrompt();

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
      `Modules: ${selectedModules.join(
        ', '
      )}, Format: ${selectedFormat}, Output: ${
        outputPath || 'stdout'
      }, Count: ${itemCount}, Dry run: ${handler.isDryRun() ? 'Yes' : 'No'}${
        callbackUri ? `, Callback URI: ${callbackUri}` : ''
      }`
    );

    // 6. Handle Claude integration
    await handleClaudeIntegration(handler, combinedPrompt, verbose);

    return CommandResult.success('Generation process completed');
  }, 'generate');
}
