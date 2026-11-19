import type { Session } from "./modules/auth";

export type AppEnv = {
  Variables: {
    requestId: string;
    session: Session | null;
  };
};
