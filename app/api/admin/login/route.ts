import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Admin } from "@/models/Admin";
import jwt from "jsonwebtoken";
import { sanitizeEmail } from "@/lib/utils/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: "Invalid request payload" },
        { status: 400 }
      );
    }
    const { email, password } = body;
    const normalizedEmail = sanitizeEmail(email);

    // Validate required fields
    if (
      !normalizedEmail ||
      typeof password !== "string" ||
      password.length === 0 ||
      password.length > 128
    ) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();

    // Find admin by email
    const admin = await Admin.findOne({ email: normalizedEmail });
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Get JWT secret from environment
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json(
        { success: false, error: "Authentication not configured" },
        { status: 500 }
      );
    }

    // Create JWT token
    const token = jwt.sign(
      {
        adminId: admin._id,
        email: admin.email,
        role: admin.role,
        isAdmin: true,
      },
      jwtSecret,
      { expiresIn: "24h" }
    );

    return NextResponse.json({
      success: true,
      message: "Admin login successful",
      token,
      admin: {
        _id: admin._id,
        email: admin.email,
        role: admin.role,
        isAuthenticated: true,
        createdAt: admin.createdAt,
      },
    });
  } catch (error: unknown) {
    console.error("Admin login error:", error);

    return NextResponse.json(
      { success: false, error: "Authentication failed" },
      { status: 500 }
    );
  }
}
