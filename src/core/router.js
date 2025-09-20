import chalk from 'chalk';
import { CLI_CONFIG } from '../config_alias.js';
import { showMainInterface } from '../utils/display/display.js';
import {
  displayError,
  validateCommand,
  withErrorHandling,
} from '../utils/core/error-handler.js';
import {
  handleInitCommand,
  handleConfigureCommand,
  handleAddCommand,
  handleGenerateCommand,
  handleCheckCommand,
} from '../commands_alias.js';

function getCommandSuggestions(command) {
  const availableCommands = ['init', 'configure', 'generate', 'add', 'check'];
  const subcommands = ['auth', 'llm'];

  // Simple fuzzy matching
  const suggestions = availableCommands.filter(
    (cmd) => cmd.includes(command) || command.includes(cmd)
  );

  // If no direct matches, check if it's a subcommand attempt
  if (
    suggestions.length === 0 &&
    subcommands.some((sub) => command.includes(sub))
  ) {
    return ['configure'];
  }

  return suggestions.length > 0 ? suggestions : availableCommands.slice(0, 2);
}

function handleUnknownCommand(command) {
  const suggestions = getCommandSuggestions(command);

  console.log(chalk.red(`❌ Hmm, "${command}" isn't a command we recognize.`));
  console.log(
    chalk.cyan('💡 Try running ') +
      chalk.white.bold(`${CLI_CONFIG.name} --help`) +
      chalk.cyan(' to see all available commands.')
  );

  if (suggestions.length > 0) {
    console.log(chalk.cyan('\n💡 Did you mean one of these?'));
    suggestions.forEach((suggestion) => {
      console.log(chalk.white(`   ${CLI_CONFIG.name} ${suggestion}`));
    });
  }

  console.log(
    chalk.gray('\nAvailable commands: init, configure, generate, add, check')
  );
  process.exit(1);
}

function handleSubcommands(command, subcommand, flags) {
  if (command === 'init' && subcommand === 'auth') {
    return handleInitCommand({ ...flags, interactive: true });
  }

  if (command === 'configure') {
    if (subcommand === 'auth') {
      return handleConfigureCommand({ subcommand: 'auth', ...flags });
    }
    if (subcommand === 'llm') {
      return handleConfigureCommand({ subcommand: 'llm', ...flags });
    }
  }

  return null;
}

export async function routeCommand(cli) {
  const [command, subcommand] = cli.input;
  const flags = cli.flags;

  // If help flag is set, it was already handled in initializeCli
  if (flags.help) {
    return;
  }

  // Wrap the entire routing logic with error handling
  await withErrorHandling(
    async () => {
      // Validate command flags
      validateCommand(command, flags);

      // Handle subcommands first
      const subcommandResult = await handleSubcommands(
        command,
        subcommand,
        flags
      );
      if (subcommandResult !== null) {
        return;
      }

      // Handle main commands
      const commandHandlers = {
        init: handleInitCommand,
        configure: handleConfigureCommand,
        add: handleAddCommand,
        generate: handleGenerateCommand,
        check: handleCheckCommand,
      };

      if (commandHandlers[command]) {
        await commandHandlers[command](flags);
      } else if (!command) {
        showMainInterface();
      } else {
        handleUnknownCommand(command);
      }
    },
    { command, flags, verbose: flags.verbose }
  );
}
