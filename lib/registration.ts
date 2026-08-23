/**
 * Registration opening time. Set NEXT_PUBLIC_REGISTRATION_START_AT in the
 * deployment environment to change it without modifying the code.
 *
 * The default is 24 August 2026 at 9:00 PM IST, represented with an explicit
 * offset so server and browser environments interpret it identically.
 */
export const DEFAULT_REGISTRATION_START_AT = "2026-08-24T21:00:00+05:30";

export function getRegistrationStartAt(): string {
  return (
    process.env.NEXT_PUBLIC_REGISTRATION_START_AT ||
    DEFAULT_REGISTRATION_START_AT
  );
}

export function getRegistrationStartTimestamp(): number {
  const timestamp = Date.parse(getRegistrationStartAt());
  return Number.isNaN(timestamp)
    ? Date.parse(DEFAULT_REGISTRATION_START_AT)
    : timestamp;
}

export function isRegistrationOpen(now = Date.now()): boolean {
  return now >= getRegistrationStartTimestamp();
}

export function formatRegistrationStartAt(): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "short",
  }).format(getRegistrationStartTimestamp());
}
