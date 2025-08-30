import chalk from 'chalk';
import open from 'open';
import {
  shouldUseInteractive,
  confirmIfInteractive,
  multiselectIfInteractive,
  promptIfInteractive,
} from '../utils/interactive/interactive.js';
import {
  SUPPORTED_AUTH_MODULES,
  AUTH_MODULE_SETTINGS,
} from '../core/constants.js';
import {
  loadCredentials,
  saveAuthModules,
  getAuthModules,
} from '../utils/core/config.js';
import { handleInitCommand } from './init.js';

/**
 * Validates if credentials exist and handles init flow if needed
 */
async function validateCredentials(useInteractive) {
  const existingCredentials = loadCredentials();
  if (existingCredentials && existingCredentials.environmentId) {
    return true;
  }

  console.log(chalk.yellow('⚠️  No authentication credentials found.'));
  console.log(
    chalk.cyan('💡 We need to set up your authentication provider first.')
  );

  if (!useInteractive) {
    console.log(chalk.red('❌ Authentication credentials are required.'));
    console.log(chalk.cyan('💡 Please run: locksmith init --interactive'));
    return false;
  }

  console.log();
  const shouldSetup = await confirmIfInteractive(
    useInteractive,
    'Would you like to run the setup wizard now?',
    true
  );

  if (!shouldSetup) {
    console.log(
      chalk.cyan('💡 You can set up authentication later with: locksmith init')
    );
    return false;
  }

  // Run init wizard
  await handleInitCommand({ interactive: true });

  // Check again after init
  const newCredentials = loadCredentials();
  if (!newCredentials || !newCredentials.environmentId) {
    console.log(chalk.red('❌ Setup incomplete. Please try again.'));
    return false;
  }

  return true;
}

/**
 * Handles module selection (interactive or from flag)
 */
async function selectModules(options) {
  const { module, useInteractive } = options;

  if (module) {
    return validateModuleFlag(module);
  }

  if (!useInteractive) {
    displayModuleHelp();
    return { selectedModules: [], shouldContinue: false };
  }

  return await handleInteractiveModuleSelection();
}

/**
 * Validates module specified via flag
 */
function validateModuleFlag(module) {
  if (!SUPPORTED_AUTH_MODULES.includes(module.toLowerCase())) {
    console.log(chalk.red(`❌ Unsupported module: ${module}`));
    console.log(
      chalk.cyan('💡 Supported modules:'),
      chalk.white(SUPPORTED_AUTH_MODULES.join(', '))
    );
    console.log(chalk.cyan('💡 Use --interactive for guided selection'));
    return { selectedModules: [], shouldContinue: false };
  }

  const selectedModules = [module.toLowerCase()];
  displayModuleDetails(selectedModules[0]);
  return { selectedModules, shouldContinue: true };
}

/**
 * Displays help for module selection
 */
function displayModuleHelp() {
  console.log(chalk.red('❌ Module is required when not in interactive mode.'));
  console.log(
    chalk.cyan('💡 Use --module flag or --interactive for guided setup:')
  );
  SUPPORTED_AUTH_MODULES.forEach((mod) => {
    console.log(chalk.white(`  • --module=${mod}`));
  });
}

/**
 * Handles interactive module selection
 */
async function handleInteractiveModuleSelection() {
  console.log(
    chalk.cyan('💡 No module specified. Starting interactive selection...')
  );

  const moduleChoices = SUPPORTED_AUTH_MODULES.map((moduleKey) => {
    const settings = AUTH_MODULE_SETTINGS[moduleKey];
    return {
      name: `${settings.name} - ${settings.description}`,
      value: moduleKey,
      short: settings.name,
      checked: false,
    };
  });

  console.log(chalk.blue('📋 Available Authentication Modules:'));
  console.log(
    chalk.gray('  Choose the modules you want to add to your application:')
  );
  console.log();

  const selectedModules = await multiselectIfInteractive(
    true,
    'Select authentication modules:',
    moduleChoices,
    [],
    { pageSize: 10 }
  );

  if (selectedModules.length === 0) {
    console.log(chalk.yellow('⚠️  No modules selected.'));
    console.log(
      chalk.cyan(
        '💡 You can add modules later with: locksmith add --module=<module-name>'
      )
    );
    return { selectedModules: [], shouldContinue: false };
  }

  displaySelectedModules(selectedModules);
  return { selectedModules, shouldContinue: true };
}

/**
 * Displays details for a single module
 */
function displayModuleDetails(moduleKey) {
  const moduleSettings = AUTH_MODULE_SETTINGS[moduleKey];
  console.log(chalk.blue('📋 Module Details:'));
  console.log(chalk.gray(`  Name: ${moduleSettings.name}`));
  console.log(chalk.gray(`  Description: ${moduleSettings.description}`));
  console.log(chalk.gray(`  Features: ${moduleSettings.features.join(', ')}`));
  console.log();
}

/**
 * Displays selected modules information
 */
function displaySelectedModules(selectedModules) {
  console.log(chalk.blue('📋 Selected Modules:'));
  selectedModules.forEach((moduleKey) => {
    const settings = AUTH_MODULE_SETTINGS[moduleKey];
    console.log(chalk.gray(`  • ${settings.name}`));
    console.log(chalk.gray(`    ${settings.description}`));
  });
  console.log();
}

/**
 * Handles redirect configuration for ScaleKit
 */
async function handleRedirectConfiguration({ useInteractive, verbose }) {
  const credentials = loadCredentials();
  if (!credentials || !credentials.environmentId) {
    console.log(chalk.red('❌ No valid credentials found for redirect setup.'));
    return null;
  }

  const environmentId = credentials.environmentId;
  const provider = credentials.provider || 'scalekit';

  if (provider.toLowerCase() !== 'scalekit') {
    console.log(
      chalk.yellow(
        '⚠️  Redirect configuration is currently only supported for ScaleKit.'
      )
    );
    return null;
  }

  if (verbose) {
    console.log(chalk.blue('📋 Redirect setup details:'));
    console.log(chalk.gray(`  Provider: ${provider}`));
    console.log(chalk.gray(`  Environment ID: ${environmentId}`));
  }

  const redirectsUrl = `https://app.scalekit.cloud/ws/environments/${environmentId}/authentication/redirects`;

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
  } catch (error) {
    console.log(chalk.red("❌ We couldn't open your browser automatically."));
    console.log(
      chalk.cyan('🌐 Please visit this URL manually to configure redirects:')
    );
    console.log(chalk.blue.bold(redirectsUrl));
  }

  displayRedirectInstructions();

  if (!useInteractive) {
    return null;
  }

  return await promptForCallbackUri();
}

/**
 * Displays redirect configuration instructions
 */
function displayRedirectInstructions() {
  console.log();
  console.log(chalk.cyan('💡 Common redirect URLs to add:'));
  console.log(
    chalk.white('  • http://localhost:3000/auth/callback (development)')
  );
  console.log(
    chalk.white('  • https://yourapp.com/auth/callback (production)')
  );
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
  console.log();
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
 * Saves modules and configuration
 */
function saveModulesAndConfiguration(
  selectedModules,
  callbackUri,
  dryRun,
  verbose
) {
  try {
    if (dryRun) {
      displayDryRunSummary(selectedModules, callbackUri);
      return true;
    }

    const existingModules = getAuthModules();
    const allModules = [...new Set([...existingModules, ...selectedModules])];

    const additionalConfig = {};
    if (callbackUri) {
      additionalConfig.callbackUri = callbackUri;
      additionalConfig.redirectsConfigured = true;
      additionalConfig.redirectsConfiguredAt = new Date().toISOString();
    }

    saveAuthModules(allModules, additionalConfig);
    displaySuccessSummary(selectedModules, allModules, callbackUri, verbose);
    return true;
  } catch (error) {
    console.log(
      chalk.red(`❌ Failed to add authentication modules: ${error.message}`)
    );
    console.log(chalk.cyan('💡 Try running with --verbose for more details.'));
    return false;
  }
}

/**
 * Displays dry run summary
 */
function displayDryRunSummary(selectedModules, callbackUri) {
  console.log(
    chalk.yellow(
      `🔍 Would add ${selectedModules.length} module${
        selectedModules.length > 1 ? 's' : ''
      } with the following settings:`
    )
  );
  console.log(chalk.gray(`  Modules: ${selectedModules.join(', ')}`));
  if (callbackUri) {
    console.log(chalk.gray(`  Callback URI: ${callbackUri}`));
    console.log(chalk.gray('  Redirects: Would be configured'));
  }
  console.log(chalk.gray('  No actual changes made (dry run)'));
}

/**
 * Displays success summary
 */
function displaySuccessSummary(
  selectedModules,
  allModules,
  callbackUri,
  verbose
) {
  console.log(
    chalk.green(
      `✅ ${selectedModules.length} authentication module${
        selectedModules.length > 1 ? 's' : ''
      } added successfully!`
    )
  );
  console.log(chalk.blue('🔧 Authentication modules configured.'));

  if (verbose) {
    console.log(chalk.gray('📋 Addition summary:'));
    console.log(chalk.gray(`  Modules: ${selectedModules.join(', ')}`));
    console.log(chalk.gray(`  Total modules: ${allModules.length}`));
    console.log(chalk.gray(`  Added at: ${new Date().toISOString()}`));
    if (callbackUri) {
      console.log(chalk.gray(`  Callback URI: ${callbackUri}`));
      console.log(chalk.gray(`  Redirects configured: Yes`));
    }
  }

  console.log(chalk.cyan('\n🚀 Ready to generate configurations!'));
  console.log(chalk.white('  • Run: locksmith generate'));
  console.log(
    chalk.white('  • Your selected modules will be available for configuration')
  );
}

/**
 * Handles user confirmation for module addition
 */
async function confirmModuleAddition(
  selectedModules,
  configureRedirects,
  useInteractive,
  dryRun
) {
  if (!useInteractive || dryRun) {
    return true;
  }

  console.log(chalk.blue('📋 Module Addition Summary:'));
  console.log(chalk.gray(`  Modules: ${selectedModules.join(', ')}`));
  console.log(
    chalk.gray(`  Configure redirects: ${configureRedirects ? 'Yes' : 'No'}`)
  );
  console.log(chalk.gray(`  Added at: ${new Date().toISOString()}`));
  console.log(
    chalk.gray('  📋 This will configure authentication modules for your app')
  );
  console.log();

  const shouldProceed = await confirmIfInteractive(
    useInteractive,
    `Add ${selectedModules.length} authentication module${
      selectedModules.length > 1 ? 's' : ''
    }?`,
    true
  );

  if (!shouldProceed) {
    console.log(
      chalk.cyan('💡 Module addition cancelled. No changes were made.')
    );
    return false;
  }

  return true;
}

export async function handleAddCommand(options = {}) {
  const { module, dryRun, verbose, interactive, noInteractive } = options;
  const useInteractive = shouldUseInteractive({ interactive, noInteractive });

  console.log(chalk.green('🔧 Adding authentication modules to your setup...'));
  console.log(
    chalk.cyan(
      '🌟 This will configure authentication modules for your applications.'
    )
  );

  // 1. Validate credentials and handle init if needed
  const credentialsValid = await validateCredentials(useInteractive);
  if (!credentialsValid) {
    return;
  }

  // 2. Handle module selection
  const moduleSelection = await selectModules({ module, useInteractive });
  if (!moduleSelection.shouldContinue) {
    return;
  }
  const { selectedModules } = moduleSelection;

  // 3. Display dry run and verbose information
  if (dryRun) {
    console.log(chalk.yellow('🔍 Dry run mode - no changes will be made'));
  }

  if (verbose) {
    console.log(chalk.blue('📋 Add module details:'));
    console.log(chalk.gray(`  Modules: ${selectedModules.join(', ')}`));
    console.log(chalk.gray(`  Dry run: ${dryRun ? 'Yes' : 'No'}`));
  }

  // 4. Ask about redirects configuration
  let configureRedirects = false;
  if (useInteractive && !dryRun) {
    console.log();
    configureRedirects = await confirmIfInteractive(
      useInteractive,
      'Would you like to configure redirect URLs for authentication?',
      false
    );
  }

  // 5. Get user confirmation
  const confirmed = await confirmModuleAddition(
    selectedModules,
    configureRedirects,
    useInteractive,
    dryRun
  );
  if (!confirmed) {
    return;
  }

  // 6. Handle redirects configuration if requested
  let callbackUri = null;
  if (configureRedirects && !dryRun) {
    console.log();
    console.log(chalk.cyan('🔗 Configuring redirect URLs...'));
    try {
      callbackUri = await handleRedirectConfiguration({
        useInteractive,
        verbose,
      });
    } catch (error) {
      console.log(
        chalk.yellow(
          '⚠️  Redirect configuration failed, but continuing with module setup.'
        )
      );
      console.log(chalk.gray(`Error: ${error.message}`));
    }
  }

  // 7. Save modules and configuration
  const success = saveModulesAndConfiguration(
    selectedModules,
    callbackUri,
    dryRun,
    verbose
  );
  if (!success) {
    return;
  }
}
