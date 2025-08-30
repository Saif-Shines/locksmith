import { Listr } from 'listr2';
import chalk from 'chalk';

/**
 * Centralized task list utilities using Listr2
 * Provides consistent task list styling and behavior across the application
 */

// Default Listr2 configuration
const DEFAULT_CONFIG = {
  concurrent: false,
  exitOnError: true,
  rendererOptions: {
    collapse: false,
    collapseSkips: false,
    showSkipMessage: true,
    showTimer: true,
    showSubtasks: true,
    removeEmptyLines: false,
  },
};

/**
 * Creates a task list for tool detection workflows
 * @param {boolean} verbose - Whether to show detailed output
 * @returns {Listr} - Configured task list
 */
export function createToolDetectionTasks(verbose = false) {
  return new Listr(
    [
      {
        title: '🔍 Detecting Claude Code',
        task: async (ctx) => {
          const { hasClaudeCode } = await import('../core/detection.js');
          ctx.claude = hasClaudeCode();
        },
      },
      {
        title: '🔍 Detecting Gemini CLI',
        task: async (ctx) => {
          const { hasGemini } = await import('../core/detection.js');
          ctx.gemini = hasGemini();
        },
      },
      {
        title: '🔍 Detecting Cursor Agent',
        task: async (ctx) => {
          const { hasCursor } = await import('../core/detection.js');
          ctx.cursor = hasCursor();
        },
      },
      {
        title: '📊 Analyzing detection results',
        task: async (ctx) => {
          const available = Object.values(ctx).filter(Boolean).length;
          const total = Object.keys(ctx).length;

          if (available === 0) {
            throw new Error(`No AI tools detected (${total} checked)`);
          }

          console.log(
            chalk.green(`✅ Detected ${available}/${total} AI tools`)
          );
        },
      },
    ],
    {
      ...DEFAULT_CONFIG,
      rendererOptions: {
        ...DEFAULT_CONFIG.rendererOptions,
        collapse: !verbose,
      },
    }
  );
}

/**
 * Creates a task list for configuration workflows
 * @param {Object} options - Configuration options
 * @returns {Listr} - Configured task list
 */
export function createConfigTasks(options) {
  const { provider, useInteractive } = options;

  return new Listr(
    [
      {
        title: '🔍 Detecting available AI tools',
        task: async (ctx) => {
          const detectionTasks = createToolDetectionTasks(options.verbose);
          ctx.detectedTools = await detectionTasks.run();
        },
      },
      {
        title: '🤖 Configuring LLM broker preferences',
        task: async (ctx) => {
          const { handleBrokerConfiguration } = await import(
            '../../commands/configure.js'
          );
          const broker = await handleBrokerConfiguration(
            ctx.detectedTools,
            options
          );

          if (!broker) {
            throw new Error('Broker configuration failed or was cancelled');
          }

          ctx.selectedBroker = broker;
        },
      },
      {
        title: '🔧 Setting up authentication provider',
        task: async (ctx) => {
          const { handleProviderSetup } = await import(
            '../../commands/configure.js'
          );
          await handleProviderSetup(provider, useInteractive);
        },
      },
      {
        title: '💾 Saving configuration',
        task: async (ctx) => {
          const { saveConfiguration } = await import(
            '../../commands/configure.js'
          );
          await saveConfiguration(ctx.selectedBroker, ctx.detectedTools);
        },
      },
    ],
    DEFAULT_CONFIG
  );
}

/**
 * Creates a task list for code generation workflows
 * @param {Object} options - Generation options
 * @returns {Listr} - Configured task list
 */
export function createGenerationTasks(options) {
  const { module, broker, useInteractive } = options;

  return new Listr(
    [
      {
        title: '🔍 Validating authentication modules',
        task: async (ctx) => {
          const { validateModuleSelection } = await import(
            '../../commands/generate.js'
          );
          const result = await validateModuleSelection(options);

          if (!result.shouldContinue) {
            throw new Error(result.error || 'Module validation failed');
          }

          ctx.selectedModules = result.selectedModules;
        },
      },
      {
        title: '🤖 Preparing LLM broker for generation',
        task: async (ctx) => {
          const { prepareBroker } = await import('../../commands/generate.js');
          ctx.brokerInstance = await prepareBroker(broker);
        },
      },
      {
        title: '📝 Generating authentication code',
        task: async (ctx) => {
          const { generateAuthCode } = await import(
            '../../commands/generate.js'
          );
          ctx.generatedCode = await generateAuthCode(
            ctx.selectedModules,
            ctx.brokerInstance
          );
        },
      },
      {
        title: '💾 Writing generated files',
        task: async (ctx) => {
          const { writeGeneratedFiles } = await import(
            '../../commands/generate.js'
          );
          await writeGeneratedFiles(ctx.generatedCode, options.output);
        },
      },
    ],
    DEFAULT_CONFIG
  );
}

/**
 * Utility function to run tasks with error handling
 * @param {Listr} taskList - The task list to run
 * @param {Object} options - Additional options
 * @returns {Promise} - Task execution result
 */
export async function runTasks(taskList, options = {}) {
  try {
    const result = await taskList.run();
    if (options.successMessage) {
      console.log(chalk.green(`✅ ${options.successMessage}`));
    }
    return result;
  } catch (error) {
    console.error(chalk.red(`❌ Task failed: ${error.message}`));
    if (options.failMessage) {
      console.log(chalk.yellow(`💡 ${options.failMessage}`));
    }
    throw error;
  }
}
