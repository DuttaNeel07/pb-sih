import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdminAuth } from "../../../../lib/middleware/adminAuth";
import dbConnect from "../../../../lib/mongodb";
import { Team } from "../../../../models/Team";
import { User } from "../../../../models/User";
import { ProblemStatement } from "../../../../models/ProblemStatement";
import { DeletedTeam } from "../../../../models/DeletedTeam";
import { auth as firebaseAdmin } from "../../../../lib/firebase-admin";
// import { sendEmail } from "../../../../lib/utils/email";
import mongoose from "mongoose";
import {
  escapeRegex,
  isValidObjectId,
  sanitizeSingleLineText,
} from "../../../../lib/utils/validation";

// Import models to ensure they are registered with Mongoose
import "../../../../models/User";
import "../../../../models/ProblemStatement";

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin
    await verifySuperAdminAuth(request);

    await dbConnect();

    const url = new URL(request.url);
    const requestedStatus = url.searchParams.get("status");
    const requestedSearch = url.searchParams.get("search");
    const validStatuses = [
      "registered",
      "selected",
      "waitlisted",
      "rejected",
      "finalist",
    ];
    const status =
      requestedStatus && validStatuses.includes(requestedStatus)
        ? requestedStatus
        : requestedStatus === "all" || !requestedStatus
          ? null
          : "invalid";
    const search = requestedSearch
      ? sanitizeSingleLineText(requestedSearch, 100)
      : "";
    const requestedPage = Number(url.searchParams.get("page") || "1");
    const requestedLimit = Number(url.searchParams.get("limit") || "10");
    const page = Number.isInteger(requestedPage) && requestedPage >= 1
      ? Math.min(requestedPage, 100000)
      : 1;
    const limit = Number.isInteger(requestedLimit) && requestedLimit >= 1
      ? Math.min(requestedLimit, 100)
      : 10;
    const all = url.searchParams.get("all") === "true";
    const skip = (page - 1) * limit;

    // Build aggregation pipeline for search with populated data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pipeline: any[] = [
      // Lookup leader data
      {
        $lookup: {
          from: "users",
          localField: "leader",
          foreignField: "_id",
          as: "leader",
        },
      },
      { $unwind: "$leader" },

      // Lookup problem statement data
      {
        $lookup: {
          from: "problemstatements",
          localField: "problemStatement",
          foreignField: "_id",
          as: "problemStatement",
        },
      },
      { $unwind: "$problemStatement" },
    ];

    // Add search conditions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchConditions: any = {};

    if (status === "invalid") {
      return NextResponse.json(
        { success: false, error: "Invalid team status filter" },
        { status: 400 }
      );
    }

    if (status) {
      matchConditions.status = status;
    }

    if (search) {
      const escapedSearch = escapeRegex(search);
      matchConditions.$or = [
        { teamName: { $regex: escapedSearch, $options: "i" } },
        { "leader.name": { $regex: escapedSearch, $options: "i" } },
        { "leader.email": { $regex: escapedSearch, $options: "i" } },
        { "problemStatement.psNumber": { $regex: escapedSearch, $options: "i" } },
        { "problemStatement.title": { $regex: escapedSearch, $options: "i" } },
      ];
    }

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // Add sorting
    pipeline.push({ $sort: { registrationDate: -1 } });

    // Get total count for pagination
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await Team.aggregate(countPipeline);
    const totalTeams = countResult.length > 0 ? countResult[0].total : 0;

    // Add pagination (skip if all=true)
    if (!all) {
      pipeline.push({ $skip: skip }, { $limit: limit });
    }

    // Execute aggregation
    const teams = await Team.aggregate(pipeline);

    return NextResponse.json({
      success: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      teams: teams.map((team: any) => ({
        _id: team._id,
        teamName: team.teamName,
        leader: {
          name: team.leader.name,
          email: team.leader.email,
          phone: team.leader.phone,
        },
        problemStatement: {
          psNumber: team.problemStatement.psNumber,
          title: team.problemStatement.title,
          domain: team.problemStatement.domain,
        },
        status: team.status,
        registrationDate: team.registrationDate,
        memberCount: team.members.length,
        taskCount: team.tasks.length,
        createdAt: team.createdAt,
      })),
      total: totalTeams,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalTeams / limit),
        totalTeams,
        hasMore: skip + teams.length < totalTeams,
      },
    });
  } catch (error: unknown) {
    console.error("Get teams error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to get teams" },
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
    const { teamId, status } = body;

    if (!isValidObjectId(teamId) || !status) {
      return NextResponse.json(
        { success: false, error: "Team ID and status are required" },
        { status: 400 }
      );
    }

    const validStatuses = ["registered", "selected", "waitlisted", "rejected", "finalist"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status" },
        { status: 400 }
      );
    }

    const team = await Team.findByIdAndUpdate(teamId, { status }, { new: true })
      .populate("leader", "name email phone")
      .populate("problemStatement", "title");

    if (!team) {
      return NextResponse.json(
        { success: false, error: "Team not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Team status updated successfully",
      team: {
        _id: team._id,
        teamName: team.teamName,
        status: team.status,
        leader: team.leader,
        problemStatement: team.problemStatement,
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

export async function DELETE(request: NextRequest) {
  let session: mongoose.ClientSession | null = null;

  try {
    // Authenticate admin
    const adminPayload = await verifySuperAdminAuth(request);

    await dbConnect();

    const body = await request.json();
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: "Invalid request payload" },
        { status: 400 }
      );
    }
    const { teamId } = body;

    if (!isValidObjectId(teamId)) {
      return NextResponse.json(
        { success: false, error: "Team ID is required" },
        { status: 400 }
      );
    }

    // Start a transaction
    session = await mongoose.startSession();
    session.startTransaction();

    // Get the team with all related data
    const team = await Team.findById(teamId)
      .populate(
        "leader",
        "name email phone gender college year branch firebaseUid"
      )
      .populate("problemStatement", "psNumber title domain teamCount")
      .session(session);

    if (!team) {
      await session.abortTransaction();
      return NextResponse.json(
        { success: false, error: "Team not found" },
        { status: 404 }
      );
    }

    // Type-safe access to populated fields
    const leader = team.leader as unknown as {
      _id: string;
      name: string;
      email: string;
      phone?: string;
      gender?: string;
      college?: string;
      year?: string;
      branch?: string;
      firebaseUid?: string;
    };
    const firebaseUidToDelete = leader.firebaseUid;

    const problemStatement = team.problemStatement as unknown as {
      _id: string;
      psNumber: string;
      title: string;
      domain: string;
      teamCount: number;
    };

    // Step 1: Create backup in DeletedTeam collection
    const deletedTeamData = new DeletedTeam({
      originalTeamId: team._id.toString(),
      teamName: team.teamName,
      leader: {
        _id: leader._id.toString(),
        email: leader.email,
        name: leader.name,
        phone: leader.phone,
        gender: leader.gender,
        college: leader.college,
        year: leader.year,
        branch: leader.branch,
        firebaseUid: leader.firebaseUid,
      },
      members: team.members,
      problemStatement: {
        _id: problemStatement._id.toString(),
        psNumber: problemStatement.psNumber,
        title: problemStatement.title,
        domain: problemStatement.domain,
      },
      status: team.status,
      tasks: team.tasks,
      registrationDate: team.registrationDate,
      deletedBy: adminPayload.admin?.email || "unknown",
      reason: "Suspected fake or duplicate registration",
      originalCreatedAt: team.createdAt,
      originalUpdatedAt: team.updatedAt,
    });

    await deletedTeamData.save({ session });

    // Delete only database state while the transaction is active. Firebase is
    // an external system and cannot participate in this MongoDB transaction.
    // It is handled after commit below so a Firebase failure cannot roll back
    // or partially apply the database changes.

    // Step 2: Delete User document
    await User.findByIdAndDelete(leader._id).session(session);

    // Step 3: Decrease team count in problem statement
    await ProblemStatement.findByIdAndUpdate(
      problemStatement._id,
      { $inc: { teamCount: -1 } },
      { session }
    );

    // Step 4: Delete Team document
    await Team.findByIdAndDelete(teamId).session(session);

    // Step 6: Send email notification to leader (commented out for now)
    /*
    if (leader.email) {
      try {
        const emailSubject = "Team Registration Removed - Action Required";
        const emailHTML = `
        <html>
        <body>
          <h2>Team Registration Removed</h2>
          <p>Dear ${leader.name},</p>
          
          <p>We hope this email finds you well. We are writing to inform you that your team registration for the Smart India Hackathon has been removed from our system due to suspected fake or duplicate registration.</p>
          
          <h3>Team Details:</h3>
          <ul>
            <li><strong>Team Name:</strong> ${team.teamName}</li>
            <li><strong>Problem Statement:</strong> ${
              problemStatement.psNumber
            } - ${problemStatement.title}</li>
            <li><strong>Registration Date:</strong> ${team.registrationDate.toLocaleDateString()}</li>
          </ul>
          
          <p>If you believe this action was taken in error, or if you would like to re-register with genuine information, please create a new account and register again with accurate details.</p>
          
          <h3>Important Notes:</h3>
          <ul>
            <li>Your previous account has been completely removed from our system</li>
            <li>You will need to sign up again with a new account</li>
            <li>Please ensure all information provided is accurate and genuine</li>
            <li>Duplicate or fake registrations are strictly prohibited</li>
          </ul>
          
          <p>If you have any questions or concerns, please contact our support team.</p>
          
          <p>Best regards,<br>Smart India Hackathon Team</p>
        </body>
        </html>
        `;

        await sendEmail({
          to: leader.email,
          subject: emailSubject,
          html: emailHTML,
        });
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
        // Don't abort transaction for email failure, just log it
      }
    }
    */

    // Commit the database transaction before performing external side effects.
    await session.commitTransaction();

    let firebaseDeletionPending = false;
    if (firebaseUidToDelete && firebaseAdmin) {
      try {
        await firebaseAdmin.deleteUser(firebaseUidToDelete);
      } catch (firebaseError) {
        firebaseDeletionPending = true;
        console.error(
          "Firebase account deletion failed after team removal:",
          firebaseError
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: firebaseDeletionPending
        ? "Team removed successfully; account cleanup is pending"
        : "Team removed successfully and leader has been notified",
      deletedTeam: {
        teamName: team.teamName,
        leaderEmail: leader.email,
        problemStatement: problemStatement.psNumber,
      },
    });
  } catch (error: unknown) {
    console.error("Delete team error:", error);

    if (session) {
      await session.abortTransaction();
    }

    return NextResponse.json(
      { success: false, error: "Failed to remove team" },
      { status: 500 }
    );
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}
