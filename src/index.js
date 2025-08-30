#!/usr/bin/env node

import chalk from 'chalk';
import { CLI_CONFIG } from './config.js';
import { initializeCli } from './utils/cli.js';
import { showMainInterface } from './utils/display.js';
import {
  handleInitCommand,
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
  console.log(chalk.gray('Available commands: init, generate, add'));
  process.exit(1);
}

async function handleCommand(command) {
  const commandHandlers = {
    init: handleInitCommand,
    add: handleAddCommand,
    generate: handleGenerateCommand,
  };

  if (commandHandlers[command]) {
    await commandHandlers[command]();
  } else if (!command) {
    showMainInterface();
  } else {
    handleUnknownCommand(command);
  }
}

async function main() {
  try {
    const cli = initializeCli();
    const [command] = cli.input;
    await handleCommand(command);
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
