import { NextResponse } from "next/server";
import {
  formatSignupEndAt,
  getSignupEndAt,
  isSignupClosed,
} from "../../../../lib/signup";

export async function GET() {
  const closed = isSignupClosed();

  return NextResponse.json(
    {
      success: true,
      signupOpen: !closed,
      signupEndAt: getSignupEndAt(),
      message: closed ? `Signup closed at ${formatSignupEndAt()}` : undefined,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
