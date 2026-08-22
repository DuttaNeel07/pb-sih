"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import TeamLeader from "@/components/registration/TeamLeader";
import TeamMembers from "@/components/registration/TeamMembers";

import CustomDropdown from "@/components/ui/CustomDropdown";
import AccordionSection from "@/components/ui/AccordionSection";
import ValidatedInput from "@/components/ui/ValidatedInput";
import { useAuth } from "@/lib/context/AuthContext";
import { validateNoDuplicates } from "@/lib/utils/client-validation";
import posthog from "posthog-js";

interface ProblemStatement {
  _id: string;
  psNumber: string;
  title: string;
  description: string;
  domain: string;
  link: string;
  availableSlots: number;
  maxTeams: number;
  isActive: boolean;
}

interface Team {
  _id: string;
  teamName: string;
  leader: string;
  members: unknown[];
  problemStatement: string;
  status: string;
}

interface ConflictDetail {
  email?: string;
  phone?: string;
  conflictingTeams: string[];
  memberType: string;
}

export default function Registration() {
  const { user, refreshTeamStatus } = useAuth();

  const [problemStatements, setProblemStatements] = useState<
    ProblemStatement[]
  >([]);
  const [existingTeam, setExistingTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [duplicateErrors, setDuplicateErrors] = useState<{
    emailDuplicates: { [key: string]: string };
    phoneDuplicates: { [key: string]: string };
  }>({ emailDuplicates: {}, phoneDuplicates: {} });

  const [formData, setFormData] = useState({
    teamName: "",
    problemStatement: "",
    teamLeader: {
      name: "",
      email: "",
      phone: "",
      year: "",
      branch: "",
      gender: "",
      otherGender: "",
    },
    members: [
      {
        name: "",
        email: "",
        phone: "",
        college: "",
        year: "",
        branch: "",
        gender: "",
        otherGender: "",
      },
      {
        name: "",
        email: "",
        phone: "",
        college: "",
        year: "",
        branch: "",
        gender: "",
        otherGender: "",
      },
      {
        name: "",
        email: "",
        phone: "",
        college: "",
        year: "",
        branch: "",
        gender: "",
        otherGender: "",
      },
      {
        name: "",
        email: "",
        phone: "",
        college: "",
        year: "",
        branch: "",
        gender: "",
        otherGender: "",
      },
      {
        name: "",
        email: "",
        phone: "",
        college: "",
        year: "",
        branch: "",
        gender: "",
        otherGender: "",
      },
    ],
    mentor: {
      name: "",
      email: "",
      phone: "",
      designation: "",
    },
  });

  // Check for duplicate emails and phone numbers
  const checkDuplicates = useCallback(() => {
    const duplicates = validateNoDuplicates({
      teamLeader: {
        email: formData.teamLeader.email,
        phone: formData.teamLeader.phone,
      },
      members: formData.members.map((member) => ({
        email: member.email,
        phone: member.phone,
      })),
    });
    setDuplicateErrors(duplicates);
    return (
      Object.keys(duplicates.emailDuplicates).length === 0 &&
      Object.keys(duplicates.phoneDuplicates).length === 0
    );
  }, [formData.teamLeader.email, formData.teamLeader.phone, formData.members]);

  // Helper functions to get specific duplicate errors
  const getDuplicateError = (fieldType: "email" | "phone", source: string) => {
    const errors =
      fieldType === "email"
        ? duplicateErrors.emailDuplicates
        : duplicateErrors.phoneDuplicates;
    return errors[source] || "";
  };

  // Helper functions for member errors
  const getMemberEmailError = (memberIndex: number) => {
    return getDuplicateError("email", `member ${memberIndex + 1}`);
  };

  const getMemberPhoneError = (memberIndex: number) => {
    return getDuplicateError("phone", `member ${memberIndex + 1}`);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!user || !isFormComplete) return;

    // Check for duplicates before submitting
    if (!checkDuplicates()) {
      alert(
        "Please fix duplicate email/phone number issues before submitting."
      );
      return;
    }

    setSubmitLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/sih/api/teamRegistration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await response.json(); // Process response
        posthog.capture("team_registration_completed", {
          member_count: formData.members.filter((member) => member.name && member.email && member.phone).length + 1,
          has_mentor: Boolean(formData.mentor.name),
        });
        alert("Team registered successfully!");
        // Refresh team status and redirect to team info
        await refreshTeamStatus();
        window.location.href = "/sih/team-info";
      } else {
        const error = await response.json();

        // Check if user is logged in as admin
        if (error.isAdmin) {
          alert(
            `Please logout as admin (${error.adminEmail}) first, then login as a regular user to register your team.`
          );
        } else {
          // Handle cross-team validation errors with detailed information
          if (error.duplicateDetails && (error.duplicateDetails.emailConflicts?.length > 0 || error.duplicateDetails.phoneConflicts?.length > 0)) {
            let detailedMessage = "Registration failed due to duplicate contact information:\n\n";
            
            // Show email conflicts
            if (error.duplicateDetails.emailConflicts?.length > 0) {
              detailedMessage += "📧 Email Conflicts:\n";
              error.duplicateDetails.emailConflicts.forEach((conflict: ConflictDetail) => {
                detailedMessage += `• ${conflict.memberType}: ${conflict.email}\n`;
                detailedMessage += `  Already used in: ${conflict.conflictingTeams.join(', ')}\n\n`;
              });
            }
            
            // Show phone conflicts
            if (error.duplicateDetails.phoneConflicts?.length > 0) {
              detailedMessage += "📱 Phone Conflicts:\n";
              error.duplicateDetails.phoneConflicts.forEach((conflict: ConflictDetail) => {
                detailedMessage += `• ${conflict.memberType}: ${conflict.phone}\n`;
                detailedMessage += `  Already used in: ${conflict.conflictingTeams.join(', ')}\n\n`;
              });
            }
            
            detailedMessage += "Please update the conflicting contact information and try again.";
            alert(detailedMessage);
          } else if (error.errors && Array.isArray(error.errors)) {
            // Handle array of error messages
            alert(`Registration failed:\n\n${error.errors.join('\n')}`);
          } else {
            // Handle generic errors
            alert(`Registration failed: ${error.error || error.message}`);
          }
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("An error occurred during registration.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleInputChange = (
    section: string,
    field: string,
    value: string,
    index?: number
  ) => {
    // Prevent email changes when it's locked (from Firebase)
    if (
      section === "teamLeader" &&
      field === "email" &&
      user &&
      formData.teamLeader.email === user.email
    ) {
      return; // Don't allow changes to locked email
    }

    if (section === "teamLeader") {
      setFormData((prev) => ({
        ...prev,
        teamLeader: { ...prev.teamLeader, [field]: value },
      }));
    } else if (section === "members" && typeof index === "number") {
      setFormData((prev) => ({
        ...prev,
        members: prev.members.map((member, i) =>
          i === index ? { ...member, [field]: value } : member
        ),
      }));
    } else if (section === "mentor") {
      setFormData((prev) => ({
        ...prev,
        mentor: { ...prev.mentor, [field]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  // Check if each step is completed
  const isTeamInfoComplete = formData.teamName && formData.problemStatement;

  const hasDuplicates =
    Object.keys(duplicateErrors.emailDuplicates).length > 0 ||
    Object.keys(duplicateErrors.phoneDuplicates).length > 0;

  // Check for team leader duplicates specifically
  const teamLeaderHasDuplicates =
    duplicateErrors.emailDuplicates["team leader"] ||
    duplicateErrors.phoneDuplicates["team leader"];

  const isTeamLeaderComplete =
    formData.teamLeader.name &&
    formData.teamLeader.email &&
    formData.teamLeader.phone &&
    formData.teamLeader.year &&
    formData.teamLeader.branch &&
    formData.teamLeader.gender &&
    !teamLeaderHasDuplicates;

  const isAtLeastOneMemberComplete = formData.members.some(
    (member) => member.name && member.email && member.phone
  );

  // Check if any members have duplicates
  const membersHaveDuplicates =
    Object.keys(duplicateErrors.emailDuplicates).some((key) =>
      key.includes("member")
    ) ||
    Object.keys(duplicateErrors.phoneDuplicates).some((key) =>
      key.includes("member")
    );

  const isTeamMembersComplete =
    isAtLeastOneMemberComplete && !membersHaveDuplicates;

  const canShowTeamMembers = true;
  const canShowSubmit = isTeamInfoComplete && isTeamLeaderComplete;
  const isFormComplete =
    isTeamInfoComplete &&
    isTeamLeaderComplete &&
    isAtLeastOneMemberComplete &&
    !hasDuplicates;

  // State for which sections are manually opened
  const [openSections, setOpenSections] = useState<{ [key: number]: boolean }>({
    1: true, // Team info is always open initially
    2: false,
    3: false,
  });

  const toggleSection = (section: number) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Auto-open next section when current is completed
  useEffect(() => {
    const isTeamLeaderSectionClosed = !openSections[2];
    if (isTeamInfoComplete && isTeamLeaderSectionClosed) {
      setOpenSections((prev) => ({ ...prev, 2: true, 1: false }));
    }
  }, [isTeamInfoComplete, openSections]);

  useEffect(() => {
    const isTeamMembersSectionClosed = !openSections[3];
    if (isTeamLeaderComplete && isTeamMembersSectionClosed) {
      setOpenSections((prev) => ({ ...prev, 3: true, 2: false }));
    }
  }, [isTeamLeaderComplete, openSections]);

  // Fetch problem statements and check for existing team
  useEffect(() => {
    const fetchData = async () => {
      if (!user || dataFetched) return;

      setLoading(true);
      try {
        // Fetch problem statements only once
        const psResponse = await fetch("/sih/api/problem-statements");
        if (psResponse.ok) {
          const psData = await psResponse.json();
          setProblemStatements(psData.problemStatements || []);
        }

        // Check for existing team registration
        const token = await user.getIdToken();
        const teamResponse = await fetch("/sih/api/teamRegistration", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (teamResponse.ok) {
          const teamData = await teamResponse.json();
          if (teamData.isRegistered && teamData.team) {
            setExistingTeam(teamData.team);
            console.log(teamData.message); // Log the message for debugging
          }
        }

        setDataFetched(true);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, dataFetched]);

  // Auto-fill team leader data from authenticated user
  useEffect(() => {
    if (
      user &&
      !formData.teamLeader.name &&
      !formData.teamLeader.email &&
      !existingTeam
    ) {
      setFormData((prev) => ({
        ...prev,
        teamLeader: {
          ...prev.teamLeader,
          name: user.displayName || "",
          email: user.email || "",
        },
      }));
    }
  }, [user, formData.teamLeader.name, formData.teamLeader.email, existingTeam]);

  // Check for duplicates whenever form data changes
  useEffect(() => {
    checkDuplicates();
  }, [checkDuplicates]);

  // Show loading spinner
  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-heading mx-auto mb-4"></div>
              <p className="text-text font-body">Loading...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Show existing team info if already registered
  if (existingTeam) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="max-w-4xl mx-auto px-6 py-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8"
            >
              <div className="text-center mb-8">
                <h1 className="text-4xl font-display text-heading mb-4">
                  Team Registration Complete
                </h1>
                <p className="text-subheading font-body">
                  Your team has been successfully registered!
                </p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-subheading text-sm font-medium mb-2">
                      Team Name
                    </label>
                    <p className="text-text bg-gray-800/30 border border-gray-600 rounded-lg px-4 py-3">
                      {existingTeam.teamName}
                    </p>
                  </div>
                  <div>
                    <label className="block text-subheading text-sm font-medium mb-2">
                      Status
                    </label>
                    <p className="text-text bg-gray-800/30 border border-gray-600 rounded-lg px-4 py-3 capitalize">
                      {existingTeam.status}
                    </p>
                  </div>
                </div>

                <div className="mt-8 text-center">
                  <p className="text-text font-body">
                    For any changes or queries, please contact the
                    administrators.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h1
              className="font-display text-5xl md:text-7xl font-light mb-8 tracking-tight leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <span className="text-heading">Team</span>
              <br />
              <span className="text-subheading">Registration</span>
            </motion.h1>

            <motion.p
              className="font-body text-lg text-gray-400 max-w-2xl mx-auto font-light leading-relaxed tracking-wide"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Register your team for the Smart India Hackathon 2026 Internal
              Round.
            </motion.p>
          </div>
        </section>

        {/* Registration Form */}
        <section className="pb-24 px-6">
          <div className="max-w-4xl mx-auto">
            {/* Progress Indicator */}
            <motion.div
              className="mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-400 tracking-wide">
                  Registration Progress
                </span>
                <span className="text-sm font-medium text-subheading tracking-wide">
                  Step{" "}
                  {isTeamInfoComplete
                    ? isTeamLeaderComplete
                      ? "3"
                      : "2"
                    : "1"}{" "}
                  of 3
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-heading to-subheading h-2 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{
                    width: isTeamInfoComplete
                      ? isTeamLeaderComplete
                        ? "100%"
                        : "66%"
                      : "33%",
                  }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span className={isTeamInfoComplete ? "text-heading" : ""}>
                  Team Info
                </span>
                <span className={isTeamLeaderComplete ? "text-heading" : ""}>
                  Team Leader
                </span>
                <span className={canShowTeamMembers ? "text-heading" : ""}>
                  Team Members
                </span>
              </div>
            </motion.div>

            <motion.form
              onSubmit={handleSubmit}
              className="space-y-12"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              {/* Step 1: Team Information */}
              <AccordionSection
                stepNumber={1}
                title="Team Information"
                isComplete={!!isTeamInfoComplete}
                isUnlocked={true}
                isOpen={openSections[1]}
                onToggle={() => toggleSection(1)}
                allowOverflow={true}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ValidatedInput
                    label="Team Name"
                    type="text"
                    value={formData.teamName}
                    onChange={(value) =>
                      handleInputChange("", "teamName", value)
                    }
                    placeholder="Enter your team name"
                    required
                    validationType="team name"
                  />
                  <div>
                    <CustomDropdown
                      options={problemStatements.map((ps) => ({
                        value: ps._id,
                        label: `${ps.psNumber}: ${ps.title}`,
                        description: `Available slots: ${ps.availableSlots}/${ps.maxTeams}`,
                      }))}
                      value={formData.problemStatement}
                      onChange={(value) =>
                        handleInputChange("", "problemStatement", value)
                      }
                      label="Problem Statement"
                      placeholder="Select a problem statement"
                      required
                    />
                  </div>
                </div>
              </AccordionSection>

              {/* Step 2: Team Leader */}
              <AccordionSection
                stepNumber={2}
                title="Team Leader Information"
                isComplete={!!isTeamLeaderComplete}
                isUnlocked={true}
                isOpen={openSections[2]}
                onToggle={() => toggleSection(2)}
                allowOverflow={true}
              >
                <TeamLeader
                  teamLeader={formData.teamLeader}
                  onInputChange={handleInputChange}
                  isDataFromAuth={
                    !!(
                      user &&
                      (formData.teamLeader.name || formData.teamLeader.email)
                    )
                  }
                  isEmailLocked={
                    !!(
                      user &&
                      formData.teamLeader.email &&
                      formData.teamLeader.email === user.email
                    )
                  }
                  emailError={getDuplicateError("email", "team leader")}
                  phoneError={getDuplicateError("phone", "team leader")}
                />
              </AccordionSection>

              {/* Step 3: Team Members */}
              <AccordionSection
                stepNumber={3}
                title="Team Members Information"
                isComplete={!!isTeamMembersComplete}
                isUnlocked={true}
                isOpen={openSections[3]}
                onToggle={() => toggleSection(3)}
                allowOverflow={true}
              >
                <TeamMembers
                  members={formData.members}
                  onInputChange={handleInputChange}
                  getEmailError={getMemberEmailError}
                  getPhoneError={getMemberPhoneError}
                />
              </AccordionSection>

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0.3, y: 20 }}
                animate={{
                  opacity: canShowSubmit ? 1 : 0.3,
                  y: canShowSubmit ? 0 : 20,
                }}
                transition={{ duration: 0.5 }}
              >
                {canShowSubmit ? (
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="px-12 py-5 bg-gradient-to-r from-heading to-subheading text-background rounded-full text-lg font-bold tracking-wide shadow-2xl font-body hover:shadow-heading/30 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitLoading ? "Submitting..." : "Submit Registration"}
                  </button>
                ) : (
                  <div className="text-center">
                    <div className="px-12 py-5 bg-gray-700 text-gray-400 rounded-full text-lg font-medium tracking-wide shadow-2xl font-body cursor-not-allowed">
                      {hasDuplicates
                        ? "Fix duplicate information to submit"
                        : "Complete required steps to submit"}
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.form>
          </div>
        </section>
      </div>
    </ProtectedRoute>
  );
}
