import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFullName(
  firstName: string,
  middleName: string | null | undefined,
  lastName: string,
): string {
  return middleName?.trim()
    ? `${firstName} ${middleName} ${lastName}`
    : `${firstName} ${lastName}`;
}

export function formatGameDateUTC(date: Date | number | string): string {
  const parsedDate = new Date(date);
  const month = String(parsedDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getUTCDate()).padStart(2, '0');
  const year = parsedDate.getUTCFullYear();

  return `${month}/${day}/${year}`;
}
