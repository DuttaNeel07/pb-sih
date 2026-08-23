import mongoose, { Document, Schema, Model, Types } from "mongoose";

// Team Member Interface
export interface ITeamMember {
  name: string;
  email: string;
  phone: string;
  gender: "male" | "female" | "other";
  college: string;
  year: string;
  branch: string;
}

// Task Submission Interface
export interface ITaskSubmission {
  taskId: Types.ObjectId;
  submittedAt: Date;
  files?: string[]; // Cloudinary URLs
  data?: Record<string, string | number>; // Form data submitted
  status: "submitted" | "reviewed" | "approved" | "rejected";
  feedback?: string;
}

// Team Interface
export interface ITeam extends Document {
  _id: Types.ObjectId;
  teamName: string;
  leader: Types.ObjectId; // Reference to User document
  members: ITeamMember[];
  problemStatement: Types.ObjectId; // Reference to ProblemStatement document
  status: "registered" | "selected" | "rejected" | "finalist";
  tasks: ITaskSubmission[];
  registrationDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Team Member Schema
const teamMemberSchema = new Schema<ITeamMember>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },
    college: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: String,
      required: true,
      trim: true,
    },
    branch: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false, // Don't create _id for subdocuments
  }
);

// Task Submission Schema
const taskSubmissionSchema = new Schema<ITaskSubmission>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    files: [
      {
        type: String, // Cloudinary URLs
      },
    ],
    data: {
      type: Schema.Types.Mixed, // Record<string, string | number>
    },
    status: {
      type: String,
      enum: ["submitted", "reviewed", "approved", "rejected"],
      default: "submitted",
    },
    feedback: {
      type: String,
    },
  },
  {
    _id: false,
  }
);

// Team Schema
const teamSchema = new Schema<ITeam>(
  {
    teamName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    leader: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: {
      type: [teamMemberSchema],
      required: true,
      validate: {
        validator: function (members: ITeamMember[]) {
          return members.length === 5;
        },
        message: "Team must have exactly 5 members (excluding leader)",
      },
    },
    problemStatement: {
      type: Schema.Types.ObjectId,
      ref: "ProblemStatement",
      required: true,
    },
    status: {
      type: String,
      enum: ["registered", "selected", "waitlisted", "rejected", "finalist"],
      default: "registered",
    },
    tasks: [taskSubmissionSchema],
    registrationDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// A leader may own at most one team. This database-level constraint closes
// the race between concurrent registration requests for the same user.
teamSchema.index({ leader: 1 }, { unique: true });

// Custom validation for gender diversity
teamSchema.pre("save", async function (next) {
  try {
    // Check if there's a female member in the team
    const hasFemaleMember = this.members.some(
      (member: ITeamMember) => member.gender?.toLowerCase() === "female"
    );

    // If no female member, check if leader is female
    if (!hasFemaleMember) {
      // Import User model dynamically to avoid circular dependency
      const { User } = await import("./User");

      // Use the same session if available to ensure we see the updated leader data
      const session = this.$session();
      const leader = await User.findById(this.leader).session(session);

      console.log("Team validation - Leader gender check:", {
        leaderId: this.leader,
        leader: leader
          ? {
              email: leader.email,
              gender: leader.gender,
              genderLower: leader.gender?.toLowerCase(),
            }
          : null,
      });

      if (!leader || leader.gender?.toLowerCase() !== "female") {
        const error = new Error(
          "Team must have at least one female member (including leader)"
        );
        return next(error);
      }
    }

    next();
  } catch (error) {
    console.error("Team validation error:", error);
    next(error instanceof Error ? error : new Error("Validation failed"));
  }
});

export const Team: Model<ITeam> =
  mongoose.models.Team || mongoose.model<ITeam>("Team", teamSchema);
