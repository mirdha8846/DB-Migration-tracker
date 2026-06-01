import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatMigrationId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}
