import inquirer from 'inquirer';
import chalk from 'chalk';
import { PROVIDER_SETTINGS } from '../../core/constants.js';

export async function promptCredentials() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'environmentId',
      message: 'Environment ID:',
      validate: (input) => input.trim() !== '' || 'Environment ID is required',
    },
    {
      type: 'input',
      name: 'clientId',
      message: 'Client ID:',
      validate: (input) => input.trim() !== '' || 'Client ID is required',
    },
    {
      type: 'input',
      name: 'clientSecret',
      message: 'Client Secret:',
      validate: (input) => input.trim() !== '' || 'Client Secret is required',
    },
    {
      type: 'input',
      name: 'environmentUrl',
      message: 'Environment URL:',
      validate: (input) => input.trim() !== '' || 'Environment URL is required',
    },
  ]);

  return {
    environmentId: answers.environmentId.trim(),
    clientId: answers.clientId.trim(),
    clientSecret: answers.clientSecret.trim(),
    environmentUrl: answers.environmentUrl.trim(),
  };
}

export async function promptEnvironmentId() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'environmentId',
      message: 'Environment ID:',
      validate: (input) => input.trim() !== '' || 'Environment ID is required',
      prefix: chalk.cyan('🔑'),
    },
  ]);

  return answers.environmentId.trim();
}

export async function promptRemainingCredentials() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'clientId',
      message: 'Client ID:',
      validate: (input) => input.trim() !== '' || 'Client ID is required',
      prefix: chalk.cyan('🔑'),
    },
    {
      type: 'input',
      name: 'clientSecret',
      message: 'Client Secret:',
      validate: (input) => input.trim() !== '' || 'Client Secret is required',
      prefix: chalk.cyan('🔑'),
    },
    {
      type: 'input',
      name: 'environmentUrl',
      message: 'Environment URL:',
      validate: (input) => input.trim() !== '' || 'Environment URL is required',
      prefix: chalk.cyan('🔑'),
    },
  ]);

  return {
    clientId: answers.clientId.trim(),
    clientSecret: answers.clientSecret.trim(),
    environmentUrl: answers.environmentUrl.trim(),
  };
}

export async function promptAuthProvider() {
  const providers = Object.entries(PROVIDER_SETTINGS).map(
    ([key, settings]) => ({
      name: settings.name,
      value: key,
      available: settings.available,
    })
  );

  const choices = providers.map((provider) => ({
    name: `${provider.name} - ${
      provider.available
        ? chalk.green('✅ Available')
        : chalk.yellow('🚧 Coming Soon')
    }`,
    value: provider.value,
    short: provider.name,
  }));

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Select the auth provider you want to use:',
      choices,
      prefix: chalk.cyan('🔐'),
      pageSize: 6,
    },
  ]);

  const selectedProvider = providers.find((p) => p.value === answers.provider);

  if (!selectedProvider.available) {
    console.log(
      chalk.yellow(
        `\n🚧 ${selectedProvider.name} integration is coming soon - we're working hard on it!`
      )
    );
    console.log(
      chalk.cyan(
        '💡 Want to help prioritize this? Let us know on our GitHub issues page.'
      )
    );
    console.log(
      chalk.green('For now, please select ScaleKit to continue with setup.\n')
    );

    // Recursively prompt again
    return await promptAuthProvider();
  }

  return answers.provider;
}

export async function confirmAction(message) {
  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: false,
      prefix: chalk.yellow('❓'),
    },
  ]);

  return answers.confirmed;
}
