// Boolean flags for modes
export const MODE_FLAGS = {
  dryRun: {
    type: 'boolean',
    desc: 'Show what would be done without doing it',
    shortFlag: 'd',
  },
  verbose: {
    type: 'boolean',
    desc: 'Show detailed output',
    shortFlag: 'v',
  },
  force: {
    type: 'boolean',
    desc: 'Skip confirmation prompts',
    shortFlag: 'f',
  },
  interactive: {
    type: 'boolean',
    desc: 'Run in interactive mode',
    default: true,
    shortFlag: 'i',
  },
  noInteractive: {
    type: 'boolean',
    desc: 'Skip interactive prompts',
    shortFlag: 'I',
  },
};

// Value flags
export const VALUE_FLAGS = {
  provider: {
    type: 'string',
    desc: 'Authentication provider (scalekit, auth0, fusionauth)',
    shortFlag: 'p',
  },
  output: {
    type: 'string',
    desc: 'Output file path',
    shortFlag: 'o',
  },

  value: {
    type: 'string',
    desc: 'Configuration value to set',
    shortFlag: 'V',
  },
  environmentId: {
    type: 'string',
    desc: 'ScaleKit environment ID',
    shortFlag: 'e',
  },
  clientId: {
    type: 'string',
    desc: 'ScaleKit client ID',
    shortFlag: 'c',
  },
  clientSecret: {
    type: 'string',
    desc: 'ScaleKit client secret',
    shortFlag: 's',
  },
  environmentUrl: {
    type: 'string',
    desc: 'ScaleKit environment URL',
    shortFlag: 'u',
  },
  broker: {
    type: 'string',
    desc: 'Preferred LLM broker (gemini, claude, cursor-agent)',
    shortFlag: 'b',
  },
  redirects: {
    type: 'boolean',
    desc: 'Configure redirect URLs in authentication provider',
    shortFlag: 'r',
  },
};

// Global flags (available for all commands)
export const FLAGS = {
  version: {
    desc: 'Show version number',
    type: 'boolean',
    shortFlag: 'v',
  },
  help: {
    desc: 'Show this help message',
    type: 'boolean',
    shortFlag: 'h',
  },
  // Include all mode flags
  ...MODE_FLAGS,
  // Include all value flags
  ...VALUE_FLAGS,
};
