import type { ApiResponse } from "@/types";

export function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data, error: null };
}

export function err(message: string): ApiResponse<null> {
  return { success: false, data: null, error: message };
}
