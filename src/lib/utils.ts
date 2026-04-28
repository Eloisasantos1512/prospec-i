import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getApiKey(key: string): string {
  return localStorage.getItem(key) || "";
}

export function isApiConfigured(key: string): boolean {
  return !!localStorage.getItem(key);
}
