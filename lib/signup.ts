/**
 * Account signup closes at 11:59 AM IST on 4 September 2026.
 * REGISTRATION_END_AT is deliberately not used here: registration and account
 * creation are separate windows.
 */
export const DEFAULT_SIGNUP_END_AT = "2026-09-04T11:59:00+05:30";

export function getSignupEndAt(): string {
  return (
    process.env.SIGNUP_END_AT ||
    process.env.NEXT_PUBLIC_SIGNUP_END_AT ||
    DEFAULT_SIGNUP_END_AT
  );
}

export function getSignupEndTimestamp(): number {
  const timestamp = Date.parse(getSignupEndAt());
  return Number.isNaN(timestamp) ? Date.parse(DEFAULT_SIGNUP_END_AT) : timestamp;
}

export function isSignupClosed(now = Date.now()): boolean {
  return now >= getSignupEndTimestamp();
}

export function formatSignupEndAt(): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "short",
  }).format(getSignupEndTimestamp());
}
