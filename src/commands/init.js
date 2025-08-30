import chalk from 'chalk';
import open from 'open';
import { saveCredentials, hasCredentials } from '../utils/config.js';
import {
  promptEnvironmentId,
  promptRemainingCredentials,
  confirmAction,
} from '../utils/prompts.js';

const SIGNUP_URL = 'https://auth.scalekit.cloud/a/auth/signup';

export async function handleInitCommand() {
  console.log(
    chalk.green('🚀 Initializing authentication in your project...\n')
  );

  // Check if credentials already exist
  if (hasCredentials()) {
    console.log(
      chalk.green("✅ You're all set! Your credentials are already configured.")
    );
    console.log(
      chalk.blue(
        '🔐 Credentials are stored securely in ~/.locksmith/credentials.json'
      )
    );
    return;
  }

  // Open signup URL
  console.log(chalk.cyan('🌐 Opening ScaleKit signup page in your browser...'));
  try {
    await open(SIGNUP_URL);
    console.log(chalk.green('✅ Browser opened successfully!'));
  } catch (error) {
    console.log(chalk.red('❌ Failed to open browser. Please visit manually:'));
    console.log(chalk.blue(SIGNUP_URL));
  }

  console.log(
    chalk.cyan(
      '\n📝 After completing signup, please provide your API credentials below.\n'
    )
  );

  // First, prompt for Environment ID
  const environmentId = await promptEnvironmentId();

  if (!environmentId) {
    console.log(chalk.red('❌ Environment ID is required.'));
    console.log(chalk.yellow('Please try again.'));
    return;
  }

  // Open settings URL with environment ID
  const settingsUrl = `https://app.scalekit.cloud/ws/environments/${environmentId}/settings/api-credentials`;
  console.log(chalk.cyan('🌐 Opening ScaleKit API credentials settings...'));
  try {
    await open(settingsUrl);
    console.log(chalk.green('✅ Settings page opened successfully!'));
    console.log(
      chalk.gray(
        '💡 Tip: If the page opens in a new tab, you can copy the URL to your existing tab'
      )
    );
  } catch (error) {
    console.log(
      chalk.red('❌ Failed to open settings page. Please visit manually:')
    );
    console.log(chalk.blue(settingsUrl));
  }

  // Prompt for remaining credentials
  const remainingCredentials = await promptRemainingCredentials();

  // Combine all credentials
  const credentials = {
    environmentId,
    ...remainingCredentials,
  };

  // Validate that all fields are provided
  const missing = Object.entries(credentials)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.log(
      chalk.red(`❌ Missing required credentials: ${missing.join(', ')}`)
    );
    console.log(chalk.yellow('Please try again with all required fields.'));
    return;
  }

  // Save credentials
  try {
    saveCredentials(credentials);
    console.log(chalk.green('\n✅ Credentials saved successfully!'));
    console.log(
      chalk.blue(
        '🔐 Your API credentials are stored securely in ~/.locksmith/credentials.json'
      )
    );
  } catch (error) {
    console.log(chalk.red(`❌ Failed to save credentials: ${error.message}`));
  }
}
