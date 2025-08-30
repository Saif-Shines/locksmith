import chalk from 'chalk';
import meow from 'meow';
import meowHelp from 'cli-meow-help';
import { CLI_CONFIG, COMMANDS, FLAGS } from '../config.js';

export function generateHelpText() {
  const customCommands = {
    ...COMMANDS,
    'configure auth': {
      desc: 'Configure auth provider settings (e.g., --provider=scalekit)',
    },
    'init auth': {
      desc: 'Initialize auth with specific provider (e.g., --provider=scalekit)',
    },
  };

  // Create a custom help text with subcommand examples
  const helpText = meowHelp({
    name: CLI_CONFIG.name,
    desc: chalk.cyan(CLI_CONFIG.description),
    commands: customCommands,
    flags: FLAGS,
    header: chalk.bold.hex(CLI_CONFIG.brandColor)('🔐 LOCKSMITH CLI'),
    footer: chalk.gray(`For more info, visit: ${CLI_CONFIG.homepage}`),
    usage: '$ locksmith <command> [subcommand] [options]',
  });

  // Add subcommand examples section
  const examplesSection = `

   SUBCOMMAND EXAMPLES

  ${chalk.cyan('$ locksmith init')}                          ${chalk.gray(
    'Interactive setup'
  )}
  ${chalk.cyan('$ locksmith init auth --provider=scalekit')}  ${chalk.gray(
    'Direct provider setup'
  )}
  ${chalk.cyan('$ locksmith configure auth --provider=scalekit')} ${chalk.gray(
    'Configure provider'
  )}
  ${chalk.cyan('$ locksmith generate --format=json')}         ${chalk.gray(
    'Generate configs'
  )}
  ${chalk.cyan('$ locksmith add --provider=auth0 --dry-run')} ${chalk.gray(
    'Preview adding provider'
  )}
  `;

  return helpText + examplesSection;
}

export function initializeCli() {
  const helpText = generateHelpText();
  return meow(helpText, {
    importMeta: import.meta,
    flags: FLAGS,
  });
}
