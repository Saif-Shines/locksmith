import chalk from 'chalk';
import meow from 'meow';
import meowHelp from 'cli-meow-help';
import { CLI_CONFIG, COMMANDS, FLAGS } from '../config.js';

export function generateHelpText() {
  return meowHelp({
    name: CLI_CONFIG.name,
    desc: chalk.cyan(CLI_CONFIG.description),
    commands: COMMANDS,
    flags: FLAGS,
    header: chalk.bold.hex(CLI_CONFIG.brandColor)('🔐 LOCKSMITH CLI'),
    footer: chalk.gray(`For more info, visit: ${CLI_CONFIG.homepage}`),
  });
}

export function initializeCli() {
  const helpText = generateHelpText();
  return meow(helpText, {
    importMeta: import.meta,
    flags: FLAGS,
  });
}
