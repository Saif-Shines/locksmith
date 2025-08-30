import chalk from 'chalk';
import meow from 'meow';
import meowHelp from 'cli-meow-help';
import { CLI_CONFIG, COMMANDS, FLAGS } from '../../config_alias.js';

export function generateHelpText() {
  const customCommands = {
    ...COMMANDS,
    'configure auth': {
      desc: 'Configure auth provider settings (e.g., --provider=scalekit)',
    },
    'configure llm': {
      desc: 'Configure preferred LLM broker with auto-detection and interactive selection',
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
    'Interactive setup wizard'
  )}
  ${chalk.cyan('$ locksmith init --no-interactive')}         ${chalk.gray(
    'Non-interactive setup (requires all flags)'
  )}
  ${chalk.cyan(
    '$ locksmith init --provider=scalekit --environment-id=...'
  )} ${chalk.gray('Non-interactive ScaleKit setup')}

  ${chalk.cyan('$ locksmith configure auth')}                ${chalk.gray(
    'Interactive auth provider configuration'
  )}
  ${chalk.cyan('$ locksmith configure auth --provider=scalekit')} ${chalk.gray(
    'Direct provider configuration'
  )}
  ${chalk.cyan('$ locksmith configure auth --interactive')}  ${chalk.gray(
    'Interactive provider selection'
  )}

  ${chalk.cyan('$ locksmith add')}                           ${chalk.gray(
    'Interactive provider addition'
  )}
  ${chalk.cyan('$ locksmith add --provider=auth0')}         ${chalk.gray(
    'Add specific provider'
  )}
  ${chalk.cyan('$ locksmith add --interactive')}             ${chalk.gray(
    'Interactive provider selection'
  )}

  ${chalk.cyan('$ locksmith generate')}                      ${chalk.gray(
    'Interactive config generation'
  )}
  ${chalk.cyan('$ locksmith generate --format=json --count=5')} ${chalk.gray(
    'Generate 5 JSON configs'
  )}
  ${chalk.cyan('$ locksmith generate --interactive')}       ${chalk.gray(
    'Interactive format/output selection'
  )}

  ${chalk.cyan('$ locksmith configure llm --broker=gemini')}  ${chalk.gray(
    'Set preferred LLM broker to Gemini (saved for future commands)'
  )}
  ${chalk.cyan('$ locksmith configure llm --broker=claude')}   ${chalk.gray(
    'Set preferred LLM broker to Claude (saved for future commands)'
  )}
  ${chalk.cyan('$ locksmith configure llm --interactive')}     ${chalk.gray(
    'Interactive broker selection with guidance'
  )}
  ${chalk.cyan('$ locksmith configure llm')}                   ${chalk.gray(
    'Auto-detect and configure LLM broker (saved for future commands)'
  )}
  ${chalk.cyan('$ locksmith --help')}                        ${chalk.gray(
    'Show all commands and options'
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
