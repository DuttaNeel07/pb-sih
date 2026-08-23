import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdminAuth } from "@/lib/middleware/adminAuth";
import { Team } from "@/models/Team";
import { sendEmail } from "@/lib/utils/email";
import {
  escapeHtml,
  isValidObjectId,
  sanitizeSingleLineText,
} from "@/lib/utils/validation";
import dbConnect from "@/lib/mongodb";

// PATCH /api/admin/teams/[teamId]/status - Update team status
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await context.params;

    if (!isValidObjectId(teamId)) {
      return NextResponse.json(
        { success: false, error: "Invalid team ID" },
        { status: 400 }
      );
    }

    // Verify admin authentication
    const isAuthenticated = await verifySuperAdminAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: "Admin authentication required" },
        { status: 401 }
      );
    }

    await dbConnect();

    const body = await request.json();
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: "Invalid request payload" },
        { status: 400 }
      );
    }
    const { status, sendCongratulationsEmail, teamName, problemStatement } =
      body;

    // Validate status
    const validStatuses = [
      "registered",
      "selected",
      "waitlisted",
      "rejected",
      "finalist",
    ];
    if (
      typeof status !== "string" ||
      !validStatuses.includes(status) ||
      (sendCongratulationsEmail !== undefined &&
        typeof sendCongratulationsEmail !== "boolean")
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid status" },
        { status: 400 }
      );
    }

    // Update team status
    const updatedTeam = await Team.findByIdAndUpdate(
      teamId,
      { status },
      { new: true }
    ).populate("leader", "name email");

    if (!updatedTeam) {
      return NextResponse.json(
        { success: false, error: "Team not found" },
        { status: 404 }
      );
    }

    // Send congratulations email if requested and status is "selected"
    if (
      sendCongratulationsEmail &&
      status === "selected" &&
      updatedTeam.leader
    ) {
      try {
        const selectedTeamName =
          typeof teamName === "string" && teamName.trim()
            ? teamName
            : updatedTeam.teamName;
        const safeTeamName = escapeHtml(selectedTeamName);
        const safeProblemStatement =
          typeof problemStatement === "string"
            ? escapeHtml(problemStatement)
            : "";
        const leader = updatedTeam.leader as unknown as {
          name: string;
          email: string;
        }; // Type assertion for populated field
        const safeLeaderName = escapeHtml(leader.name);
        const congratulationsHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Congratulations - Team Selected!</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .highlight { color: #667eea; font-weight: bold; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
              .emoji { font-size: 24px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="emoji">🎉</div>
                <h1>Congratulations!</h1>
                <h2>Your Team Has Been Selected!</h2>
              </div>
              <div class="content">
                <p>Dear <span class="highlight">${safeLeaderName}</span>,</p>
                
                <p>We are thrilled to inform you that your team <span class="highlight">"${safeTeamName}"</span> has been <strong>selected</strong> for the next round!</p>
                
                ${
                  problemStatement
                    ? `<p>Your innovative solution for <span class="highlight">"${safeProblemStatement}"</span> impressed our evaluators.</p>`
                    : ""
                }
                
                <p><strong>🏆 What this means:</strong></p>
                <ul>
                  <li>✅ Your team has successfully passed the evaluation round</li>
                  <li>🚀 You're now eligible for the next phase of the competition</li>
                  <li>💡 Your hard work and creativity have paid off!</li>
                </ul>
                
                <p><strong>📋 Next Steps:</strong></p>
                <ul>
                  <li>Keep an eye on your email for further instructions</li>
                  <li>Stay tuned for upcoming deadlines and requirements</li>
                  <li>Continue collaborating with your team members</li>
                </ul>
                
                <div style="text-align: center; margin: 30px 0;">
                  <p style="font-size: 18px; font-weight: bold; color: #667eea;">🌟 Well done, and best of luck for the next round! 🌟</p>
                </div>
                
                <p>If you have any questions, please don't hesitate to reach out to us.</p>
                
                <p>Warm regards,<br>
                <strong>SIH Admin Team</strong></p>
              </div>
              <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        await sendEmail({
          to: leader.email,
          subject: `🎉 Congratulations! Team "${sanitizeSingleLineText(
            selectedTeamName,
            100
          )}" Selected!`,
          html: congratulationsHTML,
          text: `Congratulations! Your team "${sanitizeSingleLineText(
            selectedTeamName,
            100
          )}" has been selected for the next round. Keep an eye on your email for further instructions.`,
        });
      } catch (emailError) {
        console.error("Failed to send congratulations email:", emailError);
        // Don't fail the whole request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "Team status updated successfully",
      team: {
        _id: updatedTeam._id,
        teamName: updatedTeam.teamName,
        status: updatedTeam.status,
        leader: updatedTeam.leader,
      },
    });
  } catch (error: unknown) {
    console.error("Update team status error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update team status" },
      { status: 500 }
    );
  }
}
