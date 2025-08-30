import { execSync } from 'child_process';
import os from 'os';

/**
 * Simple command existence check
 */
function commandExists(cmd) {
  try {
    const checkCmd =
      os.platform() === 'win32' ? `where ${cmd}` : `which ${cmd}`;
    execSync(checkCmd, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect Claude Code
 */
export function hasClaudeCode() {
  return commandExists('claude');
}

/**
 * Detect Gemini
 */
export function hasGemini() {
  return commandExists('gemini');
}

/**
 * Detect Cursor
 */
export function hasCursor() {
  return commandExists('cursor-agent');
}

/**
 * Get all detections
 */
export function detectTools() {
  return {
    claude: hasClaudeCode(),
    gemini: hasGemini(),
    cursor: hasCursor(),
  };
}

/**
 * Check if any AI tools are available
 */
export function hasAnyTools() {
  const tools = detectTools();
  return tools.claude || tools.gemini || tools.cursor;
}
