import { AttemptSummary } from "./types";

const KEY = "vetmcq_attempts_v1";

export function loadAttempts(): AttemptSummary[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AttemptSummary[];
  } catch {
    return [];
  }
}

export function saveAttempt(attempt: AttemptSummary) {
  if (typeof window === "undefined") return;
  const all = loadAttempts();
  all.unshift(attempt);
  localStorage.setItem(KEY, JSON.stringify(all.slice(0, 50)));
}
