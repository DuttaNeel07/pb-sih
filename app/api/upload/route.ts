import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "../../../lib/middleware/auth";
import { uploadToCloudinary } from "../../../lib/utils/cloudinary";

const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    try {
      await verifyAuth(request);
    } catch {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const requestedFolder = formData.get("folder");
    const folder =
      typeof requestedFolder === "string" &&
      /^[a-zA-Z0-9/_-]{1,100}$/.test(requestedFolder)
        ? requestedFolder
        : "sih-uploads";

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: "File size must not exceed 20MB" },
        { status: 413 }
      );
    }

    // Convert file to buffer for Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary - simplified to use buffer directly
    const result = await uploadToCloudinary(buffer, {
      folder,
      resource_type: "auto", // Auto-detect file type
      use_filename: true,
      unique_filename: true,
    });

    return NextResponse.json({
      success: true,
      file: {
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        size: result.bytes,
      },
    });
  } catch (error: unknown) {
    console.error("File upload error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
