import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formatea una fecha ISO a formato legible en español (p. ej. "15 jul 2026"). */
export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

/** Formatea un número con separadores de miles en español. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es").format(value)
}

