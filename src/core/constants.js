/**
 * Centralized constants for the Locksmith CLI
 * This file contains all application-wide constants to avoid duplication
 */

// Authentication Providers
export const SUPPORTED_PROVIDERS = ['scalekit', 'auth0', 'fusionauth'];

// LLM Brokers
export const AVAILABLE_BROKERS = ['gemini', 'claude', 'cursor-agent'];
export const DEFAULT_BROKER = 'gemini';

// Configuration Formats
export const SUPPORTED_FORMATS = ['json', 'yaml', 'env'];
export const DEFAULT_FORMAT = 'json';
export const DEFAULT_COUNT = 1;

// URLs and Endpoints
export const SCALEKIT_LOGIN_URL = 'https://auth.scalekit.cloud/a/auth/login';

// Provider-specific settings
export const PROVIDER_SETTINGS = {
  scalekit: {
    name: 'ScaleKit',
    available: true,
    loginUrl: SCALEKIT_LOGIN_URL,
    settingsUrlTemplate:
      'https://app.scalekit.cloud/ws/environments/{environmentId}/settings/api-credentials',
  },
  auth0: {
    name: 'Auth0',
    available: false,
    description: 'Coming soon',
  },
  fusionauth: {
    name: 'FusionAuth',
    available: false,
    description: 'Coming soon',
  },
};

// Broker-specific settings
export const BROKER_SETTINGS = {
  gemini: {
    name: 'Gemini',
    command: 'gemini',
    available: true,
  },
  claude: {
    name: 'Claude',
    command: 'claude',
    available: true,
  },
  'cursor-agent': {
    name: 'Cursor Agent',
    command: 'cursor-agent',
    available: true,
  },
};

// Validation patterns
export const VALIDATION_PATTERNS = {
  environmentId: /^[a-zA-Z0-9_-]+$/,
  clientId: /^[a-zA-Z0-9_-]+$/,
  url: /^https?:\/\/.+$/,
};

// File extensions for formats
export const FORMAT_EXTENSIONS = {
  json: '.json',
  yaml: '.yaml',
  yml: '.yml',
  env: '.env',
};

// Exit codes
export const EXIT_CODES = {
  SUCCESS: 0,
  ERROR: 1,
  VALIDATION_ERROR: 2,
  CONFIG_ERROR: 3,
};

// Common messages
export const MESSAGES = {
  CONFIG_SAVED: 'Configuration saved successfully',
  CONFIG_LOADED: 'Configuration loaded successfully',
  DRY_RUN_NOTICE: 'This is a dry run - no changes will be made',
  VERBOSE_MODE: 'Verbose mode enabled',
  INTERACTIVE_CANCELLED: 'Operation cancelled by user',
};
