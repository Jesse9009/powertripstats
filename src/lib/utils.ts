import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFullName(
  firstName: string,
  middleName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  const safeLastName = lastName?.trim() ?? '';

  if (middleName?.trim()) {
    return safeLastName
      ? `${firstName} ${middleName} ${safeLastName}`
      : `${firstName} ${middleName}`;
  }

  return safeLastName ? `${firstName} ${safeLastName}` : firstName;
}

export function formatGameDateUTC(date: Date | number | string): string {
  const parsedDate = new Date(date);
  const month = String(parsedDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getUTCDate()).padStart(2, '0');
  const year = parsedDate.getUTCFullYear();

  return `${month}/${day}/${year}`;
}

export function uniqueNumbers(values: number[]) {
  return Array.from(new Set(values));
}
