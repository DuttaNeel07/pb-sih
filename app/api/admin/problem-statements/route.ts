import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdminAuth } from "../../../../lib/middleware/adminAuth";
import {
  ProblemStatement,
  IProblemStatement,
} from "../../../../models/ProblemStatement";
import dbConnect from "../../../../lib/mongodb";
import * as XLSX from "xlsx";

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
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Check file format
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".csv")) {
      return NextResponse.json(
        { success: false, error: "File must be .xlsx or .csv format" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet) as PSRowData[];

    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, error: "File is empty or invalid" },
        { status: 400 }
      );
    }

    // Validate data structure
    const requiredFields = [
      "psNumber",
      "title",
      "description",
      "domain",
      "link",
    ];
    const errors: string[] = [];

    data.forEach((row: PSRowData, index: number) => {
      requiredFields.forEach((field) => {
        const value = row[field as keyof PSRowData];
        if (!value || String(value).trim() === "") {
          errors.push(`Row ${index + 1}: Missing ${field}`);
        }
      });
    });

    if (errors.length > 0) {
      return NextResponse.json({ success: false, errors }, { status: 400 });
    }

    // Check for duplicate PS numbers
    const psNumbers = data.map((row: PSRowData) => String(row.psNumber).trim());
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
    const problemStatements = data.map((row: PSRowData) => ({
      psNumber: String(row.psNumber).trim(),
      title: String(row.title).trim(),
      description: String(row.description).trim(),
      domain: String(row.domain).trim(),
      link: String(row.link).trim(),
      maxTeams: row.maxTeams ? parseInt(String(row.maxTeams)) : 3,
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
    const { psId, isActive } = body;

    if (!psId || typeof isActive !== "boolean") {
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
