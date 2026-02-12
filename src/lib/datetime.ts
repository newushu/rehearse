export interface DateTimeLocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export const DEFAULT_TIMEZONE = "America/New_York";

const hasTimeZoneInfo = (value: string) => /[zZ]|[+-]\d{2}:\d{2}$/.test(value);

const parseNaiveDateTime = (value: string) => {
  if (!value) return null;
  const [datePart, timePartRaw] = value.split(/[T ]/);
  if (!datePart || !timePartRaw) return null;
  const timePart = timePartRaw.slice(0, 5);
  const [yearStr, monthStr, dayStr] = datePart.split("-");
  const [hourStr, minuteStr] = timePart.split(":");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null;
  }
  return { datePart, timePart, year, month, day, hour, minute };
};

export function parseDateTimeLocal(value: string): DateTimeLocalParts | null {
  if (!value) return null;
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) return null;
  const [yearStr, monthStr, dayStr] = datePart.split("-");
  const [hourStr, minuteStr] = timePart.split(":");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null;
  }
  return { year, month, day, hour, minute };
}

function getTimeZoneOffsetMs(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const lookup: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      lookup[part.type] = part.value;
    }
  }
  const asUtc = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(lookup.hour),
    Number(lookup.minute),
    Number(lookup.second)
  );
  return asUtc - date.getTime();
}

export function zonedDateTimeLocalToUtcIso(localValue: string, timeZone: string): string {
  const parts = parseDateTimeLocal(localValue);
  if (!parts) return "";
  const utcGuess = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0)
  );
  const offset = getTimeZoneOffsetMs(timeZone, utcGuess);
  const actualUtc = new Date(utcGuess.getTime() - offset);
  return actualUtc.toISOString();
}

export function formatDateTimeLocalInTimeZone(isoValue: string, timeZone: string): string {
  if (!isoValue) return "";
  if (!hasTimeZoneInfo(isoValue)) {
    const parsed = parseNaiveDateTime(isoValue);
    return parsed ? `${parsed.datePart}T${parsed.timePart}` : isoValue;
  }
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return "";
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const lookup: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      lookup[part.type] = part.value;
    }
  }
  return `${lookup.year}-${lookup.month}-${lookup.day}T${lookup.hour}:${lookup.minute}`;
}

export function formatDisplayDateTime(isoValue: string, timeZone: string): string {
  if (!isoValue) return "—";
  if (!hasTimeZoneInfo(isoValue)) {
    const parsed = parseNaiveDateTime(isoValue);
    if (!parsed) return isoValue;
    const dateUtc = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, parsed.hour, parsed.minute, 0));
    const dateLabel = dateUtc.toLocaleDateString(undefined, { timeZone: "UTC" });
    const timeLabel = dateUtc.toLocaleTimeString(undefined, {
      timeZone: "UTC",
      hour: "numeric",
      minute: "2-digit",
    });
    return `${dateLabel}, ${timeLabel} ET`;
  }
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    timeZone: timeZone || DEFAULT_TIMEZONE,
    timeZoneName: "short",
  });
}

export function formatDisplayDateTimeWithWeekday(isoValue: string, timeZone: string): string {
  if (!isoValue) return "â€”";
  if (!hasTimeZoneInfo(isoValue)) {
    const parsed = parseNaiveDateTime(isoValue);
    if (!parsed) return isoValue;
    const dateUtc = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, parsed.hour, parsed.minute, 0));
    const label = dateUtc.toLocaleString(undefined, {
      timeZone: "UTC",
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return `${label} ET`;
  }
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return "â€”";
  return date.toLocaleString(undefined, {
    timeZone: timeZone || DEFAULT_TIMEZONE,
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function formatTimeInTimeZone(isoValue: string, timeZone: string): string {
  if (!isoValue) return "—";
  if (!hasTimeZoneInfo(isoValue)) {
    const parsed = parseNaiveDateTime(isoValue);
    return parsed ? formatTimeString(parsed.timePart) : isoValue;
  }
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString(undefined, {
    timeZone: timeZone || DEFAULT_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getDateKeyInTimeZone(isoValue: string, timeZone: string): string {
  if (!isoValue) return "";
  if (!hasTimeZoneInfo(isoValue)) {
    const parsed = parseNaiveDateTime(isoValue);
    return parsed ? parsed.datePart : "";
  }
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return "";
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone || DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const lookup: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      lookup[part.type] = part.value;
    }
  }
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

export function formatTimeString(value: string): string {
  if (!value) return "—";
  const [hourStr, minuteStr] = value.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  const date = new Date(Date.UTC(2000, 0, 1, hour, minute, 0));
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function getCallTimeFromDateTimeLocal(value: string): string {
  const parts = parseDateTimeLocal(value);
  if (!parts) return "";
  const baseUtc = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0)
  );
  baseUtc.setUTCHours(baseUtc.getUTCHours() - 1);
  const hour = String(baseUtc.getUTCHours()).padStart(2, "0");
  const minute = String(baseUtc.getUTCMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

export function isCallTimeLocked(localValue: string, timeZone: string): boolean {
  if (!localValue) return false;
  const utcIso = zonedDateTimeLocalToUtcIso(localValue, timeZone);
  const perfDate = new Date(utcIso);
  if (Number.isNaN(perfDate.getTime())) return false;
  const lockAt = perfDate.getTime() - 60 * 60 * 1000;
  return Date.now() >= lockAt;
}






