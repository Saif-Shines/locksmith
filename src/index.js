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
  console.log(chalk.red(`❌ Unknown command: ${command}`));
  console.log(
    chalk.gray('Run ') +
      chalk.white.bold(`${CLI_CONFIG.name} --help`) +
      chalk.gray(' to see available commands')
  );
  process.exit(1);
}

function handleCommand(command) {
  const commandHandlers = {
    init: handleInitCommand,
    add: handleAddCommand,
    generate: handleGenerateCommand,
  };

  if (commandHandlers[command]) {
    commandHandlers[command]();
  } else if (!command) {
    showMainInterface();
  } else {
    handleUnknownCommand(command);
  }
}

function main() {
  try {
    const cli = initializeCli();
    const [command] = cli.input;
    handleCommand(command);
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

main();
