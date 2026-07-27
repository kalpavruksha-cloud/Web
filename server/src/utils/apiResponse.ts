import type { APIResponse } from "../types/domain.js";

export function ok<T>(data: T, message = "Operation completed", requestId = "unknown"): APIResponse<T> {
  return {
    success: true,
    message,
    data,
    error: null,
    meta: { timestamp: new Date().toISOString(), requestId }
  };
}

export function fail(code: string, details: string, message = "Operation failed", requestId = "unknown", data = null): APIResponse<null> {
  return {
    success: false,
    message,
    data,
    error: { code, details },
    meta: { timestamp: new Date().toISOString(), requestId }
  };
}
