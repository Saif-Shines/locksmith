import readline from 'readline';
import chalk from 'chalk';

export function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

export function question(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

export async function promptCredentials() {
  const rl = createInterface();

  console.log(
    chalk.cyan('\n🔑 Please enter your API credentials from ScaleKit:\n')
  );

  const environmentId = await question(rl, chalk.yellow('Environment ID: '));
  const clientId = await question(rl, chalk.yellow('Client ID: '));
  const clientSecret = await question(rl, chalk.yellow('Client Secret: '));
  const environmentUrl = await question(rl, chalk.yellow('Environment URL: '));

  rl.close();

  return {
    environmentId: environmentId.trim(),
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim(),
    environmentUrl: environmentUrl.trim(),
  };
}

export async function promptEnvironmentId() {
  const rl = createInterface();

  console.log(
    chalk.cyan('\n🔑 Please enter your Environment ID from ScaleKit:\n')
  );

  const environmentId = await question(rl, chalk.yellow('Environment ID: '));
  rl.close();

  return environmentId.trim();
}

export async function promptRemainingCredentials() {
  const rl = createInterface();

  console.log(
    chalk.cyan(
      '\n🔑 Please enter the remaining API credentials from ScaleKit:\n'
    )
  );

  const clientId = await question(rl, chalk.yellow('Client ID: '));
  const clientSecret = await question(rl, chalk.yellow('Client Secret: '));
  const environmentUrl = await question(rl, chalk.yellow('Environment URL: '));

  rl.close();

  return {
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim(),
    environmentUrl: environmentUrl.trim(),
  };
}

export async function confirmAction(message) {
  const rl = createInterface();
  const answer = await question(rl, chalk.yellow(`${message} (y/N): `));
  rl.close();
  return answer.toLowerCase().startsWith('y');
}
