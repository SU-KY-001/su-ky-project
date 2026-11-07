import { resolve } from "node:path";
import { localDevelopmentEnvironment } from "./local-env";

const root = resolve(import.meta.dir, "..");
let localEnv: NodeJS.ProcessEnv;
try {
  localEnv = localDevelopmentEnvironment(process.env);
} catch (error) {
  console.error(
    `[dev:local] ${error instanceof Error ? error.message : "Cấu hình local chưa hợp lệ."}`,
  );
  process.exit(1);
}
const database = new URL(localEnv.DATABASE_URL!);
console.log(
  `[dev:local] PostgreSQL local: ${database.hostname}:${database.port || "5432"}/${database.pathname.slice(1)}`,
);
console.log(
  "[dev:local] Sinh Prisma Client và áp dụng migration còn thiếu; không reset DB, không seed series/podcast.",
);
for (const script of ["db:generate", "db:deploy"]) {
  const preparation = Bun.spawn(
    [process.execPath, "run", "--cwd", "packages/db", script],
    {
      cwd: root,
      env: localEnv,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    },
  );
  const result = await preparation.exited;
  if (result !== 0) {
    console.error(
      `[dev:local] ${script} thất bại. Kiểm tra PostgreSQL đang chạy và DATABASE_URL; chưa khởi động FE/BE.`,
    );
    process.exit(result || 1);
  }
}
if (process.argv.includes("--prepare-only")) process.exit(0);
const services = [
  {
    name: "API",
    command: [process.execPath, "run", "--cwd", "apps/api", "dev"],
  },
  {
    name: "Worker",
    command: [process.execPath, "run", "--cwd", "apps/api", "worker:dev"],
  },
  {
    name: "Web",
    command: [
      process.execPath,
      "run",
      "--cwd",
      "apps/web",
      "dev",
      "--strictPort",
    ],
  },
] as const;

const children = services.map(({ name, command }) => {
  console.log(`[dev:local] Starting ${name}...`);
  return {
    name,
    process: Bun.spawn([...command], {
      cwd: root,
      env: localEnv,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    }),
  };
});

let stopping = false;

async function stopAll(signal: NodeJS.Signals = "SIGTERM"): Promise<void> {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.process.exitCode === null) child.process.kill(signal);
  }
  await Promise.allSettled(children.map((child) => child.process.exited));
}

process.once("SIGINT", () => void stopAll("SIGINT"));
process.once("SIGTERM", () => void stopAll("SIGTERM"));

const firstExit = await Promise.race(
  children.map(async (child) => ({
    name: child.name,
    exitCode: await child.process.exited,
  })),
);

if (!stopping) {
  console.error(
    `[dev:local] ${firstExit.name} stopped with exit code ${firstExit.exitCode}. Stopping the other services...`,
  );
  await stopAll();
  process.exitCode = firstExit.exitCode || 1;
}
