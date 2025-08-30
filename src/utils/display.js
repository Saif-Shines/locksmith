import chalk from 'chalk';
import boxen from 'boxen';
import figlet from 'figlet';
import { mind } from 'gradient-string';
import { CLI_CONFIG, ASCII_CONFIG } from '../config.js';

// Gradient options available:
// gradient.pastel() - current (soft rainbow)
// gradient.rainbow() - vibrant rainbow
// gradient.cristal() - crystal effect
// gradient.teen() - teen colors
// gradient.summer() - summer colors
// gradient.warm() - warm colors
// gradient.cool() - cool colors
// gradient.mind() - mind-blowing colors
// gradient.morning() - morning colors
// gradient.vice() - vice colors
// gradient.fruit() - fruit colors

export function displayAsciiTitle() {
  const title = figlet.textSync('LOCKSMITH', ASCII_CONFIG);
  console.log(mind(title)); // Try rainbow for now
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
