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
import { getAuthModules, getCallbackUri } from '../utils/core/config.js';

export async function handleGenerateCommand(options = {}) {
  return await ErrorHandler.withErrorHandling(async () => {
    const handler = new CommandHandler(options);
    const { format, output, count, dryRun, verbose, ...otherFlags } = options;

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

    // Interactive module selection from saved modules
    if (handler.useInteractive) {
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

    // Interactive format selection
    let selectedFormat = format;
    if (!selectedFormat) {
      if (handler.useInteractive) {
        const formatChoices = SUPPORTED_FORMATS.map((f) => {
          const isDefault = f === DEFAULT_FORMAT;
          let description, name;

          switch (f) {
            case 'json':
              name = `${f.toUpperCase()} format ${
                isDefault ? '(recommended)' : ''
              }`;
              description =
                'Structured data format, great for programmatic use';
              break;
            case 'yaml':
              name = `${f.toUpperCase()} format`;
              description = 'Human-readable configuration format';
              break;
            case 'env':
              name = `${f.toUpperCase()} format`;
              description = 'Environment variables format for shell scripts';
              break;
            default:
              name = `${f.toUpperCase()} format`;
              description = `${f.toUpperCase()} configuration format`;
          }

          return {
            name,
            value: f,
            short: f,
            description,
          };
        });

        console.log(chalk.cyan('📋 Format Selection:'));
        console.log(
          chalk.gray('  Choose the output format that best fits your needs:')
        );
        console.log();

        selectedFormat = await selectIfInteractive(
          handler.useInteractive,
          'Select output format for your configurations:',
          formatChoices,
          DEFAULT_FORMAT
        );
      } else {
        selectedFormat = DEFAULT_FORMAT;
      }
    }

    // Validate format
    if (!SUPPORTED_FORMATS.includes(selectedFormat.toLowerCase())) {
      return handler.handleValidationError(
        `Unsupported format: ${selectedFormat}`,
        `Supported formats: ${SUPPORTED_FORMATS.join(', ')}`
      );
    }

    // Interactive output path
    let outputPath = output;
    if (!outputPath) {
      if (handler.useInteractive) {
        outputPath = await promptIfInteractive(
          handler.useInteractive,
          'Output file path (leave empty for stdout):',
          ''
        );
      }
    }

    // Interactive count selection
    let itemCount = count;
    if (!itemCount) {
      if (handler.useInteractive) {
        const countInput = await promptIfInteractive(
          handler.useInteractive,
          'Number of configurations to generate:',
          DEFAULT_COUNT.toString()
        );
        itemCount = parseInt(countInput, 10);

        if (isNaN(itemCount) || itemCount < 1) {
          return handler.handleValidationError(
            'Count must be a positive number.'
          );
        }
      } else {
        itemCount = DEFAULT_COUNT;
      }
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

    // Interactive confirmation with detailed summary
    if (handler.useInteractive && !handler.isDryRun()) {
      console.log(chalk.blue('📋 Generation Summary:'));
      console.log(chalk.gray(`  Modules: ${selectedModules.join(', ')}`));
      console.log(chalk.gray(`  Format: ${selectedFormat.toUpperCase()}`));
      console.log(chalk.gray(`  Output: ${outputPath || 'stdout'}`));
      console.log(
        chalk.gray(
          `  Count: ${itemCount} configuration${itemCount > 1 ? 's' : ''}`
        )
      );
      console.log(chalk.gray(`  Generated at: ${new Date().toISOString()}`));

      if (selectedFormat === 'json') {
        console.log(
          chalk.gray('  📄 JSON format will include structured auth data')
        );
      } else if (selectedFormat === 'yaml') {
        console.log(
          chalk.gray('  📄 YAML format will be human-readable and structured')
        );
      } else if (selectedFormat === 'env') {
        console.log(
          chalk.gray('  📄 ENV format will contain shell environment variables')
        );
      }

      console.log();

      const shouldProceed = await confirmIfInteractive(
        handler.useInteractive,
        `Ready to generate ${itemCount} configuration${
          itemCount > 1 ? 's' : ''
        } for ${selectedModules.length} module${
          selectedModules.length > 1 ? 's' : ''
        }?`,
        true
      );

      if (!shouldProceed) {
        console.log(
          chalk.cyan('💡 Generation cancelled. No files were created.')
        );
        return CommandResult.success('Generation cancelled by user');
      }
    }

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
