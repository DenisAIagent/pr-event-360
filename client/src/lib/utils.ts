import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Fusionne des classes conditionnelles (clsx) puis dédoublonne les conflits Tailwind (tailwind-merge). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
