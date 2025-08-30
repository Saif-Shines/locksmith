import logSymbols from 'log-symbols';

/**
 * Centralized symbols utility for consistent terminal output
 * Combines log-symbols with custom symbols for Locksmith-specific operations
 */

// Base log symbols from log-symbols package
export const LOG_SYMBOLS = {
  info: logSymbols.info, // ℹ
  success: logSymbols.success, // ✔
  warning: logSymbols.warning, // ⚠
  error: logSymbols.error, // ✖
};

// Custom symbols for specific operations
export const CUSTOM_SYMBOLS = {
  // Detection and scanning
  search: '🔍',
  detect: '🔍',
  scan: '🔎',

  // Configuration and setup
  config: '⚙️',
  settings: '🔧',
  setup: '🚀',

  // Authentication and security
  auth: '🔐',
  lock: '🔒',
  key: '🔑',
  shield: '🛡️',

  // Data operations
  save: '💾',
  load: '📂',
  upload: '📤',
  download: '📥',

  // Modules and packages
  module: '📦',
  package: '📦',
  box: '📦',

  // Network and external operations
  browser: '🌐',
  link: '🔗',
  redirect: '🔀',

  // User interaction
  prompt: '❓',
  confirm: '✅',
  cancel: '❌',

  // Status indicators
  check: '✓',
  cross: '✗',
  bullet: '•',
  arrow: '→',
  pointer: '👉',

  // Operations
  generate: '⚡',
  build: '🔨',
  run: '🏃',
  wait: '⏳',

  // Categories
  ai: '🤖',
  code: '💻',
  file: '📄',
  folder: '📁',
  database: '🗄️',
  cloud: '☁️',
  server: '🖥️',
};

// Combined symbols object with both log-symbols and custom symbols
export const SYMBOLS = {
  ...LOG_SYMBOLS,
  ...CUSTOM_SYMBOLS,
};

/**
 * Get a symbol with optional color
 * @param {string} symbolName - Name of the symbol
 * @param {string} color - Optional color (uses chalk if available)
 * @returns {string} - The symbol
 */
export function getSymbol(symbolName, color = null) {
  const symbol = SYMBOLS[symbolName];

  if (!symbol) {
    console.warn(`Symbol '${symbolName}' not found, using default`);
    return SYMBOLS.info;
  }

  return symbol;
}

/**
 * Create a formatted message with symbol
 * @param {string} symbolName - Name of the symbol
 * @param {string} message - The message text
 * @param {string} color - Optional color for the symbol
 * @returns {string} - Formatted message
 */
export function formatMessage(symbolName, message, color = null) {
  const symbol = getSymbol(symbolName);
  return `${symbol} ${message}`;
}

/**
 * Create a success message
 * @param {string} message - The message text
 * @returns {string} - Formatted success message
 */
export function successMessage(message) {
  return formatMessage('success', message);
}

/**
 * Create an error message
 * @param {string} message - The message text
 * @returns {string} - Formatted error message
 */
export function errorMessage(message) {
  return formatMessage('error', message);
}

/**
 * Create a warning message
 * @param {string} message - The message text
 * @returns {string} - Formatted warning message
 */
export function warningMessage(message) {
  return formatMessage('warning', message);
}

/**
 * Create an info message
 * @param {string} message - The message text
 * @returns {string} - Formatted info message
 */
export function infoMessage(message) {
  return formatMessage('info', message);
}

/**
 * Create a detection message
 * @param {string} message - The message text
 * @returns {string} - Formatted detection message
 */
export function detectMessage(message) {
  return formatMessage('detect', message);
}

/**
 * Create a saving message
 * @param {string} message - The message text
 * @returns {string} - Formatted saving message
 */
export function saveMessage(message) {
  return formatMessage('save', message);
}

/**
 * Create a configuration message
 * @param {string} message - The message text
 * @returns {string} - Formatted configuration message
 */
export function configMessage(message) {
  return formatMessage('config', message);
}

/**
 * Get symbol for operation type
 * @param {string} operation - The operation type
 * @returns {string} - The appropriate symbol
 */
export function getOperationSymbol(operation) {
  const symbolMap = {
    detect: 'detect',
    search: 'search',
    scan: 'scan',
    save: 'save',
    load: 'load',
    config: 'config',
    setup: 'setup',
    auth: 'auth',
    generate: 'generate',
    build: 'build',
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info',
  };

  return getSymbol(symbolMap[operation] || 'info');
}

// Export convenience functions for common operations
export const messages = {
  success: successMessage,
  error: errorMessage,
  warning: warningMessage,
  info: infoMessage,
  detect: detectMessage,
  save: saveMessage,
  config: configMessage,
};
