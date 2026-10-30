import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "suky.auth.token";
const USER_KEY = "suky.auth.user";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

let token: string | null = null;

/** Bearer token dùng cho axios client; giữ trong bộ nhớ, lưu bền bằng AsyncStorage. */
export const getToken = (): string | null => token;

export async function loadSession(): Promise<{ token: string; user: SessionUser } | null> {
  const [storedToken, storedUser] = await Promise.all([AsyncStorage.getItem(TOKEN_KEY), AsyncStorage.getItem(USER_KEY)]);
  if (!storedToken || !storedUser) return null;
  token = storedToken;
  return { token: storedToken, user: JSON.parse(storedUser) as SessionUser };
}

export async function saveSession(nextToken: string, user: SessionUser): Promise<void> {
  token = nextToken;
  await Promise.all([AsyncStorage.setItem(TOKEN_KEY, nextToken), AsyncStorage.setItem(USER_KEY, JSON.stringify(user))]);
}

export async function clearSession(): Promise<void> {
  token = null;
  await Promise.all([AsyncStorage.removeItem(TOKEN_KEY), AsyncStorage.removeItem(USER_KEY)]);
}

