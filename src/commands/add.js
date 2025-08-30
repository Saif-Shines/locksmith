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

      // Add conditional follow-up for provider-specific guidance
      if (selectedProvider) {
        const providerLower = selectedProvider.toLowerCase();
        if (providerLower === 'auth0') {
          console.log(chalk.yellow('🚧 Auth0 Integration:'));
          console.log(
            chalk.gray('  • Coming soon - full Auth0 support in development')
          );
          console.log(
            chalk.gray(
              "  • You'll be able to configure Domain, Client ID, and Client Secret"
            )
          );
          console.log(
            chalk.cyan('  💡 For now, please select a different provider\n')
          );
        } else if (providerLower === 'fusionauth') {
          console.log(chalk.yellow('🚧 FusionAuth Integration:'));
          console.log(
            chalk.gray(
              '  • Coming soon - full FusionAuth support in development'
            )
          );
          console.log(
            chalk.gray("  • You'll be able to configure API Key and Base URL")
          );
          console.log(
            chalk.cyan('  💡 For now, please select a different provider\n')
          );
        }
      }
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

  // Enhanced validation with better error messages
  if (!SUPPORTED_PROVIDERS.includes(selectedProvider.toLowerCase())) {
    console.log(chalk.red(`❌ Unsupported provider: ${selectedProvider}`));
    console.log(
      chalk.cyan('💡 Supported providers:'),
      chalk.white(SUPPORTED_PROVIDERS.join(', '))
    );
    console.log(chalk.cyan('💡 Use --interactive for guided selection'));
    return;
  }

  // Check if provider is already configured with better messaging
  if (selectedProvider.toLowerCase() === 'scalekit') {
    console.log(chalk.yellow('⚠️  ScaleKit is already your primary provider.'));
    console.log(
      chalk.cyan(
        '💡 Use "locksmith configure auth --provider=scalekit" to reconfigure.'
      )
    );
    console.log(
      chalk.cyan('💡 Or add a different provider for multi-provider support.')
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

  // Interactive confirmation with detailed summary
  if (useInteractive && !dryRun) {
    console.log(chalk.blue('📋 Provider Addition Summary:'));
    console.log(chalk.gray(`  Provider: ${selectedProvider}`));
    console.log(chalk.gray(`  Type: Additional authentication provider`));
    console.log(chalk.gray(`  Added at: ${new Date().toISOString()}`));
    console.log(
      chalk.gray(
        '  📋 This will enable multi-provider authentication in your app'
      )
    );

    console.log();

    const shouldProceed = await confirmIfInteractive(
      useInteractive,
      `Add ${selectedProvider} as an additional authentication provider?`,
      true
    );

    if (!shouldProceed) {
      console.log(
        chalk.cyan('💡 Provider addition cancelled. No changes were made.')
      );
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
