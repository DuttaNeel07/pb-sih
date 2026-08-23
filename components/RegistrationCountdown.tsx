"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarClock, Sparkles } from "lucide-react";
import { formatRegistrationStartAt, getRegistrationStartTimestamp } from "@/lib/registration";

interface RegistrationCountdownProps {
  onExpire?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

const getTimeLeft = (): TimeLeft => {
  const total = Math.max(0, getRegistrationStartTimestamp() - Date.now());

  return {
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
    total,
  };
};

const pad = (value: number) => value.toString().padStart(2, "0");

export default function RegistrationCountdown({
  onExpire,
}: RegistrationCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft);
  const expiredRef = useRef(false);

  const updateCountdown = useCallback(() => {
    const nextTimeLeft = getTimeLeft();
    setTimeLeft(nextTimeLeft);

    if (nextTimeLeft.total === 0 && !expiredRef.current) {
      expiredRef.current = true;
      onExpire?.();
    }
  }, [onExpire]);

  useEffect(() => {
    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [updateCountdown]);

  if (timeLeft.total === 0) return null;

  const units = [
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Minutes", value: timeLeft.minutes },
    { label: "Seconds", value: timeLeft.seconds },
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-heading/20 bg-gray-900/60 px-5 py-10 shadow-2xl shadow-heading/5 backdrop-blur-sm sm:px-10">
      <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-heading/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-20 h-56 w-56 rounded-full bg-subheading/10 blur-3xl" />

      <div className="relative mx-auto max-w-3xl text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-heading/30 bg-heading/10 px-4 py-2 text-sm font-medium text-heading">
          <Sparkles className="h-4 w-4" />
          Registration opens soon
        </div>

        <h2 className="font-display text-3xl text-white sm:text-4xl">
          Get ready to register your team
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-400 sm:text-base">
          Registrations open sharply at 9:00 PM IST. Keep this page open and
          be ready when the countdown reaches zero.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {units.map((unit) => (
            <div
              key={unit.label}
              className="rounded-2xl border border-gray-700/80 bg-gray-950/70 px-3 py-4"
            >
              <div className="font-display text-3xl font-semibold tabular-nums text-heading sm:text-4xl">
                {pad(unit.value)}
              </div>
              <div className="mt-1 text-xs uppercase tracking-[0.2em] text-gray-500">
                {unit.label}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-col items-center justify-center gap-3 text-sm text-gray-400 sm:flex-row sm:gap-6">
          <span className="inline-flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-subheading" />
            {formatRegistrationStartAt()}
          </span>
        </div>
      </div>
    </section>
  );
}
