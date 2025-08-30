import chalk from 'chalk';
import { CLI_CONFIG } from '../../config_alias.js';

/**
 * Enhanced error handler with recovery suggestions
 */
export class CLIError extends Error {
  constructor(message, code = 'GENERAL_ERROR', suggestions = []) {
    super(message);
    this.code = code;
    this.suggestions = suggestions;
  }
}

/**
 * Display enhanced error messages with recovery steps
 */
export function displayError(error, context = {}) {
  const { command, flags, showHelp = true } = context;

  console.log(chalk.red(`❌ ${error.message}`));

  if (error.suggestions && error.suggestions.length > 0) {
    console.log(chalk.cyan('\n💡 Quick fixes:'));
    error.suggestions.forEach((suggestion, index) => {
      console.log(chalk.white(`   ${index + 1}. ${suggestion}`));
    });
  }

  if (showHelp) {
    console.log(
      chalk.cyan('\n💡 For help, run: ') +
        chalk.white.bold(`${CLI_CONFIG.name} --help`)
    );

    if (command) {
      console.log(
        chalk.cyan('   or: ') +
          chalk.white.bold(`${CLI_CONFIG.name} ${command} --help`)
      );
    }
  }
}

/**
 * Common error scenarios with predefined recovery steps
 */
export const ErrorScenarios = {
  MISSING_CREDENTIALS: (provider = 'scalekit') =>
    new CLIError(
      'Authentication credentials not found',
      'MISSING_CREDENTIALS',
      [
        `Run: ${CLI_CONFIG.name} init`,
        `Run: ${CLI_CONFIG.name} configure auth --provider=${provider}`,
        'Check if ~/.locksmith/credentials.json exists',
      ]
    ),

  INVALID_PROVIDER: (provider) =>
    new CLIError(
      `Provider "${provider}" is not supported or not configured`,
      'INVALID_PROVIDER',
      [
        `Run: ${CLI_CONFIG.name} init (for interactive setup)`,
        `Run: ${CLI_CONFIG.name} configure auth --interactive`,
        'Supported providers: scalekit, auth0, fusionauth',
      ]
    ),

  MISSING_REQUIRED_FLAGS: (command, missingFlags) =>
    new CLIError(
      `Missing required flags: ${missingFlags.join(', ')}`,
      'MISSING_REQUIRED_FLAGS',
      [
        `Run: ${CLI_CONFIG.name} ${command} --interactive`,
        `Run: ${CLI_CONFIG.name} ${command} --help (to see all options)`,
        'Use --no-interactive=false to enable interactive mode',
      ]
    ),

  NETWORK_ERROR: (operation) =>
    new CLIError(`Network error during ${operation}`, 'NETWORK_ERROR', [
      'Check your internet connection',
      'Verify API endpoints are accessible',
      'Try again in a few moments',
    ]),

  PERMISSION_DENIED: (resource) =>
    new CLIError(
      `Permission denied accessing ${resource}`,
      'PERMISSION_DENIED',
      [
        'Check file permissions',
        'Ensure you have write access to the directory',
        'Try running with elevated permissions if appropriate',
      ]
    ),

  CONFIGURATION_INVALID: (issues) =>
    new CLIError('Configuration validation failed', 'CONFIGURATION_INVALID', [
      'Run: locksmith init (to reconfigure)',
      'Check ~/.locksmith/credentials.json',
      `Issues found: ${issues.join(', ')}`,
    ]),
};

/**
 * Handle async operations with enhanced error handling
 */
export async function withErrorHandling(operation, context = {}) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof CLIError) {
      displayError(error, context);
    } else {
      // Handle unexpected errors
      console.log(chalk.red(`❌ Unexpected error: ${error.message}`));
      console.log(
        chalk.cyan('💡 For help, run: ') +
          chalk.white.bold(`${CLI_CONFIG.name} --help`)
      );

      if (context.verbose) {
        console.log(chalk.gray(`\nStack trace:`));
        console.log(chalk.gray(error.stack));
      }
    }
    process.exit(1);
  }
}

/**
 * Validate common CLI scenarios
 */
export function validateCommand(command, flags = {}) {
  const errors = [];

  // Check for conflicting flags
  if (flags.interactive && flags.noInteractive) {
    errors.push('Cannot use both --interactive and --no-interactive');
  }

  if (flags.dryRun && flags.force) {
    errors.push('Cannot use both --dry-run and --force');
  }

  if (errors.length > 0) {
    throw new CLIError('Invalid flag combination', 'INVALID_FLAGS', errors);
  }

  return true;
}
