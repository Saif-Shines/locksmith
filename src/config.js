export const CLI_CONFIG = {
  name: 'locksmith',
  version: '0.0.2',
  description:
    'Seamlessly add authentication infrastructure to AI applications',
  homepage: 'https://saifshines.dev/notes/locksmith-cli/',
  brandColor: '#36BB82',
};

export const COMMANDS = {
  init: { desc: 'Initialize authentication in your project' },
  add: { desc: 'Add authentication providers' },
  generate: { desc: 'Generate secrets and configs' },
};

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
