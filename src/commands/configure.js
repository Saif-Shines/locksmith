import chalk from 'chalk';
import { saveCredentials, loadCredentials } from '../utils/config.js';

export async function handleConfigureCommand(options = {}) {
  const { subcommand, provider, dryRun, verbose, force, ...flags } = options;

  if (!subcommand) {
    console.log(chalk.red('❌ Please specify a subcommand.'));
    console.log(
      chalk.cyan('💡 Try: locksmith configure auth --provider=scalekit')
    );
    return;
  }

  switch (subcommand) {
    case 'auth':
      await handleConfigureAuth({ provider, dryRun, verbose, force, ...flags });
      break;
    default:
      console.log(chalk.red(`❌ Unknown configure subcommand: ${subcommand}`));
      console.log(chalk.cyan('💡 Available subcommands: auth'));
  }
}

async function handleConfigureAuth(options = {}) {
  const { provider, dryRun, verbose, force } = options;

  console.log(chalk.green('🔧 Configuring authentication settings...\n'));

  // Validate provider
  if (!provider) {
    console.log(chalk.red('❌ Provider is required.'));
    console.log(chalk.cyan('💡 Use --provider flag:'));
    console.log(chalk.white('  • --provider=scalekit'));
    console.log(chalk.white('  • --provider=auth0'));
    console.log(chalk.white('  • --provider=fusionauth'));
    return;
  }

  const supportedProviders = ['scalekit', 'auth0', 'fusionauth'];
  if (!supportedProviders.includes(provider.toLowerCase())) {
    console.log(chalk.red(`❌ Unsupported provider: ${provider}`));
    console.log(
      chalk.cyan('💡 Supported providers:'),
      chalk.white(supportedProviders.join(', '))
    );
    return;
  }

  if (dryRun) {
    console.log(chalk.yellow('🔍 Dry run mode - no changes will be made'));
  }

  if (verbose) {
    console.log(chalk.blue('📋 Configuration details:'));
    console.log(chalk.gray(`  Provider: ${provider}`));
    console.log(chalk.gray(`  Dry run: ${dryRun ? 'Yes' : 'No'}`));
    console.log(chalk.gray(`  Force: ${force ? 'Yes' : 'No'}`));
  }

  // Check if credentials exist
  const existingCredentials = loadCredentials();
  if (existingCredentials && !force) {
    console.log(chalk.yellow('⚠️  Existing credentials found.'));
    console.log(
      chalk.cyan('💡 Use --force to overwrite existing configuration.')
    );
    console.log(
      chalk.gray('Current provider:'),
      chalk.white(existingCredentials.provider || 'unknown')
    );
    return;
  }

  // Configure based on provider
  try {
    if (!dryRun) {
      const config = {
        provider: provider.toLowerCase(),
        configuredAt: new Date().toISOString(),
        ...options,
      };

      saveCredentials(config);
      console.log(chalk.green('✅ Authentication configured successfully!'));
      console.log(chalk.blue('🔐 Configuration saved securely.'));

      if (verbose) {
        console.log(chalk.gray('📋 Configuration summary:'));
        console.log(chalk.gray(`  Provider: ${provider}`));
        console.log(chalk.gray(`  Configured at: ${config.configuredAt}`));
      }
    } else {
      console.log(
        chalk.yellow(
          '🔍 Would configure authentication with the following settings:'
        )
      );
      console.log(chalk.gray(`  Provider: ${provider}`));
      console.log(chalk.gray('  No actual changes made (dry run)'));
    }

    console.log(chalk.cyan('\n🚀 Ready to generate configs! Try:'));
    console.log(chalk.white('  • locksmith generate'));
    console.log(chalk.white('  • locksmith generate --format=json'));
  } catch (error) {
    console.log(
      chalk.red(`❌ Failed to configure authentication: ${error.message}`)
    );
    console.log(chalk.cyan('💡 Try running with --verbose for more details.'));
  }
}
