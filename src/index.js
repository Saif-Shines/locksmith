#!/usr/bin/env node

import chalk from 'chalk';
import { CLI_CONFIG } from './config.js';
import { initializeCli } from './utils/cli.js';
import { showMainInterface } from './utils/display.js';
import {
  handleInitCommand,
  handleConfigureCommand,
  handleAddCommand,
  handleGenerateCommand,
} from './commands/index.js';

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

async function handleCommand(cli) {
  const [command, subcommand] = cli.input;
  const flags = cli.flags;

  // If help flag is set, let meow handle it (it will exit the process)
  if (flags.help) {
    return;
  }

  const commandHandlers = {
    init: handleInitCommand,
    configure: handleConfigureCommand,
    add: handleAddCommand,
    generate: handleGenerateCommand,
  };

  // Handle subcommands
  if (command === 'init' && subcommand === 'auth') {
    await handleInitCommand({ ...flags, interactive: true });
  } else if (command === 'configure' && subcommand === 'auth') {
    await handleConfigureCommand({ subcommand: 'auth', ...flags });
  } else if (command === 'configure' && subcommand === 'llm') {
    await handleConfigureCommand({ subcommand: 'llm', ...flags });
  } else if (commandHandlers[command]) {
    // Pass flags to command handlers
    await commandHandlers[command](flags);
  } else if (!command) {
    showMainInterface();
  } else {
    handleUnknownCommand(command);
  }
}

async function main() {
  try {
    const cli = initializeCli();
    await handleCommand(cli);
  } catch (error) {
    console.error(
      chalk.red('❌ Oops! Something unexpected happened:'),
      error.message
    );
    console.log(
      chalk.cyan('💡 If this persists, try running ') +
        chalk.white.bold(`${CLI_CONFIG.name} --help`) +
        chalk.cyan(' or check our GitHub for known issues.')
    );
    process.exit(1);
  }
}

main();
