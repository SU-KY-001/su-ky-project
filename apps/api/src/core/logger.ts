import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pino from "pino";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const logDir =
  process.env.LOG_DIR || path.resolve(currentDir, "../../logs");

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

export const errorLogPath = path.join(logDir, "error.log");

const errorWriteStream = fs.createWriteStream(errorLogPath, { flags: "a" });

const streams: pino.StreamEntry[] = [
  { stream: process.stdout },
  { level: "error", stream: errorWriteStream },
];

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || "info",
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.multistream(streams)
);

export type Logger = typeof logger;
