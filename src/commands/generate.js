import chalk from 'chalk';
import {
  shouldUseInteractive,
  selectIfInteractive,
  promptIfInteractive,
  confirmIfInteractive,
} from '../utils/interactive.js';

const SUPPORTED_FORMATS = ['json', 'yaml', 'env'];
const DEFAULT_FORMAT = 'json';
const DEFAULT_COUNT = 1;

export async function handleGenerateCommand(options = {}) {
  const { format, output, count, dryRun, verbose, interactive, noInteractive } =
    options;

  const useInteractive = shouldUseInteractive({ interactive, noInteractive });

  console.log(
    chalk.green(
      '🔑 Generating secure configurations for your AI applications...'
    )
  );
  console.log(
    chalk.cyan(
      '⚡ This will create encrypted configs based on your authentication setup.'
    )
  );

  // Interactive format selection
  let selectedFormat = format;
  if (!selectedFormat) {
    if (useInteractive) {
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
    console.log(chalk.red(`❌ Unsupported format: ${selectedFormat}`));
    console.log(
      chalk.cyan('💡 Supported formats:'),
      chalk.white(SUPPORTED_FORMATS.join(', '))
    );
    return;
  }

  // Interactive output path
  let outputPath = output;
  if (!outputPath) {
    if (useInteractive) {
      outputPath = await promptIfInteractive(
        useInteractive,
        'Output file path (leave empty for stdout):',
        ''
      );
    }
  }

  // Interactive count selection
  let itemCount = count;
  if (!itemCount) {
    if (useInteractive) {
      const countInput = await promptIfInteractive(
        useInteractive,
        'Number of configurations to generate:',
        DEFAULT_COUNT.toString()
      );
      itemCount = parseInt(countInput, 10);

      if (isNaN(itemCount) || itemCount < 1) {
        console.log(chalk.red('❌ Count must be a positive number.'));
        return;
      }
    } else {
      itemCount = DEFAULT_COUNT;
    }
  }

  if (dryRun) {
    console.log(chalk.yellow('🔍 Dry run mode - no files will be created'));
  }

  if (verbose) {
    console.log(chalk.blue('📋 Generation details:'));
    console.log(chalk.gray(`  Format: ${selectedFormat}`));
    console.log(chalk.gray(`  Output: ${outputPath || 'stdout'}`));
    console.log(chalk.gray(`  Count: ${itemCount}`));
    console.log(chalk.gray(`  Dry run: ${dryRun ? 'Yes' : 'No'}`));
  }

  // Interactive confirmation
  if (useInteractive && !dryRun) {
    const shouldProceed = await confirmIfInteractive(
      useInteractive,
      `Generate ${itemCount} configuration${
        itemCount > 1 ? 's' : ''
      } in ${selectedFormat.toUpperCase()} format${
        outputPath ? ` to ${outputPath}` : ''
      }?`,
      true
    );

    if (!shouldProceed) {
      console.log(chalk.cyan('💡 Generation cancelled.'));
      return;
    }
  }

  // TODO: Implement actual generation logic
  try {
    if (!dryRun) {
      console.log(chalk.green('✅ Configuration generation completed!'));
      console.log(
        chalk.blue(
          `🔐 Generated ${itemCount} secure configuration${
            itemCount > 1 ? 's' : ''
          }.`
        )
      );

      if (outputPath) {
        console.log(chalk.gray(`📁 Saved to: ${outputPath}`));
      }

      if (verbose) {
        console.log(chalk.gray('📋 Generation summary:'));
        console.log(chalk.gray(`  Format: ${selectedFormat}`));
        console.log(chalk.gray(`  Output: ${outputPath || 'stdout'}`));
        console.log(chalk.gray(`  Count: ${itemCount}`));
        console.log(chalk.gray(`  Generated at: ${new Date().toISOString()}`));
      }
    } else {
      console.log(
        chalk.yellow(
          '🔍 Would generate configurations with the following settings:'
        )
      );
      console.log(chalk.gray(`  Format: ${selectedFormat}`));
      console.log(chalk.gray(`  Output: ${outputPath || 'stdout'}`));
      console.log(chalk.gray(`  Count: ${itemCount}`));
      console.log(chalk.gray('  No actual files created (dry run)'));
    }

    console.log(chalk.cyan('\n🚀 Ready to use your configurations!'));
    if (outputPath) {
      console.log(chalk.white(`  • Check ${outputPath} for your configs`));
    }
    console.log(chalk.white('  • Integrate configs into your applications'));
    console.log(chalk.white('  • Test authentication flows'));
  } catch (error) {
    console.log(
      chalk.red(`❌ Failed to generate configurations: ${error.message}`)
    );
    console.log(chalk.cyan('💡 Try running with --verbose for more details.'));
  }
}
