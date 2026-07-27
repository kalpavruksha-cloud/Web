import axios from "axios";
import type { ApiResponse } from "../types/domain";

const baseURL = resolveBaseURL();

export const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 20000,
  headers: { "Content-Type": "application/json" }
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const payload = error.response?.data as ApiResponse<unknown> | undefined;
    const message = payload?.error?.details || payload?.message || error.message || "Unable to reach the portal API";
    return Promise.reject(new Error(message));
  }
);

export async function getData<T>(url: string, params?: Record<string, unknown>) {
  const response = await api.get<ApiResponse<T>>(url, { params });
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.details ?? response.data.message);
  }
  return response.data.data;
}

export async function sendData<T>(method: "post" | "put" | "delete", url: string, body?: Record<string, unknown>) {
  const response = await api.request<ApiResponse<T>>({ method, url, data: body });
  if (!response.data.success || response.data.data === null) {
    throw new Error(response.data.error?.details ?? response.data.message);
  }
  return response.data.data;
}

function resolveBaseURL() {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!configured) return "/api";

  const isLocalApi = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/api\/?$/i.test(configured);
  const isLocalPage = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);

  if (isLocalApi && !isLocalPage) return "/api";
  return configured;
}
