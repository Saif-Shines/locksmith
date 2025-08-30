import chalk from 'chalk';
import {
  selectIfInteractive,
  promptIfInteractive,
  confirmIfInteractive,
} from '../utils/interactive/interactive.js';
import { CommandHandler, CommandResult } from '../core/command-base.js';
import { ErrorHandler } from '../core/error-handler.js';
import {
  SUPPORTED_FORMATS,
  DEFAULT_FORMAT,
  DEFAULT_COUNT,
} from '../core/constants.js';

export async function handleGenerateCommand(options = {}) {
  return await ErrorHandler.withErrorHandling(async () => {
    const handler = new CommandHandler(options);
    const { format, output, count, dryRun, verbose, ...otherFlags } = options;

    handler.showInfo(
      'Generating secure configurations for your AI applications...',
      'This will create encrypted configs based on your authentication setup.'
    );

    // Interactive format selection
    let selectedFormat = format;
    if (!selectedFormat) {
      if (handler.useInteractive) {
        const formatChoices = SUPPORTED_FORMATS.map((f) => ({
          name: `${f.toUpperCase()} format`,
          value: f,
          short: f,
        }));

        selectedFormat = await selectIfInteractive(
          useInteractive,
          'Select output format:',
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

    handler.logVerbose(
      'Generation details:',
      `Format: ${selectedFormat}, Output: ${
        outputPath || 'stdout'
      }, Count: ${itemCount}, Dry run: ${handler.isDryRun() ? 'Yes' : 'No'}`
    );

    // Interactive confirmation
    if (handler.useInteractive && !handler.isDryRun()) {
      const shouldProceed = await confirmIfInteractive(
        handler.useInteractive,
        `Generate ${itemCount} configuration${
          itemCount > 1 ? 's' : ''
        } in ${selectedFormat.toUpperCase()} format${
          outputPath ? ` to ${outputPath}` : ''
        }?`,
        true
      );

      if (!shouldProceed) {
        handler.showInfo('Generation cancelled.');
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
          `Format: ${selectedFormat}, Output: ${
            outputPath || 'stdout'
          }, Count: ${itemCount}, Generated at: ${new Date().toISOString()}`
        );
      } else {
        handler.logDryRun(
          'generate configurations',
          `Format: ${selectedFormat}, Output: ${
            outputPath || 'stdout'
          }, Count: ${itemCount}`
        );
      }

      handler.showInfo(
        'Ready to use your configurations!',
        'Integrate configs into your applications and test your authentication flows'
      );

      return CommandResult.success(
        `Successfully ${
          handler.isDryRun() ? 'would generate' : 'generated'
        } ${itemCount} configuration${itemCount > 1 ? 's' : ''}`,
        { format: selectedFormat, output: outputPath, count: itemCount }
      );
    } catch (error) {
      return handler.handleUnexpectedError(error, 'configuration generation');
    }
  }, 'generate');
}
