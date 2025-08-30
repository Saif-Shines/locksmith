import ora from 'ora';

/**
 * Centralized spinner configurations and utilities
 * Provides consistent spinner styling and behavior across the application
 */

// Base spinner configuration
const BASE_SPINNER_CONFIG = {
  spinner: 'dots',
  color: 'cyan',
};

// Specific spinner configurations for different operations
export const SPINNER_CONFIGS = {
  // Tool detection
  TOOL_DETECTION: {
    ...BASE_SPINNER_CONFIG,
    text: '🔍 Detecting available AI tools...',
    color: 'cyan',
  },

  // Setup and validation
  SETUP_VALIDATION: {
    ...BASE_SPINNER_CONFIG,
    text: '🔍 Validating Locksmith setup...',
    color: 'blue',
  },

  CREDENTIAL_VALIDATION: {
    ...BASE_SPINNER_CONFIG,
    text: '🔐 Validating authentication credentials...',
    color: 'blue',
  },

  // Provider and broker operations
  PROVIDER_SELECTION: {
    ...BASE_SPINNER_CONFIG,
    text: '🔍 Selecting authentication provider...',
    color: 'blue',
  },

  BROKER_GENERATION: {
    ...BASE_SPINNER_CONFIG,
    text: '🚀 Generating configurations with {broker}...',
    color: 'green',
  },

  // Module operations
  MODULE_SELECTION: {
    ...BASE_SPINNER_CONFIG,
    text: '📦 Selecting authentication modules...',
    color: 'cyan',
  },

  MODULE_CONFIRMATION: {
    ...BASE_SPINNER_CONFIG,
    text: '📋 Preparing module configuration...',
    color: 'yellow',
  },

  MODULE_SAVING: {
    ...BASE_SPINNER_CONFIG,
    text: '💾 Saving authentication modules...',
    color: 'green',
  },

  // Browser and external operations
  BROWSER_SIGNUP: {
    ...BASE_SPINNER_CONFIG,
    text: '🌐 Opening ScaleKit signup page...',
    color: 'cyan',
  },

  BROWSER_CREDENTIALS: {
    ...BASE_SPINNER_CONFIG,
    text: '🔐 Opening API credentials page...',
    color: 'cyan',
  },

  // Credential operations
  ENVIRONMENT_COLLECTION: {
    ...BASE_SPINNER_CONFIG,
    text: '🔑 Collecting environment ID...',
    color: 'yellow',
  },

  CREDENTIAL_COLLECTION: {
    ...BASE_SPINNER_CONFIG,
    text: '📝 Collecting API credentials...',
    color: 'green',
  },

  CONFIG_SAVING: {
    ...BASE_SPINNER_CONFIG,
    text: '💾 Saving authentication configuration...',
    color: 'green',
  },

  // Redirect operations
  REDIRECT_CONFIG: {
    ...BASE_SPINNER_CONFIG,
    text: '🔗 Configuring redirect URLs...',
    color: 'cyan',
  },
};

/**
 * Creates a spinner with the given configuration
 * @param {Object} config - Spinner configuration
 * @param {Object} options - Additional options
 * @returns {ora.Ora} - Ora spinner instance
 */
export function createSpinner(config, options = {}) {
  return ora({
    ...config,
    ...options,
  });
}

/**
 * Creates and starts a spinner for a specific operation type
 * @param {string} operationType - Key from SPINNER_CONFIGS
 * @param {Object} options - Additional options (text overrides, etc.)
 * @returns {ora.Ora} - Started Ora spinner instance
 */
export function startSpinner(operationType, options = {}) {
  const config = SPINNER_CONFIGS[operationType];

  if (!config) {
    throw new Error(`Unknown spinner operation type: ${operationType}`);
  }

  // Handle dynamic text replacement (e.g., for broker names)
  let text = config.text;
  if (options.replacements) {
    Object.entries(options.replacements).forEach(([key, value]) => {
      text = text.replace(`{${key}}`, value);
    });
  }

  return createSpinner(
    {
      ...config,
      text: options.text || text,
    },
    options
  ).start();
}

/**
 * Creates a spinner for broker-specific operations
 * @param {string} broker - The broker name (claude, gemini, cursor)
 * @param {string} operation - The operation type
 * @returns {ora.Ora} - Started Ora spinner instance
 */
export function startBrokerSpinner(broker, operation = 'generation') {
  const operationType =
    operation === 'generation' ? 'BROKER_GENERATION' : 'BROKER_GENERATION';

  return startSpinner(operationType, {
    replacements: { broker },
  });
}

/**
 * Utility function to handle spinner success/failure states
 * @param {ora.Ora} spinner - The spinner instance
 * @param {boolean} success - Whether the operation succeeded
 * @param {string} successText - Success message
 * @param {string} failText - Failure message
 * @returns {ora.Ora} - The spinner instance
 */
export function completeSpinner(spinner, success, successText, failText) {
  if (success) {
    return spinner.succeed(successText);
  } else {
    return spinner.fail(failText);
  }
}

/**
 * Handles async operations with spinner
 * @param {Function} operation - Async function to execute
 * @param {string} operationType - Spinner operation type
 * @param {Object} options - Spinner options
 * @returns {Promise} - Result of the operation
 */
export async function withSpinner(operation, operationType, options = {}) {
  const spinner = startSpinner(operationType, options);

  try {
    const result = await operation();
    spinner.succeed(options.successText || 'Operation completed successfully');
    return result;
  } catch (error) {
    spinner.fail(options.failText || 'Operation failed');
    throw error;
  }
}

// Convenience functions for common operations
export const spinners = {
  // Tool detection
  toolDetection: () => startSpinner('TOOL_DETECTION'),

  // Setup operations
  setupValidation: () => startSpinner('SETUP_VALIDATION'),
  credentialValidation: () => startSpinner('CREDENTIAL_VALIDATION'),

  // Provider operations
  providerSelection: () => startSpinner('PROVIDER_SELECTION'),

  // Module operations
  moduleSelection: () => startSpinner('MODULE_SELECTION'),
  moduleConfirmation: () => startSpinner('MODULE_CONFIRMATION'),
  moduleSaving: () => startSpinner('MODULE_SAVING'),

  // Browser operations
  browserSignup: () => startSpinner('BROWSER_SIGNUP'),
  browserCredentials: () => startSpinner('BROWSER_CREDENTIALS'),

  // Credential operations
  environmentCollection: () => startSpinner('ENVIRONMENT_COLLECTION'),
  credentialCollection: () => startSpinner('CREDENTIAL_COLLECTION'),
  configSaving: () => startSpinner('CONFIG_SAVING'),

  // Redirect operations
  redirectConfig: () => startSpinner('REDIRECT_CONFIG'),

  // Broker operations
  brokerGeneration: (broker) => startBrokerSpinner(broker, 'generation'),
};
