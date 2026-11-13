import type { UserProfileDto } from "@repo/shared";

export type CurrentUser = UserProfileDto;

export interface AuthRedirectLocation {
  pathname: string;
  search?: string;
  hash?: string;
}

export interface AuthLocationState {
  from?: AuthRedirectLocation;
}
