import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "../../../../lib/middleware/auth";
import { Team } from "../../../../models/Team";
import { User } from "../../../../models/User";
import { ProblemStatement } from "../../../../models/ProblemStatement";
import { DeletedTeam } from "../../../../models/DeletedTeam";
import { auth as firebaseAdmin } from "../../../../lib/firebase-admin";
// import { sendEmail } from "../../../../lib/utils/email";
import dbConnect from "../../../../lib/mongodb";
import mongoose from "mongoose";

export async function POST(request: NextRequest) {
  let session: mongoose.ClientSession | null = null;

  try {
    console.log("🔥 Team withdrawal request initiated");
    
    // Authenticate user
    const authenticatedRequest = await verifyAuth(request);
    const user = authenticatedRequest.user;

    if (!user) {
      console.log("❌ Withdrawal attempt without authentication");
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    console.log(`👤 Withdrawal request by user: ${user.email} (${user._id})`);
    console.log(`🎯 User role: ${user.role}`);

    await dbConnect();

    // Check if user is a team leader
    if (user.role !== "leader") {
      console.log(`❌ Non-leader attempted withdrawal: ${user.email} (role: ${user.role})`);
      return NextResponse.json(
        {
          success: false,
          error: "Only team leaders can withdraw their team",
        },
        { status: 403 }
      );
    }

    console.log("✅ User is confirmed as team leader");

    // Start a transaction
    session = await mongoose.startSession();
    session.startTransaction();
    console.log("🔄 Database transaction started");

    // Get the team with all related data - ONLY for the current user as leader
    const team = await Team.findOne({ leader: user._id })
      .populate(
        "leader",
        "name email phone gender college year branch firebaseUid"
      )
      .populate("problemStatement", "psNumber title domain teamCount")
      .session(session);

    if (!team) {
      console.log(`❌ No team found for user: ${user.email} (${user._id})`);
      await session.abortTransaction();
      return NextResponse.json(
        { success: false, error: "No team found for this user. You can only withdraw a team where you are the leader." },
        { status: 404 }
      );
    }

    console.log(`📋 Team found: ${team.teamName} (ID: ${team._id})`);

    // Additional security check: Verify the leader ID matches the authenticated user
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

    // Double-check that the team leader's ID matches the authenticated user's ID
    if (leader._id.toString() !== user._id.toString()) {
      console.log(`🚨 SECURITY ALERT: User ID mismatch! Auth user: ${user._id}, Team leader: ${leader._id}`);
      await session.abortTransaction();
      return NextResponse.json(
        { 
          success: false, 
          error: "Unauthorized: You can only withdraw your own team" 
        },
        { status: 403 }
      );
    }

    // Additional check: Verify the Firebase UID matches (if available)
    if (leader.firebaseUid && leader.firebaseUid !== user.firebaseUid) {
      console.log(`🚨 SECURITY ALERT: Firebase UID mismatch! Auth UID: ${user.firebaseUid}, Leader UID: ${leader.firebaseUid}`);
      await session.abortTransaction();
      return NextResponse.json(
        { 
          success: false, 
          error: "Authentication mismatch: Cannot verify team ownership" 
        },
        { status: 403 }
      );
    }

    console.log("🔒 Security checks passed - user authorized to withdraw team");

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
      deletedBy: leader.email,
      reason: "Team withdrawal by leader",
      originalCreatedAt: team.createdAt,
      originalUpdatedAt: team.updatedAt,
    });

    await deletedTeamData.save({ session });

    // Step 2: Delete Firebase account if exists
    if (leader.firebaseUid && firebaseAdmin) {
      try {
        await firebaseAdmin.deleteUser(leader.firebaseUid);
      } catch (firebaseError) {
        console.error("Failed to delete Firebase account:", firebaseError);
        await session.abortTransaction();
        return NextResponse.json(
          { success: false, error: "Failed to delete Firebase account" },
          { status: 500 }
        );
      }
    }

    // Step 3: Delete User document
    await User.findByIdAndDelete(leader._id).session(session);

    // Step 4: Decrease team count in problem statement
    await ProblemStatement.findByIdAndUpdate(
      problemStatement._id,
      { $inc: { teamCount: -1 } },
      { session }
    );

    // Step 5: Delete Team document
    await Team.findByIdAndDelete(team._id).session(session);

    // Step 6: Send email notification to leader (commented out for now)
    /*
    if (leader.email) {
      try {
        const emailSubject = "Team Withdrawal Confirmation - Smart India Hackathon 2026";
        const emailHTML = `
        <html>
        <body>
          <h2>Team Withdrawal Confirmation</h2>
          <p>Dear ${leader.name},</p>
          
          <p>We have successfully processed your team withdrawal from the Smart India Hackathon 2026.</p>
          
          <h3>Withdrawn Team Details:</h3>
          <ul>
            <li><strong>Team Name:</strong> ${team.teamName}</li>
            <li><strong>Problem Statement:</strong> ${
              problemStatement.psNumber
            } - ${problemStatement.title}</li>
            <li><strong>Withdrawal Date:</strong> ${new Date().toLocaleDateString()}</li>
          </ul>
          
          <p>Your team registration has been completely removed from our system. If you wish to participate again, you will need to create a new account and register with a new team.</p>
          
          <h3>Important Notes:</h3>
          <ul>
            <li>Your account has been completely removed from our system</li>
            <li>All team data has been archived for record-keeping purposes</li>
            <li>The problem statement slot is now available for other teams</li>
            <li>You can create a new account if you decide to participate again</li>
          </ul>
          
          <p>Thank you for your interest in the Smart India Hackathon. We hope to see you in future events!</p>
          
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

    // Commit the transaction
    await session.commitTransaction();
    console.log("✅ Transaction committed successfully");

    console.log(`🎉 Team withdrawal completed: ${team.teamName} by ${leader.email}`);

    return NextResponse.json({
      success: true,
      message: "Team withdrawal successful. Your account has been removed.",
      withdrawnTeam: {
        teamName: team.teamName,
        leaderEmail: leader.email,
        problemStatement: problemStatement.psNumber,
      },
    });
  } catch (error: unknown) {
    console.error("❌ Team withdrawal error:", error);

    if (session) {
      console.log("🔄 Aborting transaction due to error");
      await session.abortTransaction();
    }

    return NextResponse.json(
      { success: false, error: "Failed to withdraw team" },
      { status: 500 }
    );
  } finally {
    if (session) {
      console.log("🔚 Ending database session");
      await session.endSession();
    }
  }
}
