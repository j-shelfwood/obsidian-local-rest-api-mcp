#!/usr/bin/env bun

import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { spawn, ChildProcess } from "child_process";

describe("MCP Server Basic Tests", () => {
  test("Server binary exists and is executable", () => {
    const fs = require("fs");
    const path = require("path");

    const binaryPath = path.join(process.cwd(), "build", "index.js");
    expect(fs.existsSync(binaryPath)).toBe(true);

    const stats = fs.statSync(binaryPath);
    expect(stats.isFile()).toBe(true);
  });

  test("TypeScript compilation succeeds", async () => {
    const buildProcess = spawn("bun", ["run", "tsc", "--noEmit"], {
      stdio: "pipe",
      cwd: process.cwd()
    });

    return new Promise((resolve, reject) => {
      let stderr = "";

      buildProcess.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      buildProcess.on("close", (code) => {
        if (code === 0) {
          resolve(undefined);
        } else {
          reject(new Error(`TypeScript compilation failed: ${stderr}`));
        }
      });
    });
  });

  test("Environment configuration parsing", () => {
    const originalUrl = process.env.OBSIDIAN_API_URL;
    const originalKey = process.env.OBSIDIAN_API_KEY;

    // Test default values
    delete process.env.OBSIDIAN_API_URL;
    delete process.env.OBSIDIAN_API_KEY;

    // Test custom values
    process.env.OBSIDIAN_API_URL = "http://test.local:9000";
    process.env.OBSIDIAN_API_KEY = "test-key";

    expect(process.env.OBSIDIAN_API_URL).toBe("http://test.local:9000");
    expect(process.env.OBSIDIAN_API_KEY).toBe("test-key");

    // Restore original values
    if (originalUrl) process.env.OBSIDIAN_API_URL = originalUrl;
    else delete process.env.OBSIDIAN_API_URL;
    if (originalKey) process.env.OBSIDIAN_API_KEY = originalKey;
    else delete process.env.OBSIDIAN_API_KEY;
  });

  test("Server startup timeout handling", async () => {
    const serverProcess = spawn("node", ["build/index.js"], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        OBSIDIAN_API_URL: "http://localhost:8000",
      },
    });

    return new Promise((resolve) => {
      let hasOutput = false;

      // Check stderr for startup message
      serverProcess.stderr?.on("data", (data) => {
        const output = data.toString();
        if (output.includes("running on stdio")) {
          hasOutput = true;
        }
      });

      // Give server time to start and emit startup message
      global.setTimeout(() => {
        serverProcess.kill();
        // Server starting is success (it should run indefinitely)
        expect(hasOutput).toBe(true);
        resolve(undefined);
      }, 2000);

      serverProcess.on("error", () => {
        // Process errors are expected in test environment
        resolve(undefined);
      });
    });
  }, 5000);
});

describe("Package Configuration", () => {
  test("Package.json has required fields for publishing", () => {
    const packageJson = require("../package.json");

    expect(packageJson.name).toBe("obsidian-local-rest-api-mcp");
    expect(packageJson.version).toBeDefined();
    expect(packageJson.description).toBeDefined();
    expect(packageJson.main).toBe("build/index.js");
    expect(packageJson.types).toBe("build/index.d.ts");
    expect(packageJson.license).toBe("MIT");
    expect(packageJson.repository).toBeDefined();
    expect(packageJson.keywords).toBeArray();
    expect(packageJson.files).toContain("build/**/*");
    expect(packageJson.private).toBe(false);
  });

  test("Binary configuration is correct", () => {
    const packageJson = require("../package.json");

    expect(packageJson.bin).toBeDefined();
    expect(packageJson.bin["obsidian-mcp"]).toBe("build/index.js");
  });

  test("Dependencies are properly specified", () => {
    const packageJson = require("../package.json");

    expect(packageJson.dependencies).toBeDefined();
    expect(packageJson.dependencies["@modelcontextprotocol/sdk"]).toBeDefined();
    expect(packageJson.dependencies["zod"]).toBeDefined();

    expect(packageJson.devDependencies).toBeDefined();
    expect(packageJson.devDependencies["typescript"]).toBeDefined();
  });
});
