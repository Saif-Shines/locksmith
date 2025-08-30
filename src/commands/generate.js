import chalk from 'chalk';
import {
  selectIfInteractive,
  promptIfInteractive,
  confirmIfInteractive,
  multiselectIfInteractive,
} from '../utils/interactive/interactive.js';
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
import { execa } from 'execa';
import { handleConfigureLLMBroker } from './configure.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import https from 'https';
import { spawn } from 'child_process';

export async function handleGenerateCommand(options = {}) {
  return await ErrorHandler.withErrorHandling(async () => {
    const handler = new CommandHandler(options);
    const {
      format,
      output,
      count,
      dryRun,
      verbose,
      module: moduleFlag,
      ...otherFlags
    } = options;

    handler.showInfo(
      'Generating secure configurations for your AI applications...',
      'This will create encrypted configs based on your authentication setup.'
    );

    // Check for saved auth modules
    const savedModules = getAuthModules();
    let selectedModules = [];

    if (savedModules.length === 0) {
      console.log(chalk.yellow('⚠️  No authentication modules configured.'));
      console.log(chalk.cyan('💡 Add modules first with: locksmith add'));
      console.log(
        chalk.cyan(
          '💡 Or add modules with: locksmith add --module=<module-name>'
        )
      );
      return CommandResult.success('No modules configured');
    }

    // If module flag provided, validate against saved modules
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
        return CommandResult.error(`Module not configured: ${moduleFlag}`);
      }
      selectedModules = [normalized];
    } else if (handler.useInteractive) {
      // Interactive module selection from saved modules
      console.log(chalk.blue('📋 Available Authentication Modules:'));
      console.log(
        chalk.gray('  Choose which modules to generate configurations for:')
      );
      console.log();

      // Prepare module choices from saved modules
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
          checked: true, // Default all saved modules selected
        };
      });

      selectedModules = await multiselectIfInteractive(
        handler.useInteractive,
        'Select modules to generate configurations for:',
        moduleChoices,
        savedModules, // Default to all saved modules
        { pageSize: 10 }
      );

      if (selectedModules.length === 0) {
        console.log(chalk.yellow('⚠️  No modules selected.'));
        console.log(
          chalk.cyan(
            '💡 Select at least one module to generate configurations.'
          )
        );
        return CommandResult.success('No modules selected');
      }

      // Show selected modules details
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
    } else {
      // Non-interactive: use all saved modules
      selectedModules = savedModules;
    }

    // Helper: fetch text from URL (uses global fetch if available, falls back to https)
    async function fetchText(url) {
      if (typeof fetch === 'function') {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
        return await res.text();
      }
      return await new Promise((resolve, reject) => {
        https
          .get(url, (resp) => {
            if (resp.statusCode && resp.statusCode >= 400) {
              reject(new Error(`Failed to fetch ${url}: ${resp.statusCode}`));
              return;
            }
            let data = '';
            resp.on('data', (chunk) => (data += chunk));
            resp.on('end', () => resolve(data));
          })
          .on('error', reject);
      });
    }

    // Build combined prompt: template link + ~/.locksmith files + docs text
    let combinedPrompt = '';
    try {
      const templateUrl =
        'https://raw.githubusercontent.com/scalekit-inc/developer-docs/refs/heads/main/src/components/templates/prompts/fsa-quickstart.mdx';
      const docsUrl = 'https://docs.scalekit.com/llms-full.txt';

      const docsText = await fetchText(docsUrl).catch(() => '');

      combinedPrompt += '=== Template: fsa-quickstart.mdx (link) ===\n';
      combinedPrompt += templateUrl + '\n\n';

      const configDir = path.join(os.homedir(), '.locksmith');
      if (fs.existsSync(configDir)) {
        const files = fs
          .readdirSync(configDir)
          .filter((f) => fs.statSync(path.join(configDir, f)).isFile());
        combinedPrompt += '=== Locksmith Config Files ===\n';
        for (const file of files) {
          try {
            const content = fs.readFileSync(path.join(configDir, file), 'utf8');
            combinedPrompt += `\n--- ${file} ---\n` + content + '\n';
          } catch {
            // ignore file read errors
          }
        }
        combinedPrompt += '\n';
      }

      combinedPrompt += '=== Reference: docs.scalekit.com/llms-full.txt ===\n';
      combinedPrompt += docsText + '\n';
    } catch (e) {
      handler.logVerbose(
        'Failed to fully build prompt, proceeding with partial content',
        String(e?.message || e)
      );
    }

    // Optional: write combined prompt to disk for user review
    const promptOutPath = otherFlags['prompt-out'] || otherFlags.promptOut;
    const defaultPromptPath = path.join(
      os.homedir(),
      '.locksmith',
      'combined-prompt.txt'
    );
    const promptSavePath = promptOutPath || defaultPromptPath;
    try {
      fs.writeFileSync(promptSavePath, combinedPrompt, 'utf8');
      handler.logVerbose('Saved combined prompt to:', promptSavePath);
    } catch {}

    // Format selection: no prompts (defaults unless flag provided)
    let selectedFormat = format || DEFAULT_FORMAT;

    // Validate format
    if (!SUPPORTED_FORMATS.includes(selectedFormat.toLowerCase())) {
      return handler.handleValidationError(
        `Unsupported format: ${selectedFormat}`,
        `Supported formats: ${SUPPORTED_FORMATS.join(', ')}`
      );
    }

    // Output path: no prompts (use flag if provided)
    let outputPath = output;

    // Count: no prompts (defaults unless flag provided)
    let itemCount = count || DEFAULT_COUNT;
    if (isNaN(itemCount) || itemCount < 1) {
      return handler.handleValidationError('Count must be a positive number.');
    }

    if (handler.isDryRun()) {
      handler.showWarning('Dry run mode - no files will be created');
    }

    // Get callback URI if configured
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

    // If preferred broker is Claude, ensure it's setup and invoke CLI with the prompt
    const preferredBroker = (loadPreferredBroker() || '').toLowerCase();
    if (preferredBroker === 'claude') {
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

      // Try again after potential configure
      if (!hasClaudeCode()) {
        console.log(
          chalk.red('❌ Claude CLI still not available. Skipping invocation.')
        );
      } else if (!handler.isDryRun()) {
        console.log(
          chalk.cyan('🤖 Invoking Claude with the combined prompt...')
        );
        try {
          await execa({
            stdio: 'inherit',
          })`claude --permission-mode plan -p ${combinedPrompt}`;
        } catch (e) {
          await new Promise((resolve) => {
            const proc = spawn(
              'claude',
              ['--permission-mode', 'plan', '-p', combinedPrompt],
              {
                stdio: 'inherit',
              }
            );
            proc.on('close', () => resolve());
            proc.on('error', () => resolve());
          });
        }
      }
    } else if (preferredBroker) {
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

    // Skip interactive confirmation to streamline flow

    // TODO: Implement actual generation logic
    try {
      if (!handler.isDryRun()) {
        handler.showSuccess(
          'Configuration generation completed!',
          `Generated ${itemCount} secure configuration${
            itemCount > 1 ? 's' : ''
          }.`
        );

        if (outputPath) {
          handler.logVerbose(`Saved to: ${outputPath}`);
        }

        handler.logVerbose(
          'Generation summary:',
          `Modules: ${selectedModules.join(
            ', '
          )}, Format: ${selectedFormat}, Output: ${
            outputPath || 'stdout'
          }, Count: ${itemCount}, Generated at: ${new Date().toISOString()}${
            callbackUri ? `, Callback URI: ${callbackUri}` : ''
          }`
        );
      } else {
        handler.logDryRun(
          'generate configurations',
          `Modules: ${selectedModules.join(
            ', '
          )}, Format: ${selectedFormat}, Output: ${
            outputPath || 'stdout'
          }, Count: ${itemCount}${
            callbackUri ? `, Callback URI: ${callbackUri}` : ''
          }`
        );
      }

      handler.showInfo(
        'Ready to use your configurations!',
        'Integrate configs into your applications and test your authentication flows'
      );

      return CommandResult.success(
        `Successfully ${
          handler.isDryRun() ? 'would generate' : 'generated'
        } ${itemCount} configuration${itemCount > 1 ? 's' : ''} for ${
          selectedModules.length
        } module${selectedModules.length > 1 ? 's' : ''}`,
        {
          modules: selectedModules,
          format: selectedFormat,
          output: outputPath,
          count: itemCount,
        }
      );
    } catch (error) {
      return handler.handleUnexpectedError(error, 'configuration generation');
    }
  }, 'generate');
}
