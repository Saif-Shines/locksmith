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
  check: { desc: 'Check available AI tools (claude, gemini, cursor-agent)' },
};
