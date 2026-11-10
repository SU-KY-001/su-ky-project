import { delimiter, dirname } from "node:path";

/** Local-only overrides never change the shared .env or use a teammate's database name. */
export function localDevelopmentEnvironment(
  source: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const databaseUrl =
    source.LOCAL_DATABASE_URL?.trim() || source.DATABASE_URL?.trim();
  if (!databaseUrl)
    throw new Error(
      "Thiếu DATABASE_URL. Tạo .env từ .env.example và cấu hình database local đang có của bạn.",
    );
  let database: URL;
  try {
    database = new URL(databaseUrl);
  } catch {
    throw new Error(
      "DATABASE_URL không hợp lệ. Hãy kiểm tra cấu hình database local.",
    );
  }
  if (
    !["postgres:", "postgresql:"].includes(database.protocol) ||
    !database.pathname.slice(1)
  )
    throw new Error("DATABASE_URL cần là URL PostgreSQL có tên database.");
  if (
    !["localhost", "127.0.0.1", "[::1]", "host.docker.internal"].includes(
      database.hostname,
    )
  )
    throw new Error(
      "dev:local chỉ chạy migration với PostgreSQL local. Không dùng URL database server chung; đặt LOCAL_DATABASE_URL trong .env.local nếu cần.",
    );
  const port = source.LOCAL_API_PORT?.trim() || "3005";
  if (
    !/^\d+$/.test(port) ||
    Number(port) < 1024 ||
    Number(port) > 65535 ||
    Number(port) === 3000
  )
    throw new Error(
      "LOCAL_API_PORT cần từ 1024 đến 65535 và khác cổng FE 3000.",
    );
  const api = `http://localhost:${Number(port)}`;
  return {
    ...source,
    PATH: `${dirname(process.execPath)}${delimiter}${source.PATH ?? ""}`,
    DATABASE_URL: databaseUrl,
    NODE_ENV: "development",
    PORT: String(Number(port)),
    VITE_API_URL: api,
    BETTER_AUTH_URL: api,
    CORS_ORIGIN: "http://localhost:3000",
  };
}
