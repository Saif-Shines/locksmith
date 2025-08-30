import { execSync } from 'child_process';
import os from 'os';
import { startSpinner } from '../display/spinner.js';
import { createToolDetectionTasks, runTasks } from '../display/task-list.js';
import chalk from 'chalk';

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
 * Detect tools with progress indicator
 */
export function detectToolsWithProgress(verbose = false) {
  if (verbose) {
    // Skip spinner for verbose mode
    return detectTools();
  }

  const spinner = startSpinner('TOOL_DETECTION');

  try {
    const results = {
      claude: hasClaudeCode(),
      gemini: hasGemini(),
      cursor: hasCursor(),
    };

    const availableCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;

    if (availableCount > 0) {
      spinner.succeed(`Detected ${availableCount}/${totalCount} AI tools`);
    } else {
      spinner.warn(`No AI tools detected (${totalCount} checked)`);
    }

    return results;
  } catch (error) {
    spinner.fail('Failed to detect AI tools');
    throw error;
  }
}

/**
 * Check if any AI tools are available
 */
export function hasAnyTools() {
  const tools = detectTools();
  return tools.claude || tools.gemini || tools.cursor;
}

/**
 * Detect tools using Listr2 task list
 * @param {boolean} verbose - Whether to show detailed output
 * @returns {Promise<Object>} - Detection results
 */
export async function detectToolsWithTaskList(verbose = false) {
  try {
    const detectionTasks = createToolDetectionTasks(verbose);
    const results = await runTasks(detectionTasks, {
      successMessage: 'Tool detection completed',
      failMessage: 'Tool detection failed',
    });

    return results;
  } catch (error) {
    console.error(chalk.red(`❌ Tool detection failed: ${error.message}`));
    throw error;
  }
}
