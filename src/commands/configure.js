import chalk from 'chalk';
import {
  saveCredentials,
  loadCredentials,
  saveToolDetection,
  savePreferredBroker,
} from '../utils/config.js';
import {
  hasClaudeCode,
  hasGemini,
  hasCursor,
  detectTools,
} from '../utils/detection.js';
import {
  shouldUseInteractive,
  selectIfInteractive,
  confirmIfInteractive,
} from '../utils/interactive.js';
import { promptAuthProvider } from '../utils/prompts.js';

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
  const { provider, dryRun, verbose, force, interactive, noInteractive } =
    options;

  console.log(chalk.green('🔧 Configuring authentication settings...\n'));

  const useInteractive = shouldUseInteractive({ interactive, noInteractive });

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
      console.log(chalk.white('  • --provider=scalekit'));
      console.log(chalk.white('  • --provider=auth0'));
      console.log(chalk.white('  • --provider=fusionauth'));
      return;
    }
  }

  const supportedProviders = ['scalekit', 'auth0', 'fusionauth'];
  if (!supportedProviders.includes(selectedProvider.toLowerCase())) {
    console.log(chalk.red(`❌ Unsupported provider: ${selectedProvider}`));
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
      const config = {
        provider: selectedProvider.toLowerCase(),
        configuredAt: new Date().toISOString(),
        ...options,
      };

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

    const availableBrokers = ['gemini', 'claude', 'cursor-agent'];
    let selectedBroker = broker;

    // Handle broker selection
    if (!selectedBroker) {
      if (useInteractive) {
        console.log(
          chalk.cyan(
            '💡 No broker specified. Starting interactive selection...'
          )
        );

        // Create choices with availability status
        const brokerChoices = availableBrokers.map((brokerName) => {
          const available =
            detectedTools[brokerName.replace('-agent', '')] || false;
          const status = available
            ? chalk.green('✅ Available')
            : chalk.yellow('⚠️  Not detected');
          return {
            name: `${brokerName} ${status}`,
            value: brokerName,
            short: brokerName,
          };
        });

        const { selectIfInteractive } = await import('../utils/interactive.js');
        selectedBroker = await selectIfInteractive(
          useInteractive,
          'Select your preferred LLM broker:',
          brokerChoices,
          'gemini'
        );
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

    // Validate broker selection
    if (!availableBrokers.includes(selectedBroker.toLowerCase())) {
      console.log(chalk.red(`❌ Unsupported broker: ${selectedBroker}`));
      console.log(
        chalk.cyan('💡 Supported brokers:'),
        chalk.white(availableBrokers.join(', '))
      );
      return;
    }

    selectedBroker = selectedBroker.toLowerCase();

    if (!dryRun) {
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
        chalk.gray('📁 Configuration saved to ~/.locksmith/tools.json')
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
