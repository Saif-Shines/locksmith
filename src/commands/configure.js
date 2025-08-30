import chalk from 'chalk';
import open from 'open';
import {
  saveCredentials,
  loadCredentials,
  saveToolDetection,
  savePreferredBroker,
} from '../utils/core/config.js';
import {
  hasClaudeCode,
  hasGemini,
  hasCursor,
  detectTools,
} from '../utils/core/detection.js';
import {
  shouldUseInteractive,
  selectIfInteractive,
  confirmIfInteractive,
} from '../utils/interactive/interactive.js';
import { promptAuthProvider } from '../utils/interactive/prompts.js';
import {
  SUPPORTED_PROVIDERS,
  AVAILABLE_BROKERS,
  DEFAULT_BROKER,
} from '../core/constants.js';

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

  // Handle provider selection
  let selectedProvider = provider;

  if (!selectedProvider) {
    if (useInteractive) {
      // Check if valid credentials already exist
      const existingCredentials = loadCredentials();
      const hasValidCredentials =
        existingCredentials &&
        existingCredentials.provider &&
        existingCredentials.environmentId &&
        existingCredentials.clientId &&
        existingCredentials.clientSecret;

      if (hasValidCredentials) {
        // Show current configuration and offer auth configuration options
        console.log(chalk.green('📋 Current Authentication Configuration:'));
        console.log(chalk.gray(`  Provider: ${existingCredentials.provider}`));
        console.log(
          chalk.gray(`  Environment: ${existingCredentials.environmentId}`)
        );
        console.log(
          chalk.gray(
            `  Configured: ${new Date(
              existingCredentials.configuredAt || Date.now()
            ).toLocaleDateString()}`
          )
        );

        console.log();
        console.log(chalk.cyan('🔧 What would you like to configure?'));

        // Define available auth configuration options
        const authOptions = [
          {
            name: '🔗 Set redirect URLs',
            value: 'redirects',
            description: 'Configure redirect URLs for authentication callbacks',
          },
          {
            name: '🔄 Change authentication provider',
            value: 'change_provider',
            description: 'Switch to a different authentication provider',
          },
          {
            name: '📋 View current configuration',
            value: 'view_config',
            description: 'Display detailed current authentication setup',
          },
        ];

        const { selectIfInteractive } = await import(
          '../utils/interactive/interactive.js'
        );

        const selectedOption = await selectIfInteractive(
          useInteractive,
          'Select an option:',
          authOptions,
          null
        );

        console.log();

        switch (selectedOption) {
          case 'redirects':
            console.log(chalk.cyan('🔗 Setting up redirect URLs...'));
            await handleConfigureRedirects({ useInteractive: true, verbose });
            return; // Exit after handling redirects

          case 'change_provider':
            console.log(chalk.cyan('🔄 Changing authentication provider...'));
            selectedProvider = await promptAuthProvider();
            break;

          case 'view_config':
            console.log(chalk.blue('📋 Detailed Configuration:'));
            console.log(
              chalk.gray(`  Provider: ${existingCredentials.provider}`)
            );
            console.log(
              chalk.gray(
                `  Environment ID: ${existingCredentials.environmentId}`
              )
            );
            console.log(
              chalk.gray(`  Client ID: ${existingCredentials.clientId}`)
            );
            console.log(
              chalk.gray(
                `  Environment URL: ${existingCredentials.environmentUrl}`
              )
            );
            console.log(
              chalk.gray(
                `  Configured At: ${new Date(
                  existingCredentials.configuredAt || Date.now()
                ).toLocaleString()}`
              )
            );

            const { confirmIfInteractive } = await import(
              '../utils/interactive/interactive.js'
            );

            const continueWithConfig = await confirmIfInteractive(
              useInteractive,
              'Would you like to configure something else?',
              false
            );

            if (!continueWithConfig) {
              console.log(chalk.cyan('💡 Configuration complete.'));
              return;
            }

            // Re-run the configure command to show options again
            await handleConfigureCommand({
              subcommand: 'auth',
              interactive: true,
              dryRun,
              verbose,
              force,
            });
            return;

          default:
            console.log(chalk.cyan('💡 No option selected.'));
            return;
        }
      } else {
        // No valid credentials, start fresh
        console.log(
          chalk.cyan(
            '💡 No authentication provider configured yet. Starting interactive selection...'
          )
        );
        selectedProvider = await promptAuthProvider();
      }

      // Add conditional follow-up for provider-specific guidance
      if (selectedProvider) {
        const providerLower = selectedProvider.toLowerCase();
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
        } else if (
          providerLower === 'auth0' ||
          providerLower === 'fusionauth'
        ) {
          console.log(chalk.yellow('🚧 Coming Soon:'));
          console.log(
            chalk.gray(
              `  • ${selectedProvider} integration is currently in development`
            )
          );
          console.log(
            chalk.gray("  • We're working hard to bring you full support soon!")
          );
          console.log(
            chalk.cyan('  💡 For now, please select ScaleKit to continue\n')
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
      console.log(chalk.white('  • --provider=scalekit'));
      console.log(chalk.white('  • --provider=auth0'));
      console.log(chalk.white('  • --provider=fusionauth'));
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

  if (dryRun) {
    console.log(chalk.yellow('🔍 Dry run mode - no changes will be made'));
  }

  if (verbose) {
    console.log(chalk.blue('📋 Configuration details:'));
    console.log(chalk.gray(`  Provider: ${selectedProvider}`));
    console.log(chalk.gray(`  Dry run: ${dryRun ? 'Yes' : 'No'}`));
    console.log(chalk.gray(`  Force: ${force ? 'Yes' : 'No'}`));
  }

  // Check if credentials exist
  const existingCredentials = loadCredentials();
  if (existingCredentials && !force) {
    console.log(chalk.yellow('⚠️  Existing credentials found.'));
    console.log(
      chalk.gray('Current provider:'),
      chalk.white(existingCredentials.provider || 'unknown')
    );

    if (useInteractive) {
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
          chalk.cyan(
            '💡 Configuration cancelled. Use --force to skip this prompt.'
          )
        );
        return;
      }
    } else {
      console.log(
        chalk.cyan(
          '💡 Use --force to overwrite existing configuration or --interactive for guided setup.'
        )
      );
      return;
    }
  }

  // Configure based on provider
  try {
    if (!dryRun) {
      // Load existing credentials to preserve authentication data
      const existingCredentials = loadCredentials() || {};

      // Check if existing credentials contain valid auth data
      const hasValidCredentials =
        existingCredentials.environmentId &&
        existingCredentials.clientId &&
        existingCredentials.clientSecret;

      let config;
      if (hasValidCredentials) {
        // Merge with existing valid credentials
        config = {
          ...existingCredentials,
          provider: selectedProvider.toLowerCase(),
          configuredAt: new Date().toISOString(),
        };
      } else {
        // Only save provider info if no valid credentials exist
        console.log(
          chalk.yellow('⚠️  No valid authentication credentials found.')
        );
        console.log(
          chalk.cyan(
            "💡 Provider configuration saved, but you'll need to run "
          ) +
            chalk.white.bold('locksmith init') +
            chalk.cyan(' to set up authentication credentials.')
        );

        config = {
          provider: selectedProvider.toLowerCase(),
          configuredAt: new Date().toISOString(),
        };
      }

      // Final confirmation in interactive mode
      if (useInteractive && !force) {
        console.log(chalk.blue('📋 Configuration Summary:'));
        console.log(chalk.gray(`  Provider: ${selectedProvider}`));
        console.log(chalk.gray(`  Dry run: ${dryRun ? 'Yes' : 'No'}`));
        console.log(chalk.gray(`  Configured at: ${config.configuredAt}`));
        if (hasValidCredentials && existingCredentials.environmentId) {
          console.log(
            chalk.gray(`  Environment: ${existingCredentials.environmentId}`)
          );
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
          return;
        }
      }

      saveCredentials(config);
      console.log(chalk.green('✅ Authentication configured successfully!'));
      console.log(chalk.blue('🔐 Configuration saved securely.'));

      if (verbose) {
        console.log(chalk.gray('📋 Configuration summary:'));
        console.log(chalk.gray(`  Provider: ${selectedProvider}`));
        console.log(chalk.gray(`  Configured at: ${config.configuredAt}`));
      }
    } else {
      console.log(
        chalk.yellow(
          '🔍 Would configure authentication with the following settings:'
        )
      );
      console.log(chalk.gray(`  Provider: ${selectedProvider}`));
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

async function handleConfigureLLMBroker(options = {}) {
  const { broker, dryRun, verbose, force, interactive, noInteractive } =
    options;

  const useInteractive = shouldUseInteractive({ interactive, noInteractive });

  console.log(chalk.green('🔧 Configuring LLM broker settings...\n'));

  if (dryRun) {
    console.log(chalk.yellow('🔍 Dry run mode - no changes will be made'));
  }

  if (verbose) {
    console.log(chalk.blue('📋 Detecting installed AI tools...'));
  }

  try {
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

    let selectedBroker = broker;

    // Handle broker selection
    if (!selectedBroker) {
      if (useInteractive) {
        console.log(
          chalk.cyan(
            '💡 No broker specified. Starting interactive selection...'
          )
        );

        // Enhanced broker selection with better information
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

        const { selectIfInteractive } = await import(
          '../utils/interactive/interactive.js'
        );
        selectedBroker = await selectIfInteractive(
          useInteractive,
          'Select your preferred LLM broker:',
          brokerChoices,
          DEFAULT_BROKER
        );

        // Add conditional follow-up for undetected tools
        if (selectedBroker) {
          const toolName = selectedBroker.replace('-agent', '');
          const isToolAvailable = detectedTools[toolName];

          if (!isToolAvailable && useInteractive) {
            const { confirmIfInteractive } = await import(
              '../utils/interactive/interactive.js'
            );

            const shouldContinue = await confirmIfInteractive(
              useInteractive,
              `The ${selectedBroker} tool was not detected on your system. Continue anyway?`,
              true
            );

            if (!shouldContinue) {
              console.log(
                chalk.cyan(
                  '💡 Selection cancelled. Please ensure the tool is installed or choose a different broker.'
                )
              );
              return;
            }
          }
        }
      } else {
        console.log(
          chalk.red('❌ Broker is required when not in interactive mode.')
        );
        console.log(
          chalk.cyan('💡 Use --broker flag or --interactive for guided setup:')
        );
        console.log(chalk.white('  • --broker=gemini'));
        console.log(chalk.white('  • --broker=claude'));
        console.log(chalk.white('  • --broker=cursor-agent'));
        return;
      }
    }

    // Enhanced validation with better error messages
    if (!AVAILABLE_BROKERS.includes(selectedBroker.toLowerCase())) {
      console.log(chalk.red(`❌ Unsupported broker: ${selectedBroker}`));
      console.log(
        chalk.cyan('💡 Supported brokers:'),
        chalk.white(AVAILABLE_BROKERS.join(', '))
      );
      console.log(chalk.cyan('💡 Use --interactive for guided selection'));
      return;
    }

    selectedBroker = selectedBroker.toLowerCase();

    if (!dryRun) {
      // Final confirmation in interactive mode
      if (useInteractive && !force) {
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
          return;
        }
      }

      // Save both detected tools and preferred broker
      const toolConfig = {
        detectedAt: new Date().toISOString(),
        tools: detectedTools,
        preferredBroker: selectedBroker,
        version: '1.1',
      };

      saveToolDetection(detectedTools); // Save detected tools
      savePreferredBroker(selectedBroker); // Save preferred broker

      const availableTools = Object.entries(detectedTools)
        .filter(([, available]) => available)
        .map(([tool]) => tool);

      console.log(chalk.green('✅ LLM broker configured successfully!'));
      console.log(
        chalk.blue('🤖 Preferred broker:'),
        chalk.white(selectedBroker)
      );

      if (availableTools.length > 0) {
        console.log(
          chalk.blue('🔧 Available tools:'),
          chalk.white(availableTools.join(', '))
        );
      } else {
        console.log(chalk.yellow('⚠️  No AI tools detected on your system.'));
        console.log(
          chalk.cyan(
            '💡 Consider installing Claude Code, Gemini CLI, or Cursor.'
          )
        );
      }

      if (verbose) {
        console.log(chalk.gray('📋 Configuration summary:'));
        console.log(chalk.gray(`  Preferred broker: ${selectedBroker}`));
        console.log(
          chalk.gray(
            `  Available tools: ${availableTools.join(', ') || 'none'}`
          )
        );
        console.log(chalk.gray(`  Configured at: ${new Date().toISOString()}`));
      }

      console.log(
        chalk.gray('📁 Configuration saved to ~/.locksmith/llm-brokers.json')
      );
    } else {
      console.log(
        chalk.yellow(
          '🔍 Would configure LLM broker with the following settings:'
        )
      );
      console.log(chalk.gray(`  Preferred broker: ${selectedBroker}`));
      const availableTools = Object.entries(detectedTools)
        .filter(([, available]) => available)
        .map(([tool]) => tool);
      console.log(
        chalk.gray(`  Available tools: ${availableTools.join(', ') || 'none'}`)
      );
      console.log(chalk.gray('  No actual changes made (dry run)'));
    }

    console.log(chalk.cyan('\n🚀 Ready to use your LLM broker!'));
    console.log(
      chalk.white(`  • Your preferred broker is set to: ${selectedBroker}`)
    );
    console.log(chalk.white('  • Future commands will use this preference'));
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

  // Load existing credentials
  const credentials = loadCredentials();
  if (!credentials) {
    console.log(chalk.red('❌ No authentication credentials found.'));
    console.log(
      chalk.cyan('💡 Please run ') +
        chalk.white.bold('locksmith init') +
        chalk.cyan(' first to set up your authentication provider.')
    );
    return;
  }

  // Check if ScaleKit is configured (currently only supported provider)
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
    return;
  }

  // Check if environmentId exists
  const environmentId = credentials.environmentId;
  if (!environmentId) {
    console.log(chalk.red('❌ Environment ID not found in credentials.'));
    console.log(
      chalk.cyan('💡 Please run ') +
        chalk.white.bold('locksmith init') +
        chalk.cyan(' again to reconfigure your credentials.')
    );
    return;
  }

  if (verbose) {
    console.log(chalk.blue('📋 Configuration details:'));
    console.log(chalk.gray(`  Provider: ${provider}`));
    console.log(chalk.gray(`  Environment ID: ${environmentId}`));
  }

  // Interactive confirmation
  if (useInteractive) {
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
      return;
    }
  }

  try {
    // Construct ScaleKit redirects URL
    const redirectsUrl = `https://app.scalekit.cloud/ws/environments/${environmentId}/authentication/redirects`;

    if (verbose) {
      console.log(chalk.blue('📋 Opening URL:'), chalk.gray(redirectsUrl));
    }

    console.log(
      chalk.cyan('🌐 Opening your browser to configure redirect URLs...')
    );

    // Open browser
    await open(redirectsUrl);

    console.log(chalk.green('✅ Browser opened successfully!'));
    console.log(
      chalk.blue(
        '🔗 Please configure your redirect URLs in the ScaleKit dashboard.'
      )
    );
    console.log(chalk.cyan('💡 Common redirect URLs to add:'));
    console.log(
      chalk.white('  • http://localhost:3000/auth/callback (development)')
    );
    console.log(
      chalk.white('  • https://yourapp.com/auth/callback (production)')
    );

    if (useInteractive) {
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
  } catch (error) {
    console.log(chalk.red(`❌ Failed to open browser: ${error.message}`));
    console.log(chalk.cyan('💡 You can manually visit:'));
    console.log(
      chalk.blue.bold(
        `https://app.scalekit.cloud/ws/environments/${environmentId}/authentication/redirects`
      )
    );
    console.log(chalk.cyan('💡 Or use --verbose flag to see the URL.'));
  }
}

export { handleConfigureRedirects };
