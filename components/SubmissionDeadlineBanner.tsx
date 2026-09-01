import { CalendarClock } from "lucide-react";

export default function SubmissionDeadlineBanner() {
  return (
    <div className="mt-4 rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-600/15 via-background to-orange-400/10 p-4 text-left shadow-lg shadow-orange-500/5 sm:p-5">
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <div className="rounded-full bg-orange-500/15 p-2.5 text-orange-300">
          <CalendarClock className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
        </div>
        <div>
          <p className="font-display text-sm font-semibold text-orange-300 sm:text-base">
            Submission deadline
          </p>
          <p className="mt-1 text-xs leading-relaxed text-gray-300 sm:text-sm">
            Last date to submit your PPT and video submission is{" "}
            <span className="font-semibold text-white">
              4 September at 11:59 PM IST
            </span>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
