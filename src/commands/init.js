import chalk from 'chalk';
import open from 'open';
import { saveCredentials, hasCredentials } from '../utils/core/config.js';
import {
  promptAuthProvider,
  promptEnvironmentId,
  promptRemainingCredentials,
  confirmAction,
} from '../utils/interactive/prompts.js';
import { shouldUseInteractive } from '../utils/interactive/interactive.js';
import { SCALEKIT_LOGIN_URL } from '../core/constants.js';

export async function handleInitCommand(options = {}) {
  const {
    provider,
    clientId,
    clientSecret,
    environmentUrl,
    interactive,
    noInteractive,
    ...otherFlags
  } = options;

  // Handle environmentId separately to avoid redeclaration
  let environmentId = options.environmentId;

  const useInteractive = shouldUseInteractive({ interactive, noInteractive });

  console.log(
    chalk.green(
      "🚀 Welcome to Locksmith! Let's secure your AI applications together...\n"
    )
  );

  // Check if credentials already exist
  if (hasCredentials()) {
    console.log(
      chalk.green(
        '✅ Excellent! Your Locksmith is already configured and ready to secure your apps.'
      )
    );
    console.log(
      chalk.blue(
        '🔐 Your credentials are safely stored in ~/.locksmith/credentials.json'
      )
    );
    console.log(
      chalk.cyan(
        '💡 Try running `locksmith generate` to create secure configs for your applications!'
      )
    );
    return;
  }

  // Handle non-interactive mode
  if (!useInteractive) {
    console.log(chalk.blue('🔧 Running in non-interactive mode...'));

    // Validate required parameters
    const missingParams = [];
    if (!provider) missingParams.push('--provider');
    if (!environmentId) missingParams.push('--environment-id');
    if (!clientId) missingParams.push('--client-id');
    if (!clientSecret) missingParams.push('--client-secret');
    if (!environmentUrl) missingParams.push('--environment-url');

    if (missingParams.length > 0) {
      console.log(
        chalk.red(`❌ Missing required parameters: ${missingParams.join(', ')}`)
      );
      console.log(
        chalk.cyan('💡 Required parameters for non-interactive setup:')
      );
      console.log(chalk.white('  • --provider=scalekit'));
      console.log(chalk.white('  • --environment-id=<your-env-id>'));
      console.log(chalk.white('  • --client-id=<your-client-id>'));
      console.log(chalk.white('  • --client-secret=<your-client-secret>'));
      console.log(chalk.white('  • --environment-url=<your-env-url>'));
      console.log(chalk.cyan('\n💡 Or use --interactive for guided setup.'));
      return;
    }

    if (provider.toLowerCase() !== 'scalekit') {
      console.log(
        chalk.red(`❌ Only ScaleKit is supported for non-interactive setup.`)
      );
      console.log(
        chalk.cyan(
          '💡 Use --provider=scalekit or --interactive for other providers.'
        )
      );
      return;
    }

    // Non-interactive setup
    console.log(chalk.cyan('📝 Setting up ScaleKit authentication...'));

    const credentials = {
      environmentId,
      clientId,
      clientSecret,
      environmentUrl,
    };

    try {
      saveCredentials(credentials);
      console.log(
        chalk.green('\n🎉 Fantastic! Your Locksmith is now fully configured!')
      );
      console.log(
        chalk.blue(
          '🔐 Your API credentials are safely stored in ~/.locksmith/credentials.json'
        )
      );
      console.log(
        chalk.cyan('\n🚀 Ready to secure your apps! Try these next steps:')
      );
      console.log(
        chalk.white('  • ') +
          chalk.green('locksmith generate') +
          chalk.gray(' - Create secure configs for your applications')
      );
      console.log(
        chalk.white('  • ') +
          chalk.green('locksmith add') +
          chalk.gray(' - Add more authentication providers (coming soon)')
      );
      console.log(
        chalk.white('  • ') +
          chalk.green('locksmith --help') +
          chalk.gray(' - See all available commands')
      );
    } catch (error) {
      console.log(
        chalk.red(
          `❌ Oops! We couldn't save your credentials: ${error.message}`
        )
      );
      console.log(
        chalk.cyan(
          '💡 Try checking file permissions or running with sudo if needed.'
        )
      );
    }
    return;
  }

  // Prompt for auth provider selection
  const selectedProvider = await promptAuthProvider();

  if (selectedProvider !== 'scalekit') {
    console.log(
      chalk.yellow(
        '\n⚠️  Heads up! Only ScaleKit is available for setup right now.'
      )
    );
    console.log(
      chalk.cyan(
        '💡 ScaleKit provides enterprise-grade authentication for AI applications.'
      )
    );
    console.log(
      chalk.green(
        'Please select ScaleKit from the list above to continue with setup.'
      )
    );
    return;
  }

  console.log(
    chalk.green("\n🚀 Let's get you set up with ScaleKit authentication!\n")
  );

  // Open signup URL
  console.log(
    chalk.cyan('🌐 Opening your browser to create your ScaleKit account...')
  );
  try {
    await open(SCALEKIT_LOGIN_URL);
    console.log(chalk.green('✅ Perfect! Your browser opened successfully.'));
    console.log(
      chalk.cyan(
        '📝 Complete the signup process, then return here to continue setup.'
      )
    );
  } catch (error) {
    console.log(chalk.red("❌ We couldn't open your browser automatically."));
    console.log(chalk.cyan('🌐 Please visit this URL manually to sign up:'));
    console.log(chalk.blue.bold(SCALEKIT_LOGIN_URL));
  }

  console.log(
    chalk.cyan(
      "\n📝 Great! Now let's connect your ScaleKit account. You'll need your API credentials from the dashboard.\n"
    )
  );

  // First, prompt for Environment ID
  environmentId = await promptEnvironmentId();

  if (!environmentId) {
    console.log(chalk.red('❌ We need your Environment ID to continue.'));
    console.log(
      chalk.cyan(
        '💡 You can find this in your ScaleKit dashboard under Settings > API Credentials.'
      )
    );
    console.log(
      chalk.green(
        'Please try running `locksmith init` again with your Environment ID.'
      )
    );
    return;
  }

  // Open settings URL with environment ID
  const settingsUrl = `https://app.scalekit.cloud/ws/environments/${environmentId}/settings/api-credentials`;
  console.log(
    chalk.cyan(
      '🌐 Opening your ScaleKit dashboard to access API credentials...'
    )
  );
  try {
    await open(settingsUrl);
    console.log(chalk.green('✅ Perfect! Your dashboard opened successfully.'));
    console.log(
      chalk.cyan(
        '📋 Copy your Client ID, Client Secret, and Environment URL from the API Credentials page.'
      )
    );
    console.log(
      chalk.gray(
        '💡 Tip: If the page opens in a new tab, you can copy the URL to your existing tab.'
      )
    );
  } catch (error) {
    console.log(chalk.red("❌ We couldn't open your dashboard automatically."));
    console.log(
      chalk.cyan(
        '🌐 Please visit this URL manually to get your API credentials:'
      )
    );
    console.log(chalk.blue.bold(settingsUrl));
  }

  // Prompt for remaining credentials
  const remainingCredentials = await promptRemainingCredentials();

  // Combine all credentials
  const credentials = {
    environmentId,
    ...remainingCredentials,
  };

  // Validate that all fields are provided
  const missing = Object.entries(credentials)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.log(
      chalk.red(
        `❌ We're missing a few required credentials: ${missing.join(', ')}`
      )
    );
    console.log(
      chalk.cyan(
        '💡 Make sure to copy all three values from your ScaleKit API Credentials page.'
      )
    );
    console.log(
      chalk.green(
        'Please try running `locksmith init` again with complete credentials.'
      )
    );
    return;
  }

  // Save credentials
  try {
    saveCredentials(credentials);
    console.log(
      chalk.green('\n🎉 Fantastic! Your Locksmith is now fully configured!')
    );
    console.log(
      chalk.blue(
        '🔐 Your API credentials are safely stored in ~/.locksmith/credentials.json'
      )
    );
    console.log(
      chalk.cyan('\n🚀 Ready to secure your apps! Try these next steps:')
    );
    console.log(
      chalk.white('  • ') +
        chalk.green('locksmith generate') +
        chalk.gray(' - Create secure configs for your applications')
    );
    console.log(
      chalk.white('  • ') +
        chalk.green('locksmith add') +
        chalk.gray(' - Add more authentication providers (coming soon)')
    );
    console.log(
      chalk.white('  • ') +
        chalk.green('locksmith --help') +
        chalk.gray(' - See all available commands')
    );
  } catch (error) {
    console.log(
      chalk.red(`❌ Oops! We couldn't save your credentials: ${error.message}`)
    );
    console.log(
      chalk.cyan(
        '💡 Try checking file permissions or running with sudo if needed.'
      )
    );
  }
}
