export const CLI_CONFIG = {
  name: 'locksmith',
  version: '0.0.2',
  description:
    'Seamlessly add authentication infrastructure to AI applications',
  homepage: 'https://saifshines.dev/notes/locksmith-cli/',
  brandColor: '#36BB82',
};

export const COMMANDS = {
  init: {
    desc: 'Initialize authentication in your project (interactive)',
    subcommands: {
      auth: { desc: 'Configure authentication providers' },
    },
  },
  configure: {
    desc: 'Configure authentication settings',
    subcommands: {
      auth: { desc: 'Configure auth provider settings' },
      llm: {
        desc: 'Configure preferred LLM broker (gemini, claude, cursor-agent)',
      },
    },
  },
  add: { desc: 'Add authentication providers' },
  generate: { desc: 'Generate secrets and configs' },
};

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
  format: {
    type: 'string',
    desc: 'Output format',
    choices: ['json', 'yaml', 'env'],
    shortFlag: 'F',
  },
  count: {
    type: 'number',
    desc: 'Number of items to generate',
    shortFlag: 'n',
  },
  key: {
    type: 'string',
    desc: 'Configuration key to set',
    shortFlag: 'k',
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

export const ASCII_CONFIG = {
  font: 'Small',
  horizontalLayout: 'full',
  verticalLayout: 'full',
};

export const COLOR_PALETTE = {
  primary: '#36BB82',
  secondary: '#2563EB',
  accent: '#7C3AED',
  text: '#1F2937',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
};
