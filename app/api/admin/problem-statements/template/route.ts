import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdminAuth } from "../../../../../lib/middleware/adminAuth";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin
    await verifySuperAdminAuth(request);
    // Sample data for the template
    const sampleData = [
      {
        psNumber: "SIH001",
        title: "AI for Agriculture",
        description:
          "Create an AI model to detect crop diseases using image recognition and provide treatment recommendations.",
        domain: "Software",
        link: "https://example.com/problem-statement-1",
        maxTeams: 3,
      },
      {
        psNumber: "SIH002",
        title: "Blockchain for Healthcare",
        description:
          "Develop a secure blockchain-based system for managing patient medical records and ensuring data privacy.",
        domain: "Software",
        link: "https://example.com/problem-statement-2",
        maxTeams: 3,
      },
      {
        psNumber: "SIH003",
        title: "Smart Traffic Management",
        description:
          "Design an intelligent traffic management system using IoT sensors and machine learning algorithms.",
        domain: "Hardware",
        link: "https://example.com/problem-statement-3",
        maxTeams: 3,
      },
    ];

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Create worksheet from sample data
    const worksheet = XLSX.utils.json_to_sheet(sampleData);

    // Set column widths for better readability
    const columnWidths = [
      { wch: 10 }, // psNumber
      { wch: 25 }, // title
      { wch: 50 }, // description
      { wch: 20 }, // domain
      { wch: 40 }, // link
      { wch: 10 }, // maxTeams
    ];
    worksheet["!cols"] = columnWidths;

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Problem Statements");

    // Generate buffer
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
    });

    // Set headers for file download
    const headers = new Headers();
    headers.set(
      "Content-Disposition",
      'attachment; filename="problem_statements_template.xlsx"'
    );
    headers.set(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: headers,
    });
  } catch (error: unknown) {
    console.error("Template generation error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to generate template" },
      { status: 500 }
    );
  }
}
