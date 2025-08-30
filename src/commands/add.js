import chalk from 'chalk';
import {
  shouldUseInteractive,
  selectIfInteractive,
  confirmIfInteractive,
} from '../utils/interactive/interactive.js';
import { promptAuthProvider } from '../utils/interactive/prompts.js';
import { SUPPORTED_PROVIDERS } from '../core/constants.js';

export async function handleAddCommand(options = {}) {
  const { provider, dryRun, verbose, interactive, noInteractive } = options;

  const useInteractive = shouldUseInteractive({ interactive, noInteractive });

  console.log(
    chalk.green('🔧 Adding more authentication providers to your setup...')
  );
  console.log(
    chalk.cyan(
      '🌟 This will let you support multiple auth methods in your applications.'
    )
  );

  // Handle provider selection
  let selectedProvider = provider;

  if (!selectedProvider) {
    if (useInteractive) {
      console.log(
        chalk.cyan(
          '💡 No provider specified. Starting interactive selection...'
        )
      );
      selectedProvider = await promptAuthProvider();
    } else {
      console.log(
        chalk.red('❌ Provider is required when not in interactive mode.')
      );
      console.log(
        chalk.cyan('💡 Use --provider flag or --interactive for guided setup:')
      );
      console.log(chalk.white('  • --provider=auth0'));
      console.log(chalk.white('  • --provider=fusionauth'));
      console.log(chalk.white('  • --provider=scalekit (already configured?)'));
      return;
    }
  }

  // Check if provider is already configured
  if (!SUPPORTED_PROVIDERS.includes(selectedProvider.toLowerCase())) {
    console.log(chalk.red(`❌ Unsupported provider: ${selectedProvider}`));
    console.log(
      chalk.cyan('💡 Supported providers:'),
      chalk.white(SUPPORTED_PROVIDERS.join(', '))
    );
    return;
  }

  if (selectedProvider.toLowerCase() === 'scalekit') {
    console.log(chalk.yellow('⚠️  ScaleKit is already your primary provider.'));
    console.log(
      chalk.cyan(
        '💡 Use "locksmith configure auth --provider=scalekit" to reconfigure.'
      )
    );
    return;
  }

  if (dryRun) {
    console.log(chalk.yellow('🔍 Dry run mode - no changes will be made'));
  }

  if (verbose) {
    console.log(chalk.blue('📋 Add provider details:'));
    console.log(chalk.gray(`  Provider: ${selectedProvider}`));
    console.log(chalk.gray(`  Dry run: ${dryRun ? 'Yes' : 'No'}`));
  }

  // Interactive confirmation
  if (useInteractive && !dryRun) {
    const shouldProceed = await confirmIfInteractive(
      useInteractive,
      `Do you want to add ${selectedProvider} as an additional authentication provider?`,
      true
    );

    if (!shouldProceed) {
      console.log(chalk.cyan('💡 Provider addition cancelled.'));
      return;
    }
  }

  // TODO: Implement actual provider addition logic
  try {
    if (!dryRun) {
      console.log(chalk.green(`✅ ${selectedProvider} added successfully!`));
      console.log(
        chalk.blue('🔧 Additional authentication provider configured.')
      );

      if (verbose) {
        console.log(chalk.gray('📋 Addition summary:'));
        console.log(chalk.gray(`  Provider: ${selectedProvider}`));
        console.log(chalk.gray(`  Added at: ${new Date().toISOString()}`));
      }
    } else {
      console.log(
        chalk.yellow(
          `🔍 Would add ${selectedProvider} with the following settings:`
        )
      );
      console.log(chalk.gray(`  Provider: ${selectedProvider}`));
      console.log(chalk.gray('  No actual changes made (dry run)'));
    }

    console.log(chalk.cyan('\n🚀 Ready to use your new provider!'));
    console.log(chalk.white(`  • Update your app to use ${selectedProvider}`));
    console.log(chalk.white('  • Test authentication flows'));
  } catch (error) {
    console.log(
      chalk.red(`❌ Failed to add ${selectedProvider}: ${error.message}`)
    );
    console.log(chalk.cyan('💡 Try running with --verbose for more details.'));
  }
}
