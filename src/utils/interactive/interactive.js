import inquirer from 'inquirer';
import chalk from 'chalk';

/**
 * Prompts user for input only if interactive mode is enabled
 * @param {boolean} interactive - Whether interactive mode is enabled
 * @param {string} question - The question to ask
 * @param {any} defaultValue - Default value if not interactive
 * @param {object} options - Additional inquirer options
 * @returns {Promise<any>} The user input or default value
 */
export async function promptIfInteractive(
  interactive,
  question,
  defaultValue,
  options = {}
) {
  if (!interactive) {
    return defaultValue;
  }

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'value',
      message: question,
      default: defaultValue,
      ...options,
      prefix: chalk.cyan('❓'),
    },
  ]);

  return answers.value;
}

/**
 * Prompts user to select from a list only if interactive mode is enabled
 * @param {boolean} interactive - Whether interactive mode is enabled
 * @param {string} question - The question to ask
 * @param {Array} choices - Array of choices
 * @param {any} defaultValue - Default value if not interactive
 * @param {object} options - Additional inquirer options
 * @returns {Promise<any>} The selected value or default value
 */
export async function selectIfInteractive(
  interactive,
  question,
  choices,
  defaultValue,
  options = {}
) {
  if (!interactive) {
    return defaultValue;
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'value',
      message: question,
      choices,
      default: defaultValue,
      ...options,
      prefix: chalk.cyan('📋'),
    },
  ]);

  return answers.value;
}

/**
 * Prompts user for confirmation only if interactive mode is enabled
 * @param {boolean} interactive - Whether interactive mode is enabled
 * @param {string} question - The question to ask
 * @param {boolean} defaultValue - Default value if not interactive
 * @returns {Promise<boolean>} The confirmation result or default value
 */
export async function confirmIfInteractive(
  interactive,
  question,
  defaultValue = false
) {
  if (!interactive) {
    return defaultValue;
  }

  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: question,
      default: defaultValue,
      prefix: chalk.yellow('❓'),
    },
  ]);

  return answers.confirmed;
}

/**
 * Determines if interactive mode should be used based on flags
 * @param {object} options - Command options containing interactive and noInteractive flags
 * @returns {boolean} Whether to run in interactive mode
 */
export function shouldUseInteractive(options = {}) {
  const { interactive, noInteractive } = options;

  // Explicit flags take precedence
  if (interactive) return true;
  if (noInteractive) return false;

  // Default behavior: interactive for commands that support it
  return true;
}

/**
 * Gets the effective value, preferring explicit values over interactive defaults
 * @param {any} explicitValue - Explicitly provided value
 * @param {any} interactiveDefault - Default value from interactive prompt
 * @param {any} fallbackDefault - Fallback default value
 * @returns {any} The effective value to use
 */
export function getEffectiveValue(
  explicitValue,
  interactiveDefault,
  fallbackDefault
) {
  if (explicitValue !== undefined && explicitValue !== null) {
    return explicitValue;
  }
  if (interactiveDefault !== undefined && interactiveDefault !== null) {
    return interactiveDefault;
  }
  return fallbackDefault;
}
