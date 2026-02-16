/**
 * Config command - Manage CLI configuration.
 */

import chalk from "chalk";
import { loadConfig, saveConfig, type PromptDevConfig } from "../utils.js";

interface ConfigOptions {
  show?: boolean;
  set?: string;
  reset?: boolean;
}

export async function configCommand(options: ConfigOptions): Promise<void> {
  if (options.reset) {
    saveConfig({
      projectDir: "",
      backendPort: 8080,
      frontendPort: 3000,
      dbPort: 5432,
      repoUrl: "",
      branch: "main",
      autoUpdate: true,
    });
    console.log(chalk.green("Configuration reset to defaults"));
    return;
  }

  if (options.set) {
    const [key, value] = options.set.split("=");
    if (!key || value === undefined) {
      console.error(chalk.red("Invalid format. Use: --set key=value"));
      process.exit(1);
    }

    const config = loadConfig();
    const configKey = key as keyof PromptDevConfig;

    if (!(configKey in config)) {
      console.error(chalk.red(`Unknown config key: ${key}`));
      console.log(chalk.dim(`  Valid keys: ${Object.keys(config).join(", ")}`));
      process.exit(1);
    }

    // Type-aware setting
    const currentValue = config[configKey];
    if (typeof currentValue === "number") {
      (config as Record<string, unknown>)[configKey] = Number.parseInt(value, 10);
    } else if (typeof currentValue === "boolean") {
      (config as Record<string, unknown>)[configKey] = value === "true";
    } else {
      (config as Record<string, unknown>)[configKey] = value;
    }

    saveConfig(config);
    console.log(chalk.green(`  ${key} = ${value}`));
    return;
  }

  // Default: show config
  const config = loadConfig();
  console.log(chalk.bold("\n⚙️  PromptDev Configuration\n"));

  for (const [key, value] of Object.entries(config)) {
    const displayValue =
      value === "" ? chalk.dim("(not set)") : chalk.cyan(String(value));
    console.log(`  ${chalk.dim(key.padEnd(16))} ${displayValue}`);
  }
  console.log();
}
