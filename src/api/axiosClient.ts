import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiErrorResponse } from '../types/api';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

export interface FormattedError {
  message: string;
  fieldErrors: Record<string, string>;
  status?: number;
}

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | string | undefined;
    if (typeof data === 'string' && data.trim().length > 0) return data;
    if (data && typeof data === 'object') {
      if (data.fieldErrors) {
        if (Array.isArray(data.fieldErrors)) {
          return data.fieldErrors.map((f) => `${f.field}: ${f.message}`).join(', ');
        }
        const entries = Object.entries(data.fieldErrors);
        if (entries.length > 0) {
          return entries.map(([k, v]) => `${k}: ${v}`).join(', ');
        }
      }
      if (data.message) return data.message;
      if (data.error) return data.error;
    }
    if (error.response?.status === 401) return 'Session expired or invalid credentials. Please sign in again.';
    if (error.response?.status === 403) return 'You do not have permission to perform this action.';
    if (error.response?.status === 404) return 'Requested resource was not found.';
    if (error.response?.status === 409) return 'Data conflict or concurrent stock update. Please refresh and try again.';
    if (error.response?.status === 429) return 'Too many requests. Please wait a moment and try again.';
    if (error.response?.status === 500) return 'Internal server error. Please try again.';
    if (error.message === 'Network Error') {
      return `Cannot connect to server at ${API_BASE_URL}. Please verify the backend is running.`;
    }
    return error.message || 'An unexpected error occurred.';
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}

export function extractFieldErrors(error: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    if (data?.fieldErrors) {
      if (Array.isArray(data.fieldErrors)) {
        for (const item of data.fieldErrors) {
          result[item.field] = item.message;
        }
      } else if (typeof data.fieldErrors === 'object') {
        Object.assign(result, data.fieldErrors);
      }
    }
  }
  return result;
}

// Request interceptor: Attach JWT token from 'flowmart_session'
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    try {
      const stored = localStorage.getItem('flowmart_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        const token = parsed?.token || parsed?.accessToken || '';
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      localStorage.removeItem('flowmart_session');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Attach formatted error & handle 401 session expiry
axiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const requestUrl = error.config?.url || '';
    if (error.response?.status === 401 && !requestUrl.includes('/auth/')) {
      localStorage.removeItem('flowmart_session');
      window.dispatchEvent(new CustomEvent('flowmart:unauthorized'));
    }

    const formatted: FormattedError = {
      message: extractErrorMessage(error),
      fieldErrors: extractFieldErrors(error),
      status: error.response?.status,
    };
    (error as AxiosError & { formattedError?: FormattedError }).formattedError = formatted;
    return Promise.reject(error);
  }
);

export default axiosClient;