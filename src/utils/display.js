import chalk from 'chalk';
import boxen from 'boxen';
import figlet from 'figlet';
import gradient from 'gradient-string';
import { CLI_CONFIG, ASCII_CONFIG } from '../config.js';

export function displayAsciiTitle() {
  const title = figlet.textSync('LOCKSMITH', ASCII_CONFIG);
  console.log(gradient.pastel(title));
  console.log();
}

export function displayWelcomeBox() {
  const message = boxen(
    chalk.cyan('🚀 Ready to secure your AI applications!\n') +
      chalk.gray('Run ') +
      chalk.white.bold(`${CLI_CONFIG.name} --help`) +
      chalk.gray(' to get started'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
      backgroundColor: '#001122',
    }
  );
  console.log(message);
}

export function showMainInterface() {
  displayAsciiTitle();
  displayWelcomeBox();
}
