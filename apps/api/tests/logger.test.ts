import { describe, it, expect } from "bun:test";
import fs from "node:fs";
import { logger, logDir, errorLogPath } from "../src/core/logger";

describe("Pino Logger & File Sink", () => {
  it("initializes logger with standard pino methods", () => {
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.debug).toBe("function");
  });

  it("ensures logs directory and error.log path are properly configured", () => {
    expect(fs.existsSync(logDir)).toBe(true);
    expect(errorLogPath).toMatch(/logs[/\\]error\.log$/);
  });

  it("appends error level logs to error.log", async () => {
    const uniqueErrorMarker = `test-error-log-${Date.now()}`;
    logger.error({ marker: uniqueErrorMarker }, "Verifying error log sink");

    // Allow stream to flush to disk
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(fs.existsSync(errorLogPath)).toBe(true);
    const logContent = fs.readFileSync(errorLogPath, "utf-8");
    expect(logContent).toContain(uniqueErrorMarker);
    expect(logContent).toContain('"level":50');
  });

  it("does not write info level logs into error.log", async () => {
    const uniqueInfoMarker = `test-info-should-not-be-in-error-log-${Date.now()}`;
    logger.info({ marker: uniqueInfoMarker }, "Informational log");

    // Allow potential flush
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (fs.existsSync(errorLogPath)) {
      const logContent = fs.readFileSync(errorLogPath, "utf-8");
      expect(logContent).not.toContain(uniqueInfoMarker);
    }
  });
});
