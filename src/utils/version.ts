/*
 * Adopted from https://github.com/openai/codex/blob/main/codex-cli/src/utils/check-updates.ts
 * and https://github.com/openai/codex/blob/main/codex-cli/src/utils/package-manager-detector.ts
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import process from 'node:process';
import chalk from 'chalk';
import type { AgentName } from 'package-manager-detector';
import { getLatestVersion } from 'fast-npm-meta';
import { getUserAgent } from 'package-manager-detector';
import which from 'which';
import semver from 'semver';
// Read the version directly from package.json.
import pkg from '../../package.json' with { type: 'json' };

interface UpdateCheckInfo {
  currentVersion: string;
  latestVersion: string;
}

interface UpdateOptions {
  manager: AgentName;
  packageName: string;
}

export const CLI_VERSION: string = (pkg as { version: string }).version;

function isInstalled(manager: AgentName): boolean {
  try {
    which.sync(manager);
    return true;
  } catch {
    return false;
  }
}

function getGlobalBinDir(manager: AgentName): string | undefined {
  if (!isInstalled(manager)) {
    return;
  }

  try {
    switch (manager) {
      case 'npm': {
        const stdout = execFileSync('npm', ['prefix', '-g'], {
          encoding: 'utf-8',
        });
        return join(stdout.trim(), 'bin');
      }

      case 'pnpm': {
        // pnpm bin -g prints the bin dir
        const stdout = execFileSync('pnpm', ['bin', '-g'], {
          encoding: 'utf-8',
        });
        return stdout.trim();
      }

      case 'bun': {
        // bun pm bin -g prints your bun global bin folder
        const stdout = execFileSync('bun', ['pm', 'bin', '-g'], {
          encoding: 'utf-8',
        });
        return stdout.trim();
      }

      default:
        return undefined;
    }
  } catch {
    // ignore
  }

  return undefined;
}

function detectInstallerByPath(): AgentName | undefined {
  const invoked = process.argv[1] && resolve(process.argv[1]);
  if (!invoked) {
    return;
  }

  const supportedManagers: Array<AgentName> = ['npm', 'pnpm', 'bun'];

  for (const mgr of supportedManagers) {
    const binDir = getGlobalBinDir(mgr);
    if (binDir && invoked.startsWith(binDir)) {
      return mgr;
    }
  }

  return undefined;
}

function renderUpdateCommand({ manager, packageName }: UpdateOptions): string {
  const updateCommands: Record<AgentName, string> = {
    npm: `npm install -g ${packageName}`,
    pnpm: `pnpm add -g ${packageName}`,
    bun: `bun add -g ${packageName}`,
    /** Only works in yarn@v1 */
    yarn: `yarn global add ${packageName}`,
    deno: `deno install -g npm:${packageName}`,
  };

  return updateCommands[manager];
}

function renderUpdateMessage(options: UpdateOptions) {
  const updateCommand = renderUpdateCommand(options);
  return `To update, run ${chalk.magenta(updateCommand)}`;
}

async function getUpdateCheckInfo(
  packageName: string
): Promise<UpdateCheckInfo | undefined> {
  const metadata = await getLatestVersion(packageName, {
    force: true,
    throw: false,
  });

  if ('error' in metadata || !metadata?.version) {
    return;
  }

  return {
    currentVersion: CLI_VERSION,
    latestVersion: metadata.version,
  };
}

export async function checkForUpdates(): Promise<string | undefined> {
  // Fetch current vs latest from the registry
  const packageName: string = pkg.name;
  assert(packageName != null);
  const packageInfo = await getUpdateCheckInfo(packageName);

  if (
    !packageInfo ||
    !semver.gt(packageInfo.latestVersion, packageInfo.currentVersion)
  ) {
    return;
  }

  // Detect global installer
  let managerName = detectInstallerByPath();

  // Fallback to the local package manager
  if (!managerName) {
    const local: AgentName | null = getUserAgent();
    if (!local) {
      // No package managers found, skip it.
      return;
    }
    managerName = local;
  }

  const updateMessage = renderUpdateMessage({
    manager: managerName,
    packageName,
  });

  const message: string = `\
Update available! ${chalk.red(packageInfo.currentVersion)} → ${chalk.green(
    packageInfo.latestVersion
  )}.\n${updateMessage}`;

  return message;
}
