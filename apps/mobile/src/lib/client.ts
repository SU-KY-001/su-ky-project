import axios from "axios";
import { getToken } from "./session";

const DEPLOYED_API_URL = "https://suky-api.the1struleoffightclub.top";

function resolveApiUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return DEPLOYED_API_URL;
}

export const apiUrl = resolveApiUrl();

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
