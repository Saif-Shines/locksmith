#!/usr/bin/env node

import chalk from 'chalk';
import { CLI_CONFIG } from './config_alias.js';
import { initializeCli } from './utils/core/cli.js';
import { routeCommand } from './core/router.js';

async function main() {
  try {
    const cli = initializeCli();
    await routeCommand(cli);
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
