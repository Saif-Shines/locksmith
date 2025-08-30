#!/usr/bin/env node

import { Listr } from 'listr2';
import chalk from 'chalk';

/**
 * Simple test script to demonstrate Listr2 task list functionality
 */

// Test task list
const testTasks = new Listr(
  [
    {
      title: '🔍 Checking system requirements',
      task: async (ctx) => {
        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, 500));
        ctx.systemCheck = true;
      },
    },
    {
      title: '📦 Installing dependencies',
      task: async (ctx) => {
        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, 800));
        ctx.dependencies = true;
      },
    },
    {
      title: '⚙️ Configuring settings',
      task: async (ctx) => {
        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, 300));
        ctx.configured = true;
      },
    },
    {
      title: '✅ Running final validation',
      task: async (ctx) => {
        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, 400));

        if (!ctx.systemCheck || !ctx.dependencies || !ctx.configured) {
          throw new Error('Validation failed');
        }
      },
    },
  ],
  {
    concurrent: false,
    rendererOptions: {
      collapse: false,
      showTimer: true,
      showSubtasks: true,
    },
  }
);

async function runTest() {
  console.log(chalk.green('🚀 Testing Listr2 Task List Integration\n'));

  try {
    const result = await testTasks.run();
    console.log(chalk.green('\n✅ All tasks completed successfully!'));
    console.log(chalk.blue('🎉 Your Listr2 integration is working perfectly!'));
  } catch (error) {
    console.error(chalk.red(`\n❌ Task failed: ${error.message}`));
  }
}

runTest();
