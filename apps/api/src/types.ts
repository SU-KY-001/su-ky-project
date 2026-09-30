import type { AuthSession } from "./auth";

export type AppEnv = {
  Variables: {
    requestId: string;
    session: AuthSession | null;
  };
};
