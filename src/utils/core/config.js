import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import Conf from 'conf';

const CONFIG_DIR = path.join(os.homedir(), '.locksmith');

// Initialize conf instances for each config file
// Note: Schema validation removed to avoid JSON schema compatibility issues
// The conf library provides atomic writes and better error handling without schemas
const credentialsConfig = new Conf({
  projectName: 'locksmith',
  projectSuffix: '',
  cwd: os.homedir(),
  configName: 'credentials',
  fileExtension: 'json',
  defaults: {},
  clearInvalidConfig: true,
});

const toolsConfig = new Conf({
  projectName: 'locksmith',
  projectSuffix: '',
  cwd: os.homedir(),
  configName: 'llm-brokers',
  fileExtension: 'json',
  defaults: {
    detectedAt: null,
    tools: {},
    version: '1.1',
  },
  clearInvalidConfig: true,
});

const authModulesConfig = new Conf({
  projectName: 'locksmith',
  projectSuffix: '',
  cwd: os.homedir(),
  configName: 'auth-modules',
  fileExtension: 'json',
  defaults: {
    selectedModules: [],
    selectedAt: null,
    version: '1.0',
  },
  clearInvalidConfig: true,
});

// Legacy file paths for backward compatibility checks
const CONFIG_FILE = path.join(CONFIG_DIR, 'credentials.json');
const TOOLS_FILE = path.join(CONFIG_DIR, 'llm-brokers.json');
const AUTH_MODULES_FILE = path.join(CONFIG_DIR, 'auth-modules.json');

export function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function saveCredentials(credentials) {
  try {
    // Store credentials using conf library
    credentialsConfig.set('credentials', credentials);
    credentialsConfig.set('savedAt', new Date().toISOString());

    // Force write to disk to ensure file is created
    // This is a workaround since conf library may not immediately write
    ensureConfigDir();
    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify(
        {
          credentials,
          savedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error(
      chalk.red('❌ We had trouble saving your credentials:'),
      chalk.gray(error.message)
    );
    throw error;
  }
}

export function loadCredentials() {
  try {
    return credentialsConfig.get('credentials', null);
  } catch (error) {
    console.error(
      chalk.red('❌ We had trouble reading your stored credentials:'),
      chalk.gray(error.message)
    );
    return null;
  }
}

export function hasCredentials() {
  // First check if the actual file exists
  if (!fs.existsSync(CONFIG_FILE)) {
    return false;
  }

  // Then check if we have actual credentials data
  const credentials = credentialsConfig.get('credentials', null);
  return credentials !== null && Object.keys(credentials).length > 0;
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
  try {
    toolsConfig.set('detectedAt', new Date().toISOString());
    toolsConfig.set('tools', tools);
    toolsConfig.set('version', '1.0');
  } catch (error) {
    console.error(
      chalk.red('❌ We had trouble saving your tool detection:'),
      chalk.gray(error.message)
    );
    throw error;
  }
}

export function savePreferredBroker(broker) {
  try {
    // Update preferred broker
    toolsConfig.set('preferredBroker', broker);
    toolsConfig.set('version', '1.1');
    // Also update the detectedAt timestamp
    toolsConfig.set('detectedAt', new Date().toISOString());
  } catch (error) {
    console.error(
      chalk.red('❌ We had trouble saving your preferred broker:'),
      chalk.gray(error.message)
    );
    throw error;
  }
}

export function loadPreferredBroker() {
  try {
    return toolsConfig.get('preferredBroker', null);
  } catch (error) {
    return null;
  }
}

export function loadToolDetection() {
  try {
    const config = {};
    // Build the config object from individual keys
    config.detectedAt = toolsConfig.get('detectedAt', null);
    config.tools = toolsConfig.get('tools', {});
    config.version = toolsConfig.get('version', '1.1');
    config.preferredBroker = toolsConfig.get('preferredBroker', null);

    // Return null if no data exists
    if (!config.detectedAt && Object.keys(config.tools).length === 0) {
      return null;
    }

    return config;
  } catch (error) {
    console.error(
      chalk.red('❌ We had trouble reading your stored tool detection:'),
      chalk.gray(error.message)
    );
    return null;
  }
}

export function hasToolDetection() {
  const tools = toolsConfig.get('tools', {});
  return Object.keys(tools).length > 0;
}

export function saveAuthModules(modules, additionalConfig = {}) {
  try {
    authModulesConfig.set('selectedModules', modules);
    authModulesConfig.set('selectedAt', new Date().toISOString());
    authModulesConfig.set('version', '1.0');

    // Store additional config properties
    Object.keys(additionalConfig).forEach((key) => {
      authModulesConfig.set(key, additionalConfig[key]);
    });
  } catch (error) {
    console.error(
      chalk.red('❌ We had trouble saving your auth modules:'),
      chalk.gray(error.message)
    );
    throw error;
  }
}

export function loadAuthModules() {
  try {
    const config = {};
    // Build the config object from individual keys
    config.selectedModules = authModulesConfig.get('selectedModules', []);
    config.selectedAt = authModulesConfig.get('selectedAt', null);
    config.version = authModulesConfig.get('version', '1.0');
    config.callbackUri = authModulesConfig.get('callbackUri', null);

    // Return null if no data exists
    if (!config.selectedAt && config.selectedModules.length === 0) {
      return null;
    }

    return config;
  } catch (error) {
    console.error(
      chalk.red('❌ We had trouble reading your stored auth modules:'),
      chalk.gray(error.message)
    );
    return null;
  }
}

export function hasAuthModules() {
  const modules = authModulesConfig.get('selectedModules', []);
  return modules.length > 0;
}

export function getAuthModules() {
  const modules = loadAuthModules();
  if (!modules) {
    return [];
  }
  return modules.selectedModules || [];
}

export function getAuthModulesConfig() {
  return loadAuthModules();
}

export function getCallbackUri() {
  return authModulesConfig.get('callbackUri', null);
}
