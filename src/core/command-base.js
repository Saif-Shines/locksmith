import chalk from 'chalk';
import { shouldUseInteractive } from '../utils/interactive/interactive.js';

/**
 * Standardized command handler base class
 * Provides common patterns for all command handlers
 */
export class CommandHandler {
  constructor(options = {}) {
    this.options = options;
    this.useInteractive = shouldUseInteractive({
      interactive: options.interactive,
      noInteractive: options.noInteractive,
    });
  }

  /**
   * Extract common flags from options
   */
  extractCommonFlags() {
    const {
      dryRun,
      verbose,
      force,
      interactive,
      noInteractive,
      ...otherFlags
    } = this.options;

    return {
      dryRun: dryRun || false,
      verbose: verbose || false,
      force: force || false,
      interactive: interactive || false,
      noInteractive: noInteractive || false,
      otherFlags,
    };
  }

  /**
   * Standardized success message
   */
  showSuccess(message, details = null) {
    console.log(chalk.green(`✅ ${message}`));
    if (details) {
      console.log(chalk.gray(`   ${details}`));
    }
  }

  /**
   * Standardized info message
   */
  showInfo(message, details = null) {
    console.log(chalk.cyan(`💡 ${message}`));
    if (details) {
      console.log(chalk.gray(`   ${details}`));
    }
  }

  /**
   * Standardized error message with suggestion
   */
  showError(message, suggestion = null) {
    console.log(chalk.red(`❌ ${message}`));
    if (suggestion) {
      console.log(chalk.cyan(`💡 ${suggestion}`));
    }
  }

  /**
   * Standardized warning message
   */
  showWarning(message, details = null) {
    console.log(chalk.yellow(`⚠️  ${message}`));
    if (details) {
      console.log(chalk.gray(`   ${details}`));
    }
  }

  /**
   * Check if dry run mode is enabled
   */
  isDryRun() {
    return this.options.dryRun || false;
  }

  /**
   * Check if verbose mode is enabled
   */
  isVerbose() {
    return this.options.verbose || false;
  }

  /**
   * Check if force mode is enabled
   */
  isForce() {
    return this.options.force || false;
  }

  /**
   * Handle command validation errors consistently
   */
  handleValidationError(message, suggestion) {
    this.showError(message, suggestion);
    return false; // Return false to indicate validation failure
  }

  /**
   * Handle unexpected errors consistently
   */
  handleUnexpectedError(error, context = '') {
    const contextMsg = context ? ` during ${context}` : '';
    console.error(
      chalk.red(`❌ Unexpected error${contextMsg}:`),
      error.message
    );

    if (this.isVerbose()) {
      console.error(chalk.gray('Stack trace:'), error.stack);
    }

    console.log(chalk.cyan('💡 Try running with --verbose for more details'));
    return false;
  }

  /**
   * Log dry run actions
   */
  logDryRun(action, details = null) {
    console.log(chalk.blue(`🔍 [DRY RUN] Would ${action}`));
    if (details && this.isVerbose()) {
      console.log(chalk.gray(`   Details: ${details}`));
    }
  }

  /**
   * Log verbose information
   */
  logVerbose(message, details = null) {
    if (this.isVerbose()) {
      console.log(chalk.gray(`🔍 ${message}`));
      if (details) {
        console.log(chalk.gray(`   ${details}`));
      }
    }
  }
}

/**
 * Standardized command result wrapper
 */
export class CommandResult {
  constructor(success = false, message = '', data = null) {
    this.success = success;
    this.message = message;
    this.data = data;
  }

  static success(message = '', data = null) {
    return new CommandResult(true, message, data);
  }

  static failure(message = '', data = null) {
    return new CommandResult(false, message, data);
  }
}
