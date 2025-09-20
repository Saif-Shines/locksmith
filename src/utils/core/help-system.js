import chalk from 'chalk';
import meowHelp from 'cli-meow-help';
import { CLI_CONFIG, COMMANDS, FLAGS } from '../../config_alias.js';

/**
 * Progressive help system with different verbosity levels
 */
export function generateProgressiveHelp(flags = {}) {
  const { verbose = false, help = false } = flags;

  if (verbose) {
    return generateVerboseHelp();
  }

  return generateBasicHelp();
}

/**
 * Basic help - clean and concise
 */
function generateBasicHelp() {
  const basicCommands = {
    init: {
      desc: 'Set up authentication for your project',
    },
    configure: {
      desc: 'Configure authentication settings and preferences',
    },
    add: {
      desc: 'Add authentication modules to your project',
    },
    generate: {
      desc: 'Generate secure authentication configurations',
    },
    check: {
      desc: 'Check available AI tools (claude, gemini, cursor-agent)',
    },
  };

  return meowHelp({
    name: CLI_CONFIG.name,
    desc: chalk.cyan(CLI_CONFIG.description),
    commands: basicCommands,
    flags: getBasicFlags(),
    header: chalk.bold.hex(CLI_CONFIG.brandColor)('🔐 LOCKSMITH CLI'),
    footer: chalk.gray(
      `Use --help --verbose for detailed help | Visit: ${CLI_CONFIG.homepage}`
    ),
    usage: '$ locksmith <command> [options]',
  });
}

/**
 * Verbose help - comprehensive with examples
 */
function generateVerboseHelp() {
  const detailedCommands = {
    ...COMMANDS,
    'configure auth': {
      desc: 'Configure authentication provider settings with interactive provider selection and validation',
    },
    'configure llm': {
      desc: 'Configure preferred LLM broker with auto-detection, interactive selection, and preference persistence',
    },
    'init auth': {
      desc: 'Initialize authentication with specific provider, supporting both interactive and programmatic setup',
    },
  };

  const helpText = meowHelp({
    name: CLI_CONFIG.name,
    desc: chalk.cyan(CLI_CONFIG.description),
    commands: detailedCommands,
    flags: FLAGS,
    header: chalk.bold.hex(CLI_CONFIG.brandColor)(
      '🔐 LOCKSMITH CLI - DETAILED HELP'
    ),
    footer: chalk.gray(`Homepage: ${CLI_CONFIG.homepage}`),
    usage: '$ locksmith <command> [subcommand] [options]',
  });

  // Add comprehensive examples section
  const examplesSection = generateDetailedExamples();

  return helpText + examplesSection;
}

/**
 * Get basic flags for concise help
 */
function getBasicFlags() {
  return {
    help: {
      desc: 'Show help information',
      shortFlag: 'h',
    },
    version: {
      desc: 'Show version number',
      shortFlag: 'v',
    },
    interactive: {
      desc: 'Run in interactive mode',
      shortFlag: 'i',
    },
    verbose: {
      desc: 'Show detailed output',
      shortFlag: 'v',
    },
  };
}

/**
 * Generate detailed examples section
 */
function generateDetailedExamples() {
  return `

   ${chalk.bold.cyan('COMMAND EXAMPLES')}

   ${chalk.bold('Getting Started:')}
   ${chalk.cyan('$ locksmith init')}                          ${chalk.gray(
    'Interactive setup wizard'
  )}
   ${chalk.cyan('$ locksmith init --no-interactive')}         ${chalk.gray(
    'Non-interactive setup (all flags required)'
  )}

   ${chalk.bold('Configuration:')}
   ${chalk.cyan('$ locksmith configure auth')}                ${chalk.gray(
    'Interactive auth provider setup'
  )}
   ${chalk.cyan('$ locksmith configure llm')}                 ${chalk.gray(
    'Interactive LLM broker selection'
  )}
   ${chalk.cyan('$ locksmith configure llm --broker=claude')}  ${chalk.gray(
    'Set Claude as preferred LLM'
  )}

   ${chalk.bold('Module Management:')}
   ${chalk.cyan('$ locksmith add')}                           ${chalk.gray(
    'Interactive module selection'
  )}
   ${chalk.cyan('$ locksmith add --module=full-stack-auth')}  ${chalk.gray(
    'Add specific authentication module'
  )}

   ${chalk.bold('Code Generation:')}
   ${chalk.cyan('$ locksmith generate')}                      ${chalk.gray(
    'Generate configs for all modules'
  )}
   ${chalk.cyan('$ locksmith generate --module=sso')}         ${chalk.gray(
    'Generate SSO configuration only'
  )}

   ${chalk.bold('AI Tool Detection:')}
   ${chalk.cyan('$ locksmith check')}                         ${chalk.gray(
    'Check available AI tools'
  )}
   ${chalk.cyan('$ locksmith check --verbose')}               ${chalk.gray(
    'Show detailed tool information'
  )}
   ${chalk.cyan('$ locksmith check --quiet')}                 ${chalk.gray(
    'Check tools without output'
  )}

   ${chalk.bold('Advanced Usage:')}
   ${chalk.cyan('$ locksmith generate --dry-run')}            ${chalk.gray(
    'Preview changes without applying'
  )}
   ${chalk.cyan('$ locksmith generate --verbose')}             ${chalk.gray(
    'Show detailed generation process'
  )}
   ${chalk.cyan('$ locksmith --help --verbose')}               ${chalk.gray(
    'Show this detailed help'
  )}

   ${chalk.bold('Non-Interactive ScaleKit Setup:')}
   ${chalk.cyan('$ locksmith init --provider=scalekit \\\\')}
   ${chalk.white('  --environment-id=your-env-id \\\\')}
   ${chalk.white('  --client-id=your-client-id \\\\')}
   ${chalk.white('  --client-secret=your-secret \\\\')}
   ${chalk.white('  --environment-url=https://your-env.scalekit.cloud')}

   ${chalk.bold.cyan('GLOBAL FLAGS')}
   ${chalk.cyan('--help, -h')}           Show help information
   ${chalk.cyan('--version, -v')}        Show version number
   ${chalk.cyan('--verbose')}            Show detailed output
   ${chalk.cyan('--dry-run, -d')}        Preview changes without applying
   ${chalk.cyan('--force, -f')}          Skip confirmation prompts
   ${chalk.cyan('--interactive, -i')}    Force interactive mode (default)
   ${chalk.cyan('--no-interactive, -I')} Skip interactive prompts

   ${chalk.bold.cyan('TIPS')}
   • Use ${chalk.white('tab completion')} for faster command entry
   • Run ${chalk.white('locksmith <command> --help')} for command-specific help
   • Use ${chalk.white('--dry-run')} to safely preview any changes
   • Most commands support both ${chalk.white('interactive')} and ${chalk.white(
    'non-interactive'
  )} modes
   `;
}

/**
 * Generate contextual help based on partial command
 */
export function generateContextualHelp(partialCommand, flags = {}) {
  const command = partialCommand[0];
  const subcommand = partialCommand[1];

  switch (command) {
    case 'configure':
      return generateConfigureHelp(subcommand, flags);
    case 'init':
      return generateInitHelp(subcommand, flags);
    case 'generate':
      return generateGenerateHelp(flags);
    case 'add':
      return generateAddHelp(flags);
    default:
      return generateBasicHelp();
  }
}

/**
 * Command-specific help generators
 */
function generateConfigureHelp(subcommand, flags) {
  const { verbose = false } = flags;

  let help = chalk.bold.cyan('🔧 Configure Command Help\n\n');

  if (subcommand === 'auth') {
    help += `${chalk.bold('Configuring Authentication Provider')}\n\n`;
    help += `${chalk.cyan('Interactive mode:')} locksmith configure auth\n`;
    help += `${chalk.cyan(
      'Direct setup:'
    )} locksmith configure auth --provider=scalekit\n\n`;

    if (verbose) {
      help += `${chalk.bold('Supported Providers:')}\n`;
      help += `• ${chalk.white('scalekit')} - Enterprise authentication\n`;
      help += `• ${chalk.white('auth0')} - Universal identity platform\n`;
      help += `• ${chalk.white('fusionauth')} - Authentication server\n\n`;
    }
  } else if (subcommand === 'llm') {
    help += `${chalk.bold('Configuring LLM Broker')}\n\n`;
    help += `${chalk.cyan('Interactive mode:')} locksmith configure llm\n`;
    help += `${chalk.cyan(
      'Direct setup:'
    )} locksmith configure llm --broker=claude\n\n`;

    if (verbose) {
      help += `${chalk.bold('Supported Brokers:')}\n`;
      help += `• ${chalk.white('claude')} - Anthropic Claude CLI\n`;
      help += `• ${chalk.white('gemini')} - Google Gemini CLI\n`;
      help += `• ${chalk.white('cursor-agent')} - Cursor Agent\n\n`;
    }
  } else {
    help += `${chalk.bold('Available subcommands:')}\n`;
    help += `• ${chalk.white('auth')} - Configure authentication provider\n`;
    help += `• ${chalk.white('llm')} - Configure LLM broker\n\n`;
  }

  return help + chalk.gray(`Use --verbose for more details`);
}

function generateInitHelp(subcommand, flags) {
  const { verbose = false } = flags;

  let help = chalk.bold.cyan('🚀 Init Command Help\n\n');

  help += `${chalk.bold('Initialize authentication in your project')}\n\n`;
  help += `${chalk.cyan('Interactive setup:')} locksmith init\n`;
  help += `${chalk.cyan(
    'Non-interactive:'
  )} locksmith init --provider=scalekit [flags...]\n\n`;

  if (verbose) {
    help += `${chalk.bold('Required flags for non-interactive mode:')}\n`;
    help += `• ${chalk.white('--provider')} - Authentication provider\n`;
    help += `• ${chalk.white('--environment-id')} - ScaleKit environment ID\n`;
    help += `• ${chalk.white('--client-id')} - ScaleKit client ID\n`;
    help += `• ${chalk.white('--client-secret')} - ScaleKit client secret\n`;
    help += `• ${chalk.white(
      '--environment-url'
    )} - ScaleKit environment URL\n\n`;
  }

  return help + chalk.gray(`Use --verbose for more details`);
}

function generateGenerateHelp(flags) {
  const { verbose = false } = flags;

  let help = chalk.bold.cyan('⚙️ Generate Command Help\n\n');

  help += `${chalk.bold('Generate authentication configurations')}\n\n`;
  help += `${chalk.cyan('Generate all:')} locksmith generate\n`;
  help += `${chalk.cyan(
    'Generate specific:'
  )} locksmith generate --module=full-stack-auth\n\n`;

  if (verbose) {
    help += `${chalk.bold('Available modules:')}\n`;
    help += `• ${chalk.white(
      'full-stack-auth'
    )} - Complete authentication system\n`;
    help += `• ${chalk.white('sso')} - Enterprise SSO integration\n`;
    help += `• ${chalk.white(
      'mcp'
    )} - Model Context Protocol authentication\n\n`;

    help += `${chalk.bold('Output options:')}\n`;
    help += `• ${chalk.white(
      '--prompt-out=file.txt'
    )} - Save generation prompt to file\n`;
    help += `• ${chalk.white(
      '-O file.txt'
    )} - Save generation prompt to file (short form)\n`;
    help += `• ${chalk.white(
      '--dry-run'
    )} - Preview without generating files\n`;
    help += `• ${chalk.white(
      '--verbose'
    )} - Show detailed generation process\n\n`;
  }

  return help + chalk.gray(`Use --verbose for more details`);
}

function generateAddHelp(flags) {
  const { verbose = false } = flags;

  let help = chalk.bold.cyan('📦 Add Command Help\n\n');

  help += `${chalk.bold('Add authentication modules to your project')}\n\n`;
  help += `${chalk.cyan('Interactive selection:')} locksmith add\n`;
  help += `${chalk.cyan(
    'Add specific module:'
  )} locksmith add --module=full-stack-auth\n\n`;

  if (verbose) {
    help += `${chalk.bold('Available modules:')}\n`;
    help += `• ${chalk.white(
      'full-stack-auth'
    )} - Complete authentication system\n`;
    help += `• ${chalk.white('sso')} - Enterprise SSO integration\n`;
    help += `• ${chalk.white(
      'mcp'
    )} - Model Context Protocol authentication\n\n`;

    help += `${chalk.bold('Multiple modules:')}\n`;
    help += `${chalk.cyan(
      'Add multiple:'
    )} locksmith add --module=full-stack-auth --module=sso\n\n`;
  }

  return help + chalk.gray(`Use --verbose for more details`);
}
