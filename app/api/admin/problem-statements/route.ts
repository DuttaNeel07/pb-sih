import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdminAuth } from "../../../../lib/middleware/adminAuth";
import {
  ProblemStatement,
  IProblemStatement,
} from "../../../../models/ProblemStatement";
import dbConnect from "../../../../lib/mongodb";
import * as XLSX from "xlsx";
import {
  isValidObjectId,
  sanitizeSingleLineText,
  sanitizeText,
  validateURL,
} from "../../../../lib/utils/validation";

const MAX_PROBLEM_STATEMENT_UPLOAD_BYTES = 20 * 1024 * 1024;

interface PSRowData {
  psNumber: string;
  title: string;
  description: string;
  domain: "Hardware" | "Software";
  link: string;
  maxTeams?: number;
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin
    await verifySuperAdminAuth(request);

    await dbConnect();

    const problemStatements = await ProblemStatement.find({}).sort({
      psNumber: 1,
    });

    return NextResponse.json({
      success: true,
      problemStatements: problemStatements.map((ps: IProblemStatement) => ({
        _id: ps._id,
        psNumber: ps.psNumber,
        title: ps.title,
        description: ps.description,
        domain: ps.domain,
        link: ps.link,
        teamCount: ps.teamCount,
        maxTeams: ps.maxTeams,
        isActive: ps.isActive,
        availableSlots: ps.maxTeams - ps.teamCount,
      })),
    });
  } catch (error: unknown) {
    console.error("Get problem statements error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to get problem statements" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin
    await verifySuperAdminAuth(request);

    await dbConnect();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "No file uploaded" },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_PROBLEM_STATEMENT_UPLOAD_BYTES) {
      return NextResponse.json(
        { success: false, error: "File must be greater than 0 and no more than 20MB" },
        { status: 413 }
      );
    }

    // Check file format
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".csv")) {
      return NextResponse.json(
        { success: false, error: "File must be .xlsx or .csv format" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    if (!sheetName || !worksheet) {
      return NextResponse.json(
        { success: false, error: "File does not contain a readable worksheet" },
        { status: 400 }
      );
    }
    const data = XLSX.utils.sheet_to_json(worksheet) as unknown[];

    if (!data || data.length === 0 || data.length > 5000) {
      return NextResponse.json(
        { success: false, error: "File is empty or invalid" },
        { status: 400 }
      );
    }

    const errors: string[] = [];
    const normalizedData: PSRowData[] = [];

    data.forEach((rawRow: unknown, index: number) => {
      const row =
        rawRow !== null && typeof rawRow === "object" && !Array.isArray(rawRow)
          ? (rawRow as Record<string, unknown>)
          : {};
      const psNumber = sanitizeSingleLineText(row.psNumber, 50);
      const title = sanitizeSingleLineText(row.title, 300);
      const description = sanitizeText(row.description, 10000);
      const domain = sanitizeSingleLineText(row.domain, 20);
      const link = sanitizeSingleLineText(row.link, 2048);
      const maxTeams =
        row.maxTeams === undefined || row.maxTeams === ""
          ? 3
          : Number(row.maxTeams);

      if (!psNumber) errors.push(`Row ${index + 1}: Missing psNumber`);
      if (!title) errors.push(`Row ${index + 1}: Missing title`);
      if (!description) errors.push(`Row ${index + 1}: Missing description`);
      if (domain !== "Hardware" && domain !== "Software") {
        errors.push(`Row ${index + 1}: Domain must be Hardware or Software`);
      }
      if (!link || !validateURL(link)) {
        errors.push(`Row ${index + 1}: Link must be a valid URL`);
      }
      if (!Number.isInteger(maxTeams) || maxTeams < 1 || maxTeams > 100000) {
        errors.push(`Row ${index + 1}: maxTeams must be between 1 and 100000`);
      }

      normalizedData.push({
        psNumber,
        title,
        description,
        domain: domain as PSRowData["domain"],
        link,
        maxTeams,
      });
    });

    if (errors.length > 0) {
      return NextResponse.json({ success: false, errors }, { status: 400 });
    }

    // Check for duplicate PS numbers
    const psNumbers = normalizedData.map((row) => row.psNumber);
    const duplicatePsNumbers = psNumbers.filter(
      (item, pos) => psNumbers.indexOf(item) !== pos
    );

    if (duplicatePsNumbers.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Duplicate PS Numbers found: ${duplicatePsNumbers.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Check if any PS numbers already exist in database
    const existingPs = await ProblemStatement.find({
      psNumber: { $in: psNumbers },
    });

    if (existingPs.length > 0) {
      const existingNumbers = existingPs.map(
        (ps: IProblemStatement) => ps.psNumber
      );
      return NextResponse.json(
        {
          success: false,
          error: `PS Numbers already exist: ${existingNumbers.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Create problem statements
    const problemStatements = normalizedData.map((row) => ({
      psNumber: row.psNumber,
      title: row.title,
      description: row.description,
      domain: row.domain,
      link: row.link,
      maxTeams: row.maxTeams || 3,
      isActive: true,
      teamCount: 0,
    }));

    const created = await ProblemStatement.insertMany(problemStatements);

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${created.length} problem statements`,
      count: created.length,
    });
  } catch (error: unknown) {
    console.error("Upload problem statements error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to upload problem statements" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authenticate admin
    await verifySuperAdminAuth(request);

    await dbConnect();

    const body = await request.json();
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: "Invalid request payload" },
        { status: 400 }
      );
    }
    const { psId, isActive } = body;

    if (!isValidObjectId(psId) || typeof isActive !== "boolean") {
      return NextResponse.json(
        { success: false, error: "PS ID and isActive status are required" },
        { status: 400 }
      );
    }

    const ps = await ProblemStatement.findByIdAndUpdate(
      psId,
      { isActive },
      { new: true }
    );

    if (!ps) {
      return NextResponse.json(
        { success: false, error: "Problem statement not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Problem statement ${
        isActive ? "activated" : "deactivated"
      } successfully`,
      problemStatement: {
        _id: ps._id,
        psNumber: ps.psNumber,
        title: ps.title,
        isActive: ps.isActive,
      },
    });
  } catch (error: unknown) {
    console.error("Update problem statement error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to update problem statement" },
      { status: 500 }
    );
  }
}
