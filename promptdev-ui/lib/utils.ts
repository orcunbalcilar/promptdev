import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateTaskTitle(prompt: string): string {
  if (!prompt) return "";
  // Simple heuristic: Take first line, limit to ~8 words, clean markdown
  const firstLine = prompt.split("\n")[0].replace(/[#*`]/g, "").trim();

  if (!firstLine) return "";

  const words = firstLine.split(/\s+/);
  const title = words.slice(0, 8).join(" ");

  // Capitalize first letter
  const formattedTitle = title.charAt(0).toUpperCase() + title.slice(1);
  return formattedTitle + (words.length > 8 ? "..." : "");
}

export function slugify(text: string): string {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start
    .replace(/-+$/, ""); // Trim - from end
}
