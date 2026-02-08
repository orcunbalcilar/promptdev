/**
 * Stop command - Stop all PromptDev services.
 */

import chalk from "chalk";
import ora from "ora";
import { execSafe, getProjectDir, getPidOnPort } from "../utils.js";

interface StopOptions {
  service?: string;
  directory?: string;
}

function stopOnPort(port: number, name: string): void {
  const spinner = ora(`Stopping ${name}...`).start();
  const pid = getPidOnPort(port);

  if (!pid) {
    spinner.info(`${name} is not running`);
    return;
  }

  try {
    execSafe(`kill ${pid}`);
    spinner.succeed(`${name} stopped (PID ${pid})`);
  } catch {
    // Force kill
    execSafe(`kill -9 ${pid}`);
    spinner.succeed(`${name} force killed (PID ${pid})`);
  }
}

function stopDocker(name: string): void {
  const spinner = ora("Stopping PostgreSQL (Docker)...").start();
  const result = execSafe(`docker stop ${name}`);
  if (result === null) {
    spinner.info("PostgreSQL Docker container not running");
  } else {
    spinner.succeed("PostgreSQL (Docker) stopped");
  }
}

export async function stopCommand(options: StopOptions): Promise<void> {
  console.log(chalk.bold("\n🛑 Stopping PromptDev\n"));

  getProjectDir(options.directory); // validate

  if (options.service) {
    switch (options.service) {
      case "backend":
        stopOnPort(8080, "Backend");
        break;
      case "frontend":
        stopOnPort(3000, "Frontend");
        break;
      case "db":
        stopDocker("promptdev-db");
        break;
      default:
        console.error(chalk.red(`Unknown service: ${options.service}`));
        process.exit(1);
    }
  } else {
    stopOnPort(3000, "Frontend");
    stopOnPort(8080, "Backend");
    stopDocker("promptdev-db");
  }

  console.log(chalk.green("\n✅ Services stopped\n"));
}
