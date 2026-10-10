import type { User } from "@/lib/mock-data";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function parseBirthMonthDay(dateOfBirth?: string) {
  if (!dateOfBirth) return null;
  if (typeof dateOfBirth === "string") {
    const cleanDate = dateOfBirth.split("T")[0];
    const parts = cleanDate.split("-");
    if (parts.length >= 3) {
      const month = parseInt(parts[1], 10) - 1; // 0-indexed
      const day = parseInt(parts[2], 10);
      if (!isNaN(month) && !isNaN(day) && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
        return { month, day };
      }
    }
  }
  const date = new Date(dateOfBirth);
  if (isNaN(date.getTime())) return null;
  return { month: date.getMonth(), day: date.getDate() };
}

export function formatBirthday(dateOfBirth?: string) {
  const parsed = parseBirthMonthDay(dateOfBirth);
  if (!parsed) return "—";
  return `${parsed.day} ${MONTH_NAMES[parsed.month]}`;
}

export function isBirthdayToday(dateOfBirth?: string, today = new Date()) {
  const birthday = parseBirthMonthDay(dateOfBirth);
  if (!birthday) return false;
  return birthday.month === today.getMonth() && birthday.day === today.getDate();
}

export function getUpcomingBirthdays(users: User[], days = 30, today = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const upcoming = users
    .map((user) => {
      const parsed = parseBirthMonthDay(user.dateOfBirth);
      if (!parsed) return null;

      let candidate = new Date(start.getFullYear(), parsed.month, parsed.day);
      if (candidate < start) {
        candidate = new Date(start.getFullYear() + 1, parsed.month, parsed.day);
      }
      const diffMs = candidate.getTime() - start.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      return { user, diffDays, birthdayDate: candidate };
    })
    .filter((item): item is { user: User; diffDays: number; birthdayDate: Date } => item !== null)
    .filter((item) => item.diffDays >= 0 && item.diffDays <= days)
    .sort((a, b) => {
      if (a.diffDays !== b.diffDays) return a.diffDays - b.diffDays;
      return a.user.name.localeCompare(b.user.name);
    })
    .map((item) => item.user);

  return upcoming;
}

