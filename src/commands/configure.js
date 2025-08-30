import chalk from 'chalk';
import open from 'open';
import {
  saveCredentials,
  loadCredentials,
  saveToolDetection,
  savePreferredBroker,
  saveAuthModules,
  loadAuthModules,
} from '../utils/core/config.js';
import { detectTools } from '../utils/core/detection.js';
import {
  shouldUseInteractive,
  selectIfInteractive,
  confirmIfInteractive,
  promptIfInteractive,
} from '../utils/interactive/interactive.js';
import { promptAuthProvider } from '../utils/interactive/prompts.js';
import {
  SUPPORTED_PROVIDERS,
  AVAILABLE_BROKERS,
  DEFAULT_BROKER,
} from '../core/constants.js';

// Constants
const CONFIG_FILE_PATH = '~/.locksmith/llm-brokers.json';

/**
 * Validates provider selection and returns selected provider
 */
async function validateAuthProvider(options) {
  const { provider, useInteractive } = options;

  if (provider) {
    if (!SUPPORTED_PROVIDERS.includes(provider.toLowerCase())) {
      console.log(chalk.red(`❌ Unsupported provider: ${provider}`));
      console.log(
        chalk.cyan('💡 Supported providers:'),
        chalk.white(SUPPORTED_PROVIDERS.join(', '))
      );
      console.log(chalk.cyan('💡 Use --interactive for guided selection'));
      return { selectedProvider: null, shouldContinue: false };
    }
    return { selectedProvider: provider.toLowerCase(), shouldContinue: true };
  }

  if (!useInteractive) {
    displayProviderHelp();
    return { selectedProvider: null, shouldContinue: false };
  }

  const selectedProvider = await promptAuthProvider();
  if (selectedProvider) {
    displayProviderGuidance(selectedProvider);
  }

  return {
    selectedProvider: selectedProvider?.toLowerCase(),
    shouldContinue: !!selectedProvider,
  };
}

/**
 * Displays help for provider selection
 */
function displayProviderHelp() {
  console.log(
    chalk.red('❌ Provider is required when not in interactive mode.')
  );
  console.log(
    chalk.cyan('💡 Use --provider flag or --interactive for guided setup:')
  );
  console.log(chalk.white('  • --provider=scalekit'));
  console.log(chalk.white('  • --provider=auth0'));
  console.log(chalk.white('  • --provider=fusionauth'));
}

/**
 * Displays guidance for selected provider
 */
function displayProviderGuidance(provider) {
  const providerLower = provider.toLowerCase();

  if (providerLower === 'scalekit') {
    console.log(chalk.blue('📋 ScaleKit Configuration:'));
    console.log(
      chalk.gray(
        "  • You'll need your Environment ID, Client ID, Client Secret, and Environment URL"
      )
    );
    console.log(
      chalk.gray(
        '  • Find these in your ScaleKit dashboard under API Credentials'
      )
    );
    console.log(
      chalk.cyan(
        '  💡 Tip: Keep your ScaleKit dashboard open for easy reference\n'
      )
    );
  } else if (providerLower === 'auth0' || providerLower === 'fusionauth') {
    console.log(chalk.yellow('🚧 Coming Soon:'));
    console.log(
      chalk.gray(`  • ${provider} integration is currently in development`)
    );
    console.log(
      chalk.gray("  • We're working hard to bring you full support soon!")
    );
    console.log(
      chalk.cyan('  💡 For now, please select ScaleKit to continue\n')
    );
  }
}

/**
 * Handles existing credentials logic
 */
async function handleExistingCredentials(options) {
  const { selectedProvider, useInteractive, force, dryRun } = options;

  const existingCredentials = loadCredentials();
  if (!existingCredentials || force) {
    return { shouldContinue: true, existingCredentials };
  }

  console.log(chalk.yellow('⚠️  Existing credentials found.'));
  console.log(
    chalk.gray('Current provider:'),
    chalk.white(existingCredentials.provider || 'unknown')
  );

  if (!useInteractive) {
    console.log(
      chalk.cyan(
        '💡 Use --force to overwrite existing configuration or --interactive for guided setup.'
      )
    );
    return { shouldContinue: false };
  }

  console.log(chalk.blue('📋 Configuration comparison:'));
  console.log(
    chalk.gray(`  Current: ${existingCredentials.provider || 'unknown'}`)
  );
  console.log(chalk.gray(`  New: ${selectedProvider}`));

  const shouldOverwrite = await confirmIfInteractive(
    useInteractive,
    'Do you want to overwrite the existing configuration?',
    false
  );

  if (!shouldOverwrite) {
    console.log(
      chalk.cyan('💡 Configuration cancelled. Use --force to skip this prompt.')
    );
    return { shouldContinue: false };
  }

  return { shouldContinue: true, existingCredentials };
}

/**
 * Handles provider-specific configuration
 */
function configureProviderSettings(selectedProvider, existingCredentials) {
  const hasValidCredentials =
    existingCredentials &&
    existingCredentials.environmentId &&
    existingCredentials.clientId &&
    existingCredentials.clientSecret;

  if (hasValidCredentials) {
    return {
      ...existingCredentials,
      provider: selectedProvider,
      configuredAt: new Date().toISOString(),
    };
  }

  console.log(chalk.yellow('⚠️  No valid authentication credentials found.'));
  console.log(
    chalk.cyan("💡 Provider configuration saved, but you'll need to run ") +
      chalk.white.bold('locksmith init') +
      chalk.cyan(' to set up authentication credentials.')
  );

  return {
    provider: selectedProvider,
    configuredAt: new Date().toISOString(),
  };
}

/**
 * Handles user confirmation for auth configuration
 */
async function confirmAuthConfiguration(config, hasValidCredentials, options) {
  const { useInteractive, force, selectedProvider, dryRun } = options;

  if (!useInteractive || force) {
    return true;
  }

  console.log(chalk.blue('📋 Configuration Summary:'));
  console.log(chalk.gray(`  Provider: ${selectedProvider}`));
  console.log(chalk.gray(`  Dry run: ${dryRun ? 'Yes' : 'No'}`));
  console.log(chalk.gray(`  Configured at: ${config.configuredAt}`));

  if (hasValidCredentials && config.environmentId) {
    console.log(chalk.gray(`  Environment: ${config.environmentId}`));
  }

  if (!hasValidCredentials) {
    console.log(
      chalk.yellow('  ⚠️  No authentication credentials configured yet')
    );
  }

  const confirmMessage = hasValidCredentials
    ? 'Save this authentication configuration?'
    : "Save provider configuration? (You'll need to run init for full setup)";

  const confirmSave = await confirmIfInteractive(
    useInteractive,
    confirmMessage,
    true
  );

  if (!confirmSave) {
    console.log(
      chalk.cyan('💡 Configuration cancelled. No changes were made.')
    );
    return false;
  }

  return true;
}

/**
 * Saves authentication configuration
 */
function saveAuthConfiguration(config, selectedProvider, dryRun, verbose) {
  if (dryRun) {
    console.log(
      chalk.yellow(
        '🔍 Would configure authentication with the following settings:'
      )
    );
    console.log(chalk.gray(`  Provider: ${selectedProvider}`));
    console.log(chalk.gray('  No actual changes made (dry run)'));
    return;
  }

  saveCredentials(config);
  console.log(chalk.green('✅ Authentication configured successfully!'));
  console.log(chalk.blue('🔐 Configuration saved securely.'));

  if (verbose) {
    console.log(chalk.gray('📋 Configuration summary:'));
    console.log(chalk.gray(`  Provider: ${selectedProvider}`));
    console.log(chalk.gray(`  Configured at: ${config.configuredAt}`));
  }

  console.log(chalk.cyan('\n🚀 Ready to generate configs! Try:'));
  console.log(chalk.white('  • locksmith generate'));
}

/**
 * Detects available AI tools
 */
function detectAvailableTools(verbose) {
  if (verbose) {
    console.log(chalk.blue('📋 Detecting installed AI tools...'));
  }

  const detectedTools = detectTools();

  if (verbose) {
    console.log(chalk.blue('📋 Detection results:'));
    Object.entries(detectedTools).forEach(([tool, available]) => {
      const status = available
        ? chalk.green('✅ Available')
        : chalk.red('❌ Not found');
      console.log(chalk.gray(`  ${tool}: ${status}`));
    });
  }

  return detectedTools;
}

/**
 * Validates broker selection
 */
async function validateBrokerSelection(options) {
  const { broker, useInteractive, detectedTools } = options;

  if (broker) {
    if (!AVAILABLE_BROKERS.includes(broker.toLowerCase())) {
      console.log(chalk.red(`❌ Unsupported broker: ${broker}`));
      console.log(
        chalk.cyan('💡 Supported brokers:'),
        chalk.white(AVAILABLE_BROKERS.join(', '))
      );
      console.log(chalk.cyan('💡 Use --interactive for guided selection'));
      return { selectedBroker: null, shouldContinue: false };
    }
    return { selectedBroker: broker.toLowerCase(), shouldContinue: true };
  }

  if (!useInteractive) {
    displayBrokerHelp();
    return { selectedBroker: null, shouldContinue: false };
  }

  const selectedBroker = await selectLLMBrokerInteractive(detectedTools);
  return { selectedBroker, shouldContinue: !!selectedBroker };
}

/**
 * Displays help for broker selection
 */
function displayBrokerHelp() {
  console.log(chalk.red('❌ Broker is required when not in interactive mode.'));
  console.log(
    chalk.cyan('💡 Use --broker flag or --interactive for guided setup:')
  );
  console.log(chalk.white('  • --broker=gemini'));
  console.log(chalk.white('  • --broker=claude'));
  console.log(chalk.white('  • --broker=cursor-agent'));
}

/**
 * Handles interactive LLM broker selection
 */
async function selectLLMBrokerInteractive(detectedTools) {
  console.log(
    chalk.cyan('💡 No broker specified. Starting interactive selection...')
  );

  const brokerChoices = AVAILABLE_BROKERS.map((brokerName) => {
    const toolName = brokerName.replace('-agent', '');
    const available = detectedTools[toolName] || false;
    const isDefault = brokerName === DEFAULT_BROKER;

    let statusEmoji, statusText, description;
    if (available) {
      statusEmoji = '✅';
      statusText = chalk.green('Available');
      description = `Ready to use ${brokerName}`;
    } else {
      statusEmoji = '⚠️';
      statusText = chalk.yellow('Not detected');
      description = `Will attempt to use ${brokerName} if available`;
    }

    const defaultIndicator = isDefault ? chalk.blue('(recommended)') : '';
    const displayName = `${brokerName} ${statusEmoji} ${defaultIndicator}`;

    return {
      name: displayName,
      value: brokerName,
      short: brokerName,
      description: description,
    };
  });

  const selectedBroker = await selectIfInteractive(
    true,
    'Select your preferred LLM broker:',
    brokerChoices,
    DEFAULT_BROKER
  );

  if (selectedBroker) {
    await handleUndetectedToolWarning(selectedBroker, detectedTools);
  }

  return selectedBroker;
}

/**
 * Handles warning for undetected tools
 */
async function handleUndetectedToolWarning(selectedBroker, detectedTools) {
  const toolName = selectedBroker.replace('-agent', '');
  const isToolAvailable = detectedTools[toolName];

  if (!isToolAvailable) {
    const shouldContinue = await confirmIfInteractive(
      true,
      `The ${selectedBroker} tool was not detected on your system. Continue anyway?`,
      true
    );

    if (!shouldContinue) {
      console.log(
        chalk.cyan(
          '💡 Selection cancelled. Please ensure the tool is installed or choose a different broker.'
        )
      );
      return null;
    }
  }

  return selectedBroker;
}

/**
 * Handles user confirmation for broker configuration
 */
async function confirmBrokerConfiguration(
  selectedBroker,
  detectedTools,
  options
) {
  const { useInteractive, force, dryRun } = options;

  if (!useInteractive || force) {
    return true;
  }

  console.log(chalk.blue('📋 LLM Broker Configuration Summary:'));
  console.log(chalk.gray(`  Preferred broker: ${selectedBroker}`));
  const availableTools = Object.entries(detectedTools)
    .filter(([, available]) => available)
    .map(([tool]) => tool);
  console.log(
    chalk.gray(
      `  Available tools: ${availableTools.join(', ') || 'none detected'}`
    )
  );
  console.log(chalk.gray(`  Configured at: ${new Date().toISOString()}`));

  const confirmSave = await confirmIfInteractive(
    useInteractive,
    'Save this LLM broker configuration?',
    true
  );

  if (!confirmSave) {
    console.log(
      chalk.cyan('💡 Configuration cancelled. No changes were made.')
    );
    return false;
  }

  return true;
}

/**
 * Saves LLM broker configuration
 */
function saveBrokerConfiguration(
  selectedBroker,
  detectedTools,
  dryRun,
  verbose
) {
  if (dryRun) {
    console.log(
      chalk.yellow('🔍 Would configure LLM broker with the following settings:')
    );
    console.log(chalk.gray(`  Preferred broker: ${selectedBroker}`));
    const availableTools = Object.entries(detectedTools)
      .filter(([, available]) => available)
      .map(([tool]) => tool);
    console.log(
      chalk.gray(`  Available tools: ${availableTools.join(', ') || 'none'}`)
    );
    console.log(chalk.gray('  No actual changes made (dry run)'));
    return;
  }

  saveToolDetection(detectedTools);
  savePreferredBroker(selectedBroker);

  const availableTools = Object.entries(detectedTools)
    .filter(([, available]) => available)
    .map(([tool]) => tool);

  console.log(chalk.green('✅ LLM broker configured successfully!'));
  console.log(chalk.blue('🤖 Preferred broker:'), chalk.white(selectedBroker));

  if (availableTools.length > 0) {
    console.log(
      chalk.blue('🔧 Available tools:'),
      chalk.white(availableTools.join(', '))
    );
  } else {
    console.log(chalk.yellow('⚠️  No AI tools detected on your system.'));
    console.log(
      chalk.cyan('💡 Consider installing Claude Code, Gemini CLI, or Cursor.')
    );
  }

  if (verbose) {
    console.log(chalk.gray('📋 Configuration summary:'));
    console.log(chalk.gray(`  Preferred broker: ${selectedBroker}`));
    console.log(
      chalk.gray(`  Available tools: ${availableTools.join(', ') || 'none'}`)
    );
    console.log(chalk.gray(`  Configured at: ${new Date().toISOString()}`));
  }

  console.log(chalk.gray(`📁 Configuration saved to ${CONFIG_FILE_PATH}`));

  console.log(chalk.cyan('\n🚀 Ready to use your LLM broker!'));
  console.log(
    chalk.white(`  • Your preferred broker is set to: ${selectedBroker}`)
  );
  console.log(chalk.white('  • Future commands will use this preference'));
}

/**
 * Validates redirect configuration prerequisites
 */
function validateRedirectPrerequisites() {
  const credentials = loadCredentials();
  if (!credentials) {
    console.log(chalk.red('❌ No authentication credentials found.'));
    console.log(
      chalk.cyan('💡 Please run ') +
        chalk.white.bold('locksmith init') +
        chalk.cyan(' first to set up your authentication provider.')
    );
    return { shouldContinue: false };
  }

  const provider = credentials.provider || 'scalekit';
  if (provider.toLowerCase() !== 'scalekit') {
    console.log(
      chalk.red(
        `❌ Redirect configuration is currently only supported for ScaleKit.`
      )
    );
    console.log(chalk.cyan(`💡 Your current provider: ${provider}`));
    console.log(
      chalk.cyan('💡 Support for other providers will be added soon.')
    );
    return { shouldContinue: false };
  }

  const environmentId = credentials.environmentId;
  if (!environmentId) {
    console.log(chalk.red('❌ Environment ID not found in credentials.'));
    console.log(
      chalk.cyan('💡 Please run ') +
        chalk.white.bold('locksmith init') +
        chalk.cyan(' again to reconfigure your credentials.')
    );
    return { shouldContinue: false };
  }

  return { shouldContinue: true, credentials, provider, environmentId };
}

/**
 * Opens redirect configuration in browser
 */
async function openRedirectConfiguration(environmentId, verbose) {
  const redirectsUrl = `https://app.scalekit.cloud/ws/environments/${environmentId}/authentication/redirects`;

  if (verbose) {
    console.log(chalk.blue('📋 Opening URL:'), chalk.gray(redirectsUrl));
  }

  console.log(
    chalk.cyan('🌐 Opening your browser to configure redirect URLs...')
  );

  try {
    await open(redirectsUrl);
    console.log(chalk.green('✅ Browser opened successfully!'));
    console.log(
      chalk.blue(
        '🔗 Please configure your redirect URLs in the ScaleKit dashboard.'
      )
    );
    return true;
  } catch (error) {
    console.log(chalk.red(`❌ Failed to open browser: ${error.message}`));
    console.log(chalk.cyan('💡 You can manually visit:'));
    console.log(chalk.blue.bold(redirectsUrl));
    console.log(chalk.cyan('💡 Or use --verbose flag to see the URL.'));
    return false;
  }
}

/**
 * Displays redirect configuration instructions
 */
function displayRedirectInstructions() {
  console.log(chalk.cyan('💡 Common redirect URLs to add:'));
  console.log(
    chalk.white('  • http://localhost:3000/auth/callback (development)')
  );
  console.log(
    chalk.white('  • https://yourapp.com/auth/callback (production)')
  );
}

/**
 * Handles user confirmation for redirect configuration
 */
async function confirmRedirectConfiguration(
  useInteractive,
  provider,
  environmentId
) {
  if (!useInteractive) {
    return true;
  }

  console.log(chalk.blue('📋 Redirect Configuration:'));
  console.log(chalk.gray(`  Provider: ${provider}`));
  console.log(chalk.gray(`  Environment: ${environmentId}`));
  console.log(
    chalk.gray('  🔗 This will open your browser to configure redirect URLs')
  );
  console.log(
    chalk.gray('  📋 Redirect URLs are required for authentication modules')
  );
  console.log();

  const shouldContinue = await confirmIfInteractive(
    useInteractive,
    'Open browser to configure redirect URLs?',
    true
  );

  if (!shouldContinue) {
    console.log(chalk.cyan('💡 Redirect configuration cancelled.'));
    console.log(
      chalk.cyan(
        '💡 You can configure redirects later in your ScaleKit dashboard.'
      )
    );
    return false;
  }

  return true;
}

/**
 * Prompts user for callback URI
 */
async function promptForCallbackUri() {
  const callbackUri = await promptIfInteractive(
    true,
    'Enter the callback URI you configured in ScaleKit (e.g., http://localhost:3000/auth/callback):',
    ''
  );

  if (!callbackUri || callbackUri.trim() === '') {
    console.log(
      chalk.yellow('⚠️  No callback URI provided. You can configure it later.')
    );
    return null;
  }

  const urlPattern = /^https?:\/\/.+$/;
  if (!urlPattern.test(callbackUri.trim())) {
    console.log(
      chalk.yellow(
        '⚠️  Invalid URL format. Please provide a valid callback URI.'
      )
    );
    return null;
  }

  console.log(chalk.green('✅ Callback URI configured successfully!'));
  console.log(chalk.gray(`  URI: ${callbackUri.trim()}`));

  return callbackUri.trim();
}

/**
 * Handles post-redirect configuration flow
 */
async function handlePostRedirectFlow(useInteractive) {
  if (!useInteractive) {
    return;
  }

  displayRedirectInstructions();

  console.log();
  console.log(chalk.yellow('⚠️  Important:'));
  console.log(chalk.gray('  • Make sure to save your changes in ScaleKit'));
  console.log(
    chalk.gray(
      "  • Redirect URLs must match your application's callback endpoints"
    )
  );
  console.log(
    chalk.gray(
      '  • You can add multiple redirect URLs for different environments'
    )
  );

  const shouldContinueToAuth = await confirmIfInteractive(
    useInteractive,
    'Continue to configure authentication module after setting up redirects?',
    true
  );

  if (shouldContinueToAuth) {
    console.log(
      chalk.cyan("💡 Great! Let's set up your authentication module.")
    );
    console.log(chalk.white('  • Run: locksmith generate'));
    console.log(chalk.white('  • Or: locksmith add'));
  } else {
    console.log(
      chalk.cyan('💡 You can set up authentication modules anytime with:')
    );
    console.log(chalk.white('  • locksmith generate'));
    console.log(chalk.white('  • locksmith add'));
  }
}

export async function handleConfigureCommand(options = {}) {
  const { subcommand, provider, dryRun, verbose, force, ...flags } = options;

  if (!subcommand) {
    console.log(chalk.red('❌ Please specify a subcommand.'));
    console.log(chalk.cyan('💡 Available subcommands:'));
    console.log(chalk.white('  • auth    - Configure authentication provider'));
    console.log(chalk.white('  • llm     - Configure LLM broker preferences'));
    console.log(chalk.cyan('💡 Examples:'));
    console.log(
      chalk.white('  • locksmith configure auth --provider=scalekit')
    );
    console.log(chalk.white('  • locksmith configure auth --redirects'));
    console.log(chalk.white('  • locksmith configure llm --broker=gemini'));
    console.log(chalk.white('  • locksmith configure auth --interactive'));
    console.log(chalk.white('  • locksmith configure llm --interactive'));
    return;
  }

  switch (subcommand) {
    case 'auth':
      await handleConfigureAuth({ provider, dryRun, verbose, force, ...flags });
      break;
    case 'llm':
      await handleConfigureLLMBroker({
        provider,
        dryRun,
        verbose,
        force,
        ...flags,
      });
      break;
    default:
      console.log(chalk.red(`❌ Unknown configure subcommand: ${subcommand}`));
      console.log(chalk.cyan('💡 Available subcommands: auth, llm'));
  }
}

async function handleConfigureAuth(options = {}) {
  const {
    provider,
    dryRun,
    verbose,
    force,
    interactive,
    noInteractive,
    redirects,
  } = options;

  console.log(chalk.green('🔧 Configuring authentication settings...\n'));

  const useInteractive = shouldUseInteractive({ interactive, noInteractive });

  // Handle redirects configuration
  if (redirects) {
    await handleConfigureRedirects({ useInteractive, verbose });
    return;
  }

  // 1. Validate provider selection
  const providerValidation = await validateAuthProvider({
    provider,
    useInteractive,
  });
  if (!providerValidation.shouldContinue) {
    return;
  }
  const { selectedProvider } = providerValidation;

  // 2. Handle existing credentials
  const credentialsCheck = await handleExistingCredentials({
    selectedProvider,
    useInteractive,
    force,
    dryRun,
  });
  if (!credentialsCheck.shouldContinue) {
    return;
  }
  const { existingCredentials } = credentialsCheck;

  // 3. Configure provider settings
  const config = configureProviderSettings(
    selectedProvider,
    existingCredentials
  );
  const hasValidCredentials =
    existingCredentials &&
    existingCredentials.environmentId &&
    existingCredentials.clientId &&
    existingCredentials.clientSecret;

  // 4. Confirm configuration
  const confirmed = await confirmAuthConfiguration(
    config,
    hasValidCredentials,
    {
      useInteractive,
      force,
      selectedProvider,
      dryRun,
    }
  );
  if (!confirmed) {
    return;
  }

  // 5. Save configuration
  try {
    saveAuthConfiguration(config, selectedProvider, dryRun, verbose);
  } catch (error) {
    console.log(
      chalk.red(`❌ Failed to configure authentication: ${error.message}`)
    );
    console.log(chalk.cyan('💡 Try running with --verbose for more details.'));
  }
}

async function handleConfigureLLMBroker(options = {}) {
  const { broker, dryRun, verbose, force, interactive, noInteractive } =
    options;
  const useInteractive = shouldUseInteractive({ interactive, noInteractive });

  console.log(chalk.green('🔧 Configuring LLM broker settings...\n'));

  if (dryRun) {
    console.log(chalk.yellow('🔍 Dry run mode - no changes will be made'));
  }

  try {
    // 1. Detect available tools
    const detectedTools = detectAvailableTools(verbose);

    // 2. Validate broker selection
    const brokerValidation = await validateBrokerSelection({
      broker,
      useInteractive,
      detectedTools,
    });
    if (!brokerValidation.shouldContinue) {
      return;
    }
    const { selectedBroker } = brokerValidation;

    // 3. Confirm configuration
    const confirmed = await confirmBrokerConfiguration(
      selectedBroker,
      detectedTools,
      {
        useInteractive,
        force,
        dryRun,
      }
    );
    if (!confirmed) {
      return;
    }

    // 4. Save configuration
    saveBrokerConfiguration(selectedBroker, detectedTools, dryRun, verbose);
  } catch (error) {
    console.log(
      chalk.red(`❌ Failed to configure LLM broker: ${error.message}`)
    );
    if (verbose) {
      console.log(chalk.gray('📋 Error details:'), error);
    }
  }
}

async function handleConfigureRedirects(options = {}) {
  const { useInteractive, verbose } = options;

  console.log(chalk.green('🔗 Configuring redirect URLs...\n'));

  // 1. Validate prerequisites
  const validation = validateRedirectPrerequisites();
  if (!validation.shouldContinue) {
    return;
  }
  const { credentials, provider, environmentId } = validation;

  if (verbose) {
    console.log(chalk.blue('📋 Configuration details:'));
    console.log(chalk.gray(`  Provider: ${provider}`));
    console.log(chalk.gray(`  Environment ID: ${environmentId}`));
  }

  // 2. Confirm redirect configuration
  const confirmed = await confirmRedirectConfiguration(
    useInteractive,
    provider,
    environmentId
  );
  if (!confirmed) {
    return;
  }

  // 3. Open redirect configuration
  const browserOpened = await openRedirectConfiguration(environmentId, verbose);
  if (!browserOpened) {
    return;
  }

  // 4. Handle post-redirect flow and collect callback URI
  await handlePostRedirectFlow(useInteractive);

  // 5. Prompt for callback URI if interactive
  let callbackUri = null;
  if (useInteractive) {
    console.log();
    callbackUri = await promptForCallbackUri();
  }

  // 6. Save callback URI to auth-modules.json
  if (callbackUri) {
    const existingConfig = loadAuthModules() || {};
    const additionalConfig = {
      ...existingConfig,
      callbackUri,
      redirectConfiguredAt: new Date().toISOString(),
    };

    saveAuthModules(existingConfig.selectedModules || [], additionalConfig);

    console.log(chalk.green('✅ Redirect configuration saved successfully!'));
    console.log(
      chalk.blue('🔐 Configuration stored in:'),
      chalk.gray('~/.locksmith/auth-modules.json')
    );

    if (verbose) {
      console.log(chalk.gray('📋 Configuration summary:'));
      console.log(chalk.gray(`  Callback URI: ${callbackUri}`));
      console.log(
        chalk.gray(`  Configured at: ${additionalConfig.redirectConfiguredAt}`)
      );
    }
  } else {
    console.log(
      chalk.yellow(
        '⚠️  No callback URI configured. You can set it up later with:'
      )
    );
    console.log(chalk.white('  • locksmith add'));
    console.log(chalk.white('  • locksmith generate'));
  }
}

export { handleConfigureRedirects, handleConfigureLLMBroker };
