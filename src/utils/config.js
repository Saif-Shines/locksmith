import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

const CONFIG_DIR = path.join(os.homedir(), '.locksmith');
const CONFIG_FILE = path.join(CONFIG_DIR, 'credentials.json');

export function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function saveCredentials(credentials) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(credentials, null, 2));
}

export function loadCredentials() {
  if (!fs.existsSync(CONFIG_FILE)) {
    return null;
  }
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(
      chalk.red('❌ We had trouble reading your stored credentials:'),
      chalk.gray(error.message)
    );
    return null;
  }
}

export function hasCredentials() {
  return fs.existsSync(CONFIG_FILE);
}

export function getCredentials() {
  const credentials = loadCredentials();
  if (!credentials) {
    console.error(chalk.red("❌ No credentials found. Let's get you set up!"));
    console.log(
      chalk.cyan('💡 Run ') +
        chalk.white.bold('locksmith init') +
        chalk.cyan(' to configure your authentication providers.')
    );
    process.exit(1);
  }
  return credentials;
}
