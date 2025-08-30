import fs from 'fs';
import path from 'path';
import os from 'os';

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
    console.error('Error loading credentials:', error.message);
    return null;
  }
}

export function hasCredentials() {
  return fs.existsSync(CONFIG_FILE);
}

export function getCredentials() {
  const credentials = loadCredentials();
  if (!credentials) {
    console.error('No credentials found. Please run `locksmith init` first.');
    process.exit(1);
  }
  return credentials;
}
