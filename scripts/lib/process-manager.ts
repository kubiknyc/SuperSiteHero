/**
 * Process Manager
 *
 * Cross-platform process management with graceful shutdown handling.
 * Works on Windows, Linux, and macOS.
 */

import chalk from 'chalk';

export type ShutdownHandler = () => Promise<void>;

export class ProcessManager {
  private shutdownHandlers: ShutdownHandler[] = [];
  private isShuttingDown = false;
  private cleanupComplete = false;

  constructor() {
    this.setupSignalHandlers();
  }

  /**
   * Register a shutdown handler that will be called on process termination
   */
  registerShutdownHandler(handler: ShutdownHandler): void {
    this.shutdownHandlers.push(handler);
  }

  /**
   * Remove a previously registered shutdown handler
   */
  unregisterShutdownHandler(handler: ShutdownHandler): void {
    const index = this.shutdownHandlers.indexOf(handler);
    if (index > -1) {
      this.shutdownHandlers.splice(index, 1);
    }
  }

  /**
   * Check if shutdown is in progress
   */
  isShuttingDownNow(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Manually trigger graceful shutdown
   */
  async initiateShutdown(exitCode: number = 1): Promise<void> {
    await this.handleShutdown(exitCode);
  }

  private setupSignalHandlers(): void {
    // Standard Unix signals
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];

    for (const signal of signals) {
      process.on(signal, () => {
        console.log(chalk.yellow(`\nReceived ${signal}, initiating graceful shutdown...`));
        this.handleShutdown(0);
      });
    }

    // Windows-specific: Handle CTRL+C via readline
    if (process.platform === 'win32') {
      try {
        const readline = require('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        rl.on('SIGINT', () => {
          console.log(chalk.yellow('\nReceived SIGINT (Ctrl+C), initiating graceful shutdown...'));
          this.handleShutdown(0);
        });

        // Prevent readline from consuming stdin when not interactive
        rl.on('close', () => {
          // Readline closed, this is fine
        });
      } catch (error) {
        // Readline setup failed, fall back to process.on which works in some cases
      }
    }

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error(chalk.red('\nUncaught exception:'), error);
      await this.handleShutdown(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      console.error(chalk.red('\nUnhandled promise rejection:'), reason);
      await this.handleShutdown(1);
    });

    // Handle beforeExit for cleanup
    process.on('beforeExit', async (code) => {
      if (!this.cleanupComplete) {
        await this.runShutdownHandlers();
      }
    });
  }

  private async handleShutdown(exitCode: number): Promise<void> {
    if (this.isShuttingDown) {
      console.log(chalk.yellow('Shutdown already in progress...'));
      return;
    }

    this.isShuttingDown = true;
    console.log(chalk.blue('\nRunning cleanup handlers...'));

    await this.runShutdownHandlers();

    console.log(chalk.blue('Cleanup complete. Exiting...'));
    process.exit(exitCode);
  }

  private async runShutdownHandlers(): Promise<void> {
    if (this.cleanupComplete) {
      return;
    }

    for (const handler of this.shutdownHandlers) {
      try {
        await Promise.race([
          handler(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Handler timeout')), 10000)
          ),
        ]);
      } catch (error) {
        console.error(chalk.red('Error in shutdown handler:'), error);
      }
    }

    this.cleanupComplete = true;
  }
}

/**
 * Kill a process tree (cross-platform)
 * Uses tree-kill to terminate the process and all its children
 */
export async function killProcessTree(pid: number): Promise<void> {
  const treeKillModule = await import('tree-kill');
  const treeKill = treeKillModule.default || treeKillModule;

  return new Promise((resolve) => {
    treeKill(pid, 'SIGTERM', (err: Error | undefined) => {
      if (err) {
        // Try SIGKILL as fallback on non-Windows
        if (process.platform !== 'win32') {
          treeKill(pid, 'SIGKILL', (err2: Error | undefined) => {
            if (err2) {
              console.error(chalk.yellow(`Could not kill process ${pid}:`, err2.message));
            }
            resolve(); // Resolve anyway, process might be already dead
          });
        } else {
          console.error(chalk.yellow(`Could not kill process ${pid}:`, err.message));
          resolve(); // Resolve anyway on Windows
        }
      } else {
        resolve();
      }
    });
  });
}

/**
 * Create a timeout promise that rejects after the specified time
 */
export function createTimeout(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

/**
 * Run a function with a timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  return Promise.race([
    fn(),
    createTimeout(timeoutMs, timeoutMessage),
  ]);
}

// Singleton instance for global process management
let globalProcessManager: ProcessManager | null = null;

export function getProcessManager(): ProcessManager {
  if (!globalProcessManager) {
    globalProcessManager = new ProcessManager();
  }
  return globalProcessManager;
}
