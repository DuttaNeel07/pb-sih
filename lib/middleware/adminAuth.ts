import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import { Admin } from "@/models/Admin";

export interface AdminAuthenticatedRequest extends NextRequest {
  admin?: {
    _id: string;
    email: string;
    role: string;
    isAuthenticated: boolean;
  };
}

export async function verifyAdminAuth(
  request: NextRequest
): Promise<AdminAuthenticatedRequest> {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("No admin credentials provided");
    }

    // Extract Bearer token (JWT)
    const token = authHeader.split(" ")[1];

    // Get JWT secret from environment
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT secret not configured");
    }

    // Verify JWT token
    const decoded = jwt.verify(token, jwtSecret) as {
      adminId: string;
      email: string;
      isAdmin: boolean;
    };

    if (!decoded.isAdmin) {
      throw new Error("Invalid admin token");
    }

    // Connect to database and verify admin still exists
    await dbConnect();
    const admin = await Admin.findById(decoded.adminId);

    if (!admin) {
      throw new Error("Admin not found");
    }

    if (!admin.isActive) {
      throw new Error("Admin account is inactive");
    }

    const authenticatedRequest = request as AdminAuthenticatedRequest;
    authenticatedRequest.admin = {
      _id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
      isAuthenticated: true,
    };

    return authenticatedRequest;
  } catch (error) {
    console.error("Admin auth verification error:", error);
    throw new Error("Admin authentication failed");
  }
}

/** Verify a token belongs to an active super-admin, not merely any admin. */
export async function verifySuperAdminAuth(
  request: NextRequest
): Promise<AdminAuthenticatedRequest> {
  const authenticatedRequest = await verifyAdminAuth(request);

  if (authenticatedRequest.admin?.role !== "super-admin") {
    throw new Error("Super admin access required");
  }

  return authenticatedRequest;
}
