import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "../../../../lib/middleware/auth";
import { User } from "../../../../models/User";
import dbConnect from "../../../../lib/mongodb";
import { auth as firebaseAdminAuth } from "../../../../lib/firebase-admin";
import {
  sanitizeEmail,
  sanitizeSingleLineText,
} from "../../../../lib/utils/validation";
import {
  formatSignupEndAt,
  getSignupEndAt,
  isSignupClosed,
} from "../../../../lib/signup";

export async function GET(request: NextRequest) {
  try {
    const authenticatedRequest = await verifyAuth(request);

    return NextResponse.json({
      success: true,
      user: authenticatedRequest.user,
    });
  } catch (error) {
    console.error("User verification error:", error);
    return NextResponse.json(
      { success: false, error: "Authentication failed" },
      { status: 401 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (isSignupClosed()) {
      return NextResponse.json(
        {
          success: false,
          code: "SIGNUP_CLOSED",
          error: `Signup closed at ${formatSignupEndAt()}`,
          signupEndAt: getSignupEndAt(),
        },
        { status: 403 }
      );
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    if (!firebaseAdminAuth) {
      return NextResponse.json(
        { success: false, error: "Authentication is not configured" },
        { status: 503 }
      );
    }

    // Verify the Firebase token directly. This endpoint provisions the local
    // user record, so verifyAuth cannot be used here (it requires that record
    // to already exist).
    const decodedToken = await firebaseAdminAuth.verifyIdToken(
      authHeader.slice("Bearer ".length).trim(),
      true
    );

    const body = await request.json();
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: "Invalid request payload" },
        { status: 400 }
      );
    }
    const { email, name } = body;
    const verifiedEmail = sanitizeEmail(decodedToken.email);
    const requestedEmail = sanitizeEmail(email);
    const sanitizedName = sanitizeSingleLineText(name, 100);

    // This endpoint is called after Google OAuth to sync user with database
    if (
      !verifiedEmail ||
      !requestedEmail ||
      verifiedEmail !== requestedEmail ||
      sanitizedName.length < 2
    ) {
      return NextResponse.json(
        { success: false, error: "User identity does not match the Firebase token" },
        { status: 403 }
      );
    }

    await dbConnect();

    // Upsert only the fields controlled by the verified identity. Do not allow
    // callers to choose a role or another user's Firebase UID.
    const user = await User.findOneAndUpdate(
      { firebaseUid: decodedToken.uid },
      {
        $setOnInsert: {
          email: verifiedEmail,
          name: sanitizedName,
          role: "leader",
          firebaseUid: decodedToken.uid,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("User sync error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync user" },
      { status: 500 }
    );
  }
}
