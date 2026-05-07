/**
 * Start command - Start all PromptDev services.
 */

import chalk from "chalk";
import inquirer from "inquirer";
import { existsSync } from "node:fs";
import { join } from "node:path";
import ora from "ora";
import {
  applyEnvToProcess,
  getMissingEnvKeys,
  loadEnvFile,
  REQUIRED_ENV_KEYS,
  resolveEnvFilePath,
  SECRET_ENV_KEYS,
  upsertEnvFile,
} from "../env.js";
import {
  exec,
  execSafe,
  getProjectDir,
  isPortInUse,
  spawnDetached,
} from "../utils.js";

interface StartOptions {
  service?: string;
  detach: boolean;
  directory?: string;
  envFile?: string;
}

type ServiceName = "db" | "frontend";

async function startDatabase(): Promise<boolean> {
  const spinner = ora("Starting PostgreSQL...").start();

  if (isPortInUse(5432)) {
    spinner.succeed("PostgreSQL already running on port 5432");
    return true;
  }

  // Try podman first, then docker
  const hasPodman = execSafe("which podman") !== null;
  if (hasPodman) {
    try {
      // Check if container exists
      const existing = execSafe(
        'podman ps -a --filter name=promptdev-db --format "{{.ID}}"',
      );
      if (existing) {
        exec("podman start promptdev-db");
      } else {
        exec(
          "podman run -d --name promptdev-db -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=promptdev postgres:16",
        );
      }
      spinner.succeed("PostgreSQL started via Podman");
      return true;
    } catch {
      spinner.fail("Failed to start PostgreSQL via Podman");
      return false;
    }
  }

  const hasDocker = execSafe("which docker") !== null;
  if (hasDocker) {
    try {
      // Check if container exists
      const existing = execSafe(
        'docker ps -a --filter name=promptdev-db --format "{{.ID}}"',
      );
      if (existing) {
        exec("docker start promptdev-db");
      } else {
        exec(
          "docker run -d --name promptdev-db -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=promptdev postgres:16",
        );
      }
      spinner.succeed("PostgreSQL started via Docker");
      return true;
    } catch {
      spinner.fail("Failed to start PostgreSQL via Docker");
      return false;
    }
  }

  spinner.fail("PostgreSQL not running and Podman/Docker not available");
  console.log(chalk.yellow("  Please start PostgreSQL manually on port 5432"));
  return false;
}

async function startFrontend(
  projectDir: string,
  detach: boolean,
): Promise<boolean> {
  const spinner = ora("Starting frontend...").start();
  const frontendDir = join(projectDir, "promptdev-frontend");

  if (!existsSync(frontendDir)) {
    spinner.fail("Frontend directory not found");
    return false;
  }

  if (isPortInUse(3000)) {
    spinner.succeed("Frontend already running on port 3000");
    return true;
  }

  // Ensure node:sqlite is available for the Copilot SDK CLI process
  const [major] = process.versions.node.split(".").map(Number);
  if (
    major < 25 &&
    !process.env.NODE_OPTIONS?.includes("--experimental-sqlite")
  ) {
    process.env.NODE_OPTIONS =
      `${process.env.NODE_OPTIONS ?? ""} --experimental-sqlite`.trim();
  }

  if (detach) {
    const logFile = join(projectDir, ".promptdev", "frontend.log");
    spawnDetached("pnpm", ["dev"], frontendDir, logFile);
    spinner.succeed("Frontend starting in background (port 3000)");
  } else {
    try {
      exec("pnpm dev &", frontendDir);
      spinner.succeed("Frontend started on port 3000");
    } catch {
      spinner.fail("Failed to start frontend");
      return false;
    }
  }

  return true;
}

const SERVICE_STARTERS: Record<
  ServiceName,
  (dir: string, detach: boolean) => Promise<boolean>
> = {
  db: () => startDatabase(),
  frontend: startFrontend,
};

async function ensureRequiredEnv(
  projectDir: string,
  envFile?: string,
): Promise<void> {
  const envFilePath = resolveEnvFilePath(projectDir, envFile);
  const fileEnv = loadEnvFile(envFilePath);

  if (Object.keys(fileEnv).length === 0 && !existsSync(envFilePath)) {
    console.log(
      chalk.yellow(
        `\n⚠️  No env file found at ${envFilePath}. A new one will be created.`,
      ),
    );
  }

  applyEnvToProcess(fileEnv);

  const mergedEnv: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...fileEnv, ...process.env })) {
    if (v !== undefined) mergedEnv[k] = v;
  }
  const missing = getMissingEnvKeys(REQUIRED_ENV_KEYS, mergedEnv);
  if (missing.length === 0) {
    return;
  }

  console.log(
    chalk.yellow(
      `\n⚠️  Missing required environment values: ${missing.join(", ")}`,
    ),
  );

  const answers = await inquirer.prompt(
    missing.map((key) => ({
      type: SECRET_ENV_KEYS.has(key) ? "password" : "input",
      name: key,
      message: `Enter ${key}:`,
      mask: SECRET_ENV_KEYS.has(key) ? "*" : undefined,
      validate: (value: string) =>
        value.trim().length > 0 ? true : `${key} is required`,
    })),
  );

  const updates: Record<string, string> = {};
  for (const key of missing) {
    updates[key] = String(answers[key]).trim();
  }

  upsertEnvFile(envFilePath, updates);
  applyEnvToProcess(updates);
  console.log(chalk.green(`Saved missing values to ${envFilePath}`));
}

export async function startCommand(options: StartOptions): Promise<void> {
  console.log(chalk.bold("\n⚡ Starting PromptDev\n"));

  const projectDir = getProjectDir(options.directory);

  if (!options.service || options.service !== "db") {
    await ensureRequiredEnv(projectDir, options.envFile);
  }

  if (options.service) {
    const svc = options.service as ServiceName;
    if (!(svc in SERVICE_STARTERS)) {
      console.error(chalk.red(`Unknown service: ${svc}. Valid: db, frontend`));
      process.exit(1);
    }
    await SERVICE_STARTERS[svc](projectDir, options.detach);
  } else {
    // Start all services in order
    await startDatabase();
    // Wait a bit for DB to be ready
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await startFrontend(projectDir, options.detach);
  }

  console.log(chalk.green("\n\u2705 Services started\n"));
  console.log(`  Frontend: ${chalk.cyan("http://localhost:3000")}`);
  console.log();
}
