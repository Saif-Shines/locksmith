import chalk from 'chalk';
import meow from 'meow';
import { CLI_CONFIG, FLAGS } from '../../config_alias.js';
import {
  generateProgressiveHelp,
  generateContextualHelp,
} from './help-system.js';

export function generateHelpText(flags = {}) {
  // Check if this is a partial command request for contextual help
  const input = flags._ || [];

  if (input.length > 0 && !flags.verbose) {
    return generateContextualHelp(input, flags);
  }

  return generateProgressiveHelp(flags);
}

export function initializeCli() {
  // Create a basic help text for meow initialization
  const basicHelpText = generateProgressiveHelp({ verbose: false });

  const cli = meow(basicHelpText, {
    importMeta: import.meta,
    flags: FLAGS,
  });

  // If help is requested, regenerate with appropriate verbosity
  if (cli.flags.help) {
    const helpText = generateHelpText(cli.flags);
    console.log(helpText);
    process.exit(0);
  }

  return cli;
}
