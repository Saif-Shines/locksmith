import chalk from 'chalk';
import open from 'open';
import { startSpinner } from '../utils/display/spinner.js';
import { runTasks } from '../utils/display/task-list.js';
import { saveCredentials, hasCredentials } from '../utils/core/config.js';
import {
  ErrorScenarios,
  withErrorHandling,
} from '../utils/core/error-handler.js';
import {
  promptAuthProvider,
  promptEnvironmentId,
  promptRemainingCredentials,
  confirmAction,
} from '../utils/interactive/prompts.js';
import { shouldUseInteractive } from '../utils/interactive/interactive.js';
import { SCALEKIT_LOGIN_URL } from '../core/constants.js';

/**
 * Checks if credentials already exist and handles early return
 */
function checkExistingCredentials() {
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
    return true;
  }
  return false;
}

/**
 * Validates parameters for non-interactive setup
 */
function validateNonInteractiveParams(options) {
  const { provider, environmentId, clientId, clientSecret, environmentUrl } =
    options;

  const missingParams = [];
  if (!provider) missingParams.push('--provider');
  if (!environmentId) missingParams.push('--environment-id');
  if (!clientId) missingParams.push('--client-id');
  if (!clientSecret) missingParams.push('--client-secret');
  if (!environmentUrl) missingParams.push('--environment-url');

  if (missingParams.length > 0) {
    throw ErrorScenarios.MISSING_REQUIRED_FLAGS('init', missingParams);
  }

  if (provider.toLowerCase() !== 'scalekit') {
    throw ErrorScenarios.INVALID_PROVIDER(provider);
  }

  return {
    isValid: true,
    credentials: { environmentId, clientId, clientSecret, environmentUrl },
  };
}

/**
 * Handles non-interactive setup
 */
async function handleNonInteractiveSetup(credentials) {
  console.log(chalk.cyan('📝 Setting up ScaleKit authentication...'));

  console.log(chalk.blue('📋 Configuration Summary:'));
  console.log(chalk.gray(`  Provider: ScaleKit`));
  console.log(chalk.gray(`  Environment ID: ${credentials.environmentId}`));
  console.log(chalk.gray(`  Client ID: ${credentials.clientId}`));
  console.log(chalk.gray(`  Configured at: ${new Date().toISOString()}`));
  console.log(chalk.gray('  🔐 Credentials will be saved securely'));

  console.log();

  try {
    saveCredentials(credentials);
    displaySuccessMessage();
  } catch (error) {
    throw ErrorScenarios.PERMISSION_DENIED('~/.locksmith/credentials.json');
  }
}

/**
 * Handles interactive provider selection and guidance
 */
export async function handleProviderSelection() {
  const selectedProvider = await promptAuthProvider();

  if (!selectedProvider) {
    return null;
  }

  const providerLower = selectedProvider.toLowerCase();

  if (providerLower === 'scalekit') {
    displayScaleKitGuidance();
  } else if (providerLower === 'auth0') {
    displayAuth0Guidance();
    return null;
  } else if (providerLower === 'fusionauth') {
    displayFusionAuthGuidance();
    return null;
  }

  if (selectedProvider !== 'scalekit') {
    console.log(
      chalk.yellow('\n⚠️  Only ScaleKit is available for setup right now.')
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
    return null;
  }

  return selectedProvider;
}

/**
 * Displays ScaleKit guidance
 */
function displayScaleKitGuidance() {
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
}

/**
 * Displays Auth0 guidance
 */
function displayAuth0Guidance() {
  console.log(chalk.yellow('🚧 Auth0 Integration:'));
  console.log(chalk.gray('  • Full Auth0 support is coming soon'));
  console.log(
    chalk.gray(
      "  • You'll be able to configure Domain, Client ID, and Client Secret"
    )
  );
  console.log(chalk.cyan('  💡 For now, please select ScaleKit to continue\n'));
}

/**
 * Displays FusionAuth guidance
 */
function displayFusionAuthGuidance() {
  console.log(chalk.yellow('🚧 FusionAuth Integration:'));
  console.log(chalk.gray('  • Full FusionAuth support is coming soon'));
  console.log(
    chalk.gray("  • You'll be able to configure API Key and Base URL")
  );
  console.log(chalk.cyan('  💡 For now, please select ScaleKit to continue\n'));
}

/**
 * Opens browser for ScaleKit signup
 */
export async function openScaleKitSignup() {
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
}

/**
 * Collects environment ID from user
 */
export async function collectEnvironmentId() {
  const environmentId = await promptEnvironmentId();

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
    return null;
  }

  return environmentId;
}

/**
 * Opens browser for API credentials
 */
export async function openApiCredentialsPage(environmentId) {
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
}

/**
 * Collects and validates remaining credentials
 */
export async function collectAndValidateCredentials(environmentId) {
  const remainingCredentials = await promptRemainingCredentials();

  const credentials = {
    environmentId,
    ...remainingCredentials,
  };

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
    return null;
  }

  return credentials;
}

/**
 * Confirms and saves credentials
 */
export async function saveCredentialsWithoutConfirmation(credentials) {
  try {
    saveCredentials(credentials);
    return true;
  } catch (error) {
    console.log(
      chalk.red(
        `❌ Failed to save authentication credentials: ${error.message}`
      )
    );
    console.log(chalk.cyan('💡 Try running with --verbose for more details.'));
    return false;
  }
}

// Legacy function - kept for backward compatibility but now just saves without confirmation
export async function confirmAndSaveCredentials(credentials) {
  return await saveCredentialsWithoutConfirmation(credentials);
}

/**
 * Displays success message
 */
function displaySuccessMessage() {
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
}

export async function handleInitCommand(options = {}) {
  const {
    provider,
    clientId,
    clientSecret,
    environmentUrl,
    interactive,
    noInteractive,
  } = options;

  const environmentId = options.environmentId;
  const useInteractive = shouldUseInteractive({ interactive, noInteractive });

  console.log(
    chalk.green(
      "🚀 Welcome to Locksmith! Let's secure your AI applications together...\n"
    )
  );

  // 1. Check if credentials already exist
  if (checkExistingCredentials()) {
    return;
  }

  // 2. Handle non-interactive setup (keep existing logic for now)
  if (!useInteractive) {
    console.log(chalk.blue('🔧 Running in non-interactive mode...'));

    const validation = validateNonInteractiveParams({
      provider,
      environmentId,
      clientId,
      clientSecret,
      environmentUrl,
    });

    if (!validation.isValid) {
      return;
    }

    await handleNonInteractiveSetup(validation.credentials);
    return;
  }

  // 3. Handle interactive provider selection outside of task list
  const selectedProvider = await handleProviderSelection();
  if (!selectedProvider) {
    console.log(chalk.yellow('⚠️ Provider selection cancelled'));
    return;
  }

  // 4. Handle signup page opening outside of task list
  await openScaleKitSignup();

  // 5. Handle environment ID collection outside of task list
  const collectedEnvironmentId = await collectEnvironmentId();
  if (!collectedEnvironmentId) {
    console.log(chalk.yellow('⚠️ Environment ID collection cancelled'));
    return;
  }

  // 6. Handle API credentials page opening outside of task list
  await openApiCredentialsPage(collectedEnvironmentId);

  // 7. Handle credential collection outside of task list
  const credentials = await collectAndValidateCredentials(
    collectedEnvironmentId
  );
  if (!credentials) {
    console.log(chalk.yellow('⚠️ Credential collection cancelled or failed'));
    return;
  }

  // 8. Handle confirmation outside of task list
  console.log(chalk.blue('📋 Setup Summary:'));
  console.log(chalk.gray(`  Provider: ScaleKit`));
  console.log(chalk.gray(`  Environment ID: ${credentials.environmentId}`));
  console.log(chalk.gray(`  Client ID: ${credentials.clientId}`));
  console.log(chalk.gray(`  Configured at: ${new Date().toISOString()}`));
  console.log(
    chalk.gray(
      '  🔐 Credentials will be saved securely to ~/.locksmith/credentials.json'
    )
  );
  console.log();

  const { confirmAction } = await import('../utils/interactive/prompts.js');
  const shouldSave = await confirmAction(
    'Save these authentication credentials?'
  );

  if (!shouldSave) {
    console.log(chalk.cyan('💡 Setup cancelled. No credentials were saved.'));
    console.log(
      chalk.cyan("💡 You can run `locksmith init` again whenever you're ready.")
    );
    return;
  }

  // 9. Use task list for the final processing step (no interactive prompts)
  try {
    const { Listr } = await import('listr2');
    const processingTasks = new Listr(
      [
        {
          title: '💾 Saving authentication configuration',
          task: async (ctx) => {
            // Save credentials without confirmation (already confirmed above)
            try {
              saveCredentials(credentials);
              return true;
            } catch (error) {
              throw new Error(`Failed to save credentials: ${error.message}`);
            }
          },
        },
      ],
      {
        concurrent: false,
        exitOnError: true,
        rendererOptions: {
          collapse: false,
          showTimer: true,
          removeEmptyLines: false,
        },
      }
    );

    const { runTasks } = await import('../utils/display/task-list.js');
    await runTasks(processingTasks, {
      successMessage: 'Authentication setup complete!',
      failMessage: 'Setup failed. You can try again with: locksmith init',
    });

    displaySuccessMessage();
  } catch (error) {
    // Error already handled by runTasks
    process.exit(1);
  }
}
