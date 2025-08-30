import chalk from 'chalk';
import { CLI_CONFIG } from '../config_alias.js';
import { showMainInterface } from '../utils/display/display.js';
import {
  handleInitCommand,
  handleConfigureCommand,
  handleAddCommand,
  handleGenerateCommand,
} from '../commands_alias.js';

function handleUnknownCommand(command) {
  console.log(chalk.red(`❌ Hmm, "${command}" isn't a command we recognize.`));
  console.log(
    chalk.cyan('💡 Try running ') +
      chalk.white.bold(`${CLI_CONFIG.name} --help`) +
      chalk.cyan(' to see all available commands.')
  );
  console.log(chalk.gray('Available commands: init, configure, generate, add'));
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

  // If help flag is set, let meow handle it (it will exit the process)
  if (flags.help) {
    return;
  }

  // Handle subcommands first
  const subcommandResult = await handleSubcommands(command, subcommand, flags);
  if (subcommandResult !== null) {
    return;
  }

  // Handle main commands
  const commandHandlers = {
    init: handleInitCommand,
    configure: handleConfigureCommand,
    add: handleAddCommand,
    generate: handleGenerateCommand,
  };

  if (commandHandlers[command]) {
    await commandHandlers[command](flags);
  } else if (!command) {
    showMainInterface();
  } else {
    handleUnknownCommand(command);
  }
}
