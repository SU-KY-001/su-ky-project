import axios from "axios";
import { getToken } from "./session";

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

if (!configuredApiUrl) {
  throw new Error("EXPO_PUBLIC_API_URL is required. Set it in apps/mobile/.env.");
}

export const apiUrl = configuredApiUrl.replace(/\/$/, "");

export const apiClient = axios.create({
  baseURL: apiUrl,
  timeout: 15_000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});
