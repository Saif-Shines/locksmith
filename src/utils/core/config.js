import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

const CONFIG_DIR = path.join(os.homedir(), '.locksmith');
const CONFIG_FILE = path.join(CONFIG_DIR, 'credentials.json');
const TOOLS_FILE = path.join(CONFIG_DIR, 'tools.json');

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

export function saveToolDetection(tools) {
  ensureConfigDir();
  const toolConfig = {
    detectedAt: new Date().toISOString(),
    tools: tools,
    version: '1.0',
  };
  fs.writeFileSync(TOOLS_FILE, JSON.stringify(toolConfig, null, 2));
}

export function savePreferredBroker(broker) {
  ensureConfigDir();

  // Load existing tool detection or create new
  let existingConfig = loadToolDetection() || {
    detectedAt: new Date().toISOString(),
    tools: {},
    version: '1.1',
  };

  // Update with preferred broker
  existingConfig.preferredBroker = broker;
  existingConfig.version = '1.1';

  fs.writeFileSync(TOOLS_FILE, JSON.stringify(existingConfig, null, 2));
}

export function loadPreferredBroker() {
  try {
    const toolConfig = loadToolDetection();
    return toolConfig?.preferredBroker || null;
  } catch (error) {
    return null;
  }
}

export function loadToolDetection() {
  if (!fs.existsSync(TOOLS_FILE)) {
    return null;
  }
  try {
    const data = fs.readFileSync(TOOLS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(
      chalk.red('❌ We had trouble reading your stored tool detection:'),
      chalk.gray(error.message)
    );
    return null;
  }
}

export function hasToolDetection() {
  return fs.existsSync(TOOLS_FILE);
}
