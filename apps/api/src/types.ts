import type { Session } from "./auth";

export type AppEnv = {
  Variables: {
    requestId: string;
    session: Session | null;
  };
};
