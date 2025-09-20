import chalk from "chalk";
import {
  detectToolsWithTaskList,
  detectTools,
  hasAnyTools,
} from "../utils/core/detection.js";
import {
  displaySuccessBox,
  displayWarningBox,
} from "../utils/display/display.js";

/**
 * Handle check command to detect available AI tools
 * @param {Object} flags - CLI flags
 */
export async function handleCheckCommand(flags = {}) {
  const { verbose = false } = flags;

  try {
    console.log(chalk.cyan("🔍 Checking available AI tools..."));
    console.log("");

    let results;

    // Use task list for detailed progress or simple detection for quiet mode
    results = await detectToolsWithTaskList(verbose);
    displayToolResults(results, verbose);

    return results;
  } catch (error) {
    console.error(chalk.red(`❌ Failed to check AI tools: ${error.message}`));
    if (verbose) {
      console.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }
}

/**
 * Display tool detection results in a formatted way
 * @param {Object} results - Detection results
 * @param {boolean} verbose - Show detailed output
 */
function displayToolResults(results, verbose = false) {
  const availableTools = [];
  const unavailableTools = [];

  Object.entries(results).forEach(([tool, available]) => {
    const toolInfo = getToolInfo(tool);
    if (available) {
      availableTools.push(toolInfo);
    } else {
      unavailableTools.push(toolInfo);
    }
  });

  if (availableTools.length > 0) {
    displaySuccessBox(
      "✅ Available AI Tools",
      availableTools
        .map((tool) => `${tool.icon} ${tool.name} - ${tool.desc}`)
        .join("\n"),
      { width: 70 }
    );
  }

  // Display unavailable tools
  if (unavailableTools.length > 0) {
    if (verbose) {
      displayWarningBox(
        "❌ Unavailable AI Tools",
        unavailableTools
          .map((tool) => `${tool.icon} ${tool.name} - ${tool.desc}`)
          .join("\n"),
        { width: 70 }
      );
    } else {
      console.log(
        chalk.gray(
          `\n📝 ${unavailableTools.length} tools not installed (use --verbose to see details)`
        )
      );
    }
  }

  // Summary
  const total = availableTools.length + unavailableTools.length;
  console.log(
    chalk.cyan(
      `\n🎯 Summary: ${availableTools.length}/${total} AI tools available`
    )
  );

  // Suggestions
  if (availableTools.length === 0) {
    console.log(
      chalk.yellow(
        "\n💡 No AI tools detected. Install one of these to use Locksmith's AI features:"
      )
    );
    console.log(chalk.white("   • Claude Code: https://claude.ai/downloads"));
    console.log(
      chalk.white("   • Gemini CLI: https://ai.google.dev/gemini-api/docs/cli")
    );
    console.log(chalk.white("   • Cursor Agent: https://cursor.sh/"));
  } else if (verbose) {
    console.log(
      chalk.green(
        "\n🚀 You can now use these tools with Locksmith's generate command!"
      )
    );
  }
}

function getToolInfo(tool) {
  const toolMap = {
    claude: {
      name: "Claude Code",
      desc: "Anthropic's AI assistant with code capabilities",
      icon: "🤖",
      command: "claude",
    },
    gemini: {
      name: "Gemini CLI",
      desc: "Google's Gemini AI via command line",
      icon: "✨",
      command: "gemini",
    },
    cursor: {
      name: "Cursor Agent",
      desc: "AI-powered code editor and agent",
      icon: "🎯",
      command: "cursor-agent",
    },
  };

  return (
    toolMap[tool] || {
      name: tool,
      desc: "AI tool",
      icon: "🔧",
      command: tool,
    }
  );
}
