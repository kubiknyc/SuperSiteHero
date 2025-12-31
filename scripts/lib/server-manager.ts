/**
 * Server Manager
 *
 * Manages the Vite development server lifecycle with wait-on for readiness detection.
 * Cross-platform compatible with graceful shutdown.
 */

import chalk from 'chalk';
import { killProcessTree } from './process-manager.js';

type ExecaProcess = ReturnType<typeof import('execa').execa> extends Promise<infer R> ? R : never;

export interface ServerOptions {
  /** Server mode: 'dev' for development, 'preview' for production preview */
  mode: 'dev' | 'preview';
  /** Port to run the server on */
  port: number;
  /** Timeout in milliseconds to wait for server to be ready */
  waitOnTimeout: number;
  /** Custom command to run (overrides mode-based command) */
  customCommand?: string;
}

export interface ServerStatus {
  running: boolean;
  url: string;
  pid?: number;
}

export class ServerManager {
  private serverProcess: ReturnType<typeof import('execa').execa> | null = null;
  private serverUrl: string = '';
  private isRunning: boolean = false;

  /**
   * Start the application server
   */
  async start(options: ServerOptions): Promise<void> {
    const { mode, port, waitOnTimeout, customCommand } = options;

    if (this.isRunning) {
      console.log(chalk.yellow('Server is already running'));
      return;
    }

    this.serverUrl = `http://localhost:${port}`;

    // Determine the command to run
    const command = customCommand || (mode === 'dev' ? 'dev:test' : 'preview');

    console.log(chalk.blue(`\n=== Starting Application Server ===\n`));
    console.log(`  Mode: ${mode}`);
    console.log(`  Command: npm run ${command}`);
    console.log(`  URL: ${this.serverUrl}`);
    console.log(`  Timeout: ${waitOnTimeout}ms`);

    try {
      // Import execa dynamically
      const { execa } = await import('execa');

      // Start server in background
      this.serverProcess = execa('npm', ['run', command], {
        stdio: 'pipe',
        env: {
          ...process.env,
          NODE_ENV: 'test',
          PORT: String(port),
        },
        windowsHide: true,
        detached: false,
      });

      // Log server output in debug mode
      if (process.env.DEBUG) {
        this.serverProcess.stdout?.on('data', (data) => {
          console.log(chalk.gray(`  [server] ${data.toString().trim()}`));
        });
        this.serverProcess.stderr?.on('data', (data) => {
          console.log(chalk.yellow(`  [server] ${data.toString().trim()}`));
        });
      }

      // Wait for server to be ready
      console.log(chalk.blue('\n  Waiting for server to be ready...'));
      await this.waitForServer(this.serverUrl, waitOnTimeout);

      this.isRunning = true;
      console.log(chalk.green(`\n  ✓ Server is ready at ${this.serverUrl}`));
      console.log(`  PID: ${this.serverProcess.pid}`);
    } catch (error) {
      console.error(chalk.red('\n  ✗ Failed to start server:'), error);
      await this.stop();
      throw error;
    }
  }

  /**
   * Wait for the server to be ready using wait-on
   */
  private async waitForServer(url: string, timeout: number): Promise<void> {
    const waitOn = (await import('wait-on')).default;

    const opts = {
      resources: [url],
      timeout,
      interval: 1000,
      validateStatus: (status: number) => status >= 200 && status < 400,
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
      },
      log: process.env.DEBUG === 'true',
    };

    try {
      await waitOn(opts);
    } catch (error) {
      const err = error as Error;
      if (err.message?.includes('Timeout')) {
        throw new Error(
          `Server failed to start within ${timeout}ms. ` +
          `Check if port ${new URL(url).port} is available and the server can start.`
        );
      }
      throw error;
    }
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (!this.serverProcess) {
      return;
    }

    console.log(chalk.blue('\n  Stopping server...'));

    const pid = this.serverProcess.pid;
    if (pid) {
      try {
        await killProcessTree(pid);
        console.log(chalk.green(`  ✓ Server stopped (PID: ${pid})`));
      } catch (error) {
        console.error(chalk.yellow(`  Warning: Could not cleanly stop server:`, error));
      }
    }

    this.serverProcess = null;
    this.isRunning = false;
  }

  /**
   * Get the current server status
   */
  getStatus(): ServerStatus {
    return {
      running: this.isRunning,
      url: this.serverUrl,
      pid: this.serverProcess?.pid,
    };
  }

  /**
   * Get the server URL
   */
  getUrl(): string {
    return this.serverUrl;
  }

  /**
   * Check if the server is running
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Perform a health check on the server
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isRunning) {
      return false;
    }

    try {
      const response = await fetch(this.serverUrl);
      return response.ok || response.status < 500;
    } catch {
      return false;
    }
  }
}
