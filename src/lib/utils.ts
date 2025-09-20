import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Safe filename sanitizer for Supabase Storage keys
// - Preserves extension
// - Replaces only problematic chars
// - Normalizes spaces/underscores
export function sanitizeFileName(filename: string): string {
  const trimmed = filename.trim();
  const hasExt = trimmed.includes(".");
  if (hasExt) {
    const lastDot = trimmed.lastIndexOf(".");
    const base = trimmed.slice(0, lastDot);
    const ext = trimmed.slice(lastDot + 1);
    const safeBase = base
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .replace(/[\\\[\]{}()<>|:;"'?*]/g, "_")
      .replace(/\//g, "-")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^[_\.]+|[_\.]+$/g, "");
    const safeExt = ext.replace(/[^A-Za-z0-9]+/g, "").slice(0, 10) || "txt";
    return `${safeBase}.${safeExt}`;
  } else {
    const safe = trimmed
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .replace(/[\\\[\]{}()<>|:;"'?*]/g, "_")
      .replace(/\//g, "-")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^[_\.]+|[_\.]+$/g, "");
    return safe || `file_${Date.now()}`;
  }
}
