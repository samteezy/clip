#!/usr/bin/env node

import { parseArgs } from "node:util";
import { writeFileSync } from "node:fs";
import { loadConfig, generateExampleConfig } from "./config/index.js";
import { createProxy } from "./proxy.js";

const { values, positionals } = parseArgs({
  options: {
    config: {
      type: "string",
      short: "c",
      default: "clip.config.json",
    },
    init: {
      type: "boolean",
      description: "Generate an example configuration file",
    },
    help: {
      type: "boolean",
      short: "h",
    },
  },
  allowPositionals: true,
});

function printHelp(): void {
  console.log(`
CLIP - CLIP Lightens Inference Processing

A transparent MCP proxy with response compression.

Usage:
  clip [options]
  clip --init              Generate example config file

Options:
  -c, --config <path>  Path to configuration file (default: clip.config.json)
  --init               Generate an example configuration file
  -h, --help           Show this help message

Configuration:
  CLIP reads its configuration from a JSON file. Use --init to generate
  an example configuration file that you can customize.

Example:
  # Generate example config
  clip --init

  # Start proxy with default config
  clip

  # Start proxy with custom config
  clip -c /path/to/config.json

For more information, see: https://github.com/samteezy/clip
`);
}

async function main(): Promise<void> {
  if (values.help) {
    printHelp();
    process.exit(0);
  }

  if (values.init) {
    const configPath = positionals[0] || "clip.config.json";
    const exampleConfig = generateExampleConfig();
    writeFileSync(configPath, JSON.stringify(exampleConfig, null, 2));
    console.log(`Generated example configuration: ${configPath}`);
    console.log("\nEdit this file to configure your upstream MCP servers.");
    process.exit(0);
  }

  // Load configuration
  let config;
  try {
    config = loadConfig(values.config as string);
  } catch (error) {
    console.error(`Error loading configuration: ${error instanceof Error ? error.message : error}`);
    console.error(`\nRun 'clip --init' to generate an example configuration.`);
    process.exit(1);
  }

  // Create and start proxy
  const proxy = await createProxy(config);

  // Handle shutdown
  const shutdown = async () => {
    console.log("\nShutting down...");
    await proxy.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    await proxy.start();
  } catch (error) {
    console.error("Failed to start proxy:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
