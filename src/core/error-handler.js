import chalk from 'chalk';
import { CLI_CONFIG } from '../config_alias.js';

/**
 * Centralized error handling for commands
 */
export class ErrorHandler {
  static handleCommandError(error, commandName = '', options = {}) {
    const { verbose = false, showStack = false } = options;

    console.error(chalk.red('❌ Oops! Something went wrong:'), error.message);

    if (commandName) {
      console.log(chalk.gray(`Command: ${commandName}`));
    }

    if (verbose && showStack && error.stack) {
      console.error(chalk.gray('\nStack trace:'));
      console.error(chalk.gray(error.stack));
    }

    this.showHelpSuggestion();
  }

  static handleValidationError(message, suggestion = null) {
    console.log(chalk.red(`❌ ${message}`));
    if (suggestion) {
      console.log(chalk.cyan(`💡 ${suggestion}`));
    }
  }

  static handleConfigurationError(message, context = null) {
    console.log(chalk.red(`❌ Configuration error: ${message}`));
    if (context) {
      console.log(chalk.gray(`   Context: ${context}`));
    }
    this.showHelpSuggestion();
  }

  static handleFileSystemError(error, operation = '') {
    const op = operation ? ` during ${operation}` : '';
    console.log(chalk.red(`❌ File system error${op}:`), error.message);
    this.showHelpSuggestion();
  }

  static handleNetworkError(error, operation = '') {
    const op = operation ? ` during ${operation}` : '';
    console.log(chalk.red(`❌ Network error${op}:`), error.message);
    console.log(chalk.cyan('💡 Check your internet connection and try again'));
  }

  static showHelpSuggestion() {
    console.log(
      chalk.cyan('💡 Try running ') +
        chalk.white.bold(`${CLI_CONFIG.name} --help`) +
        chalk.cyan(' for available commands and options.')
    );
  }

  static showCommandHelp(command) {
    console.log(
      chalk.cyan('💡 Try running ') +
        chalk.white.bold(`${CLI_CONFIG.name} ${command} --help`) +
        chalk.cyan(' for command-specific help.')
    );
  }

  /**
   * Wrap async command handlers with consistent error handling
   */
  static async withErrorHandling(commandFn, commandName = '', options = {}) {
    try {
      const result = await commandFn();
      return result;
    } catch (error) {
      this.handleCommandError(error, commandName, options);

      // Re-throw for the main error handler if needed
      if (options.rethrow) {
        throw error;
      }

      return false;
    }
  }
}
