"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import WithdrawButton from "@/components/WithdrawButton";
import { useAuth } from "@/lib/context/AuthContext";
import { ExternalLink, FileText, Download, MessageCircle, Calendar, MapPin } from "lucide-react";

interface TeamMember {
  name: string;
  email: string;
  phone: string;
  college: string;
  branch: string;
  year: string;
  gender: string;
}

interface ProblemStatement {
  _id: string;
  psNumber: string;
  title: string;
  description: string;
  domain: string;
}

interface Team {
  _id: string;
  teamName: string;
  leader?: {
    name: string;
    email: string;
    phone: string;
    branch: string;
    year: string;
    gender: string;
  };
  members: TeamMember[];
  problemStatement: ProblemStatement;
  status: string;
  registrationDate?: string;
  createdAt?: string;
}

export default function TeamInfo() {
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const registrationDate = team?.registrationDate || team?.createdAt;

  useEffect(() => {
    const fetchTeamData = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const token = await user.getIdToken();
        const response = await fetch("/sih/api/teamRegistration", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setTeam(data.team);
        }
      } catch (error) {
        console.error("Error fetching team data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [user]);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-heading mx-auto mb-4"></div>
              <p className="text-text font-body">Loading team information...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!team) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="max-w-4xl mx-auto px-6 py-20">
            <div className="text-center">
              <h1 className="text-4xl font-display text-heading mb-4">
                No Team Found
              </h1>
              <p className="text-text font-body mb-8">
                You are not registered with any team yet.
              </p>
              <Link
                href="/registration"
                className="px-8 py-3 bg-gradient-to-r from-heading to-subheading text-background rounded-full text-lg font-bold tracking-wide shadow-2xl font-body hover:shadow-heading/30 hover:shadow-lg transition-all duration-300"
              >
                Register Your Team
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />

        <div className="max-w-6xl mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 mt-5"
          >
            {/* You're All Set Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-500/30 rounded-2xl p-8 text-center mb-8"
            >
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-3xl font-display text-green-400 mb-4">
                  You&apos;re All Set! 🎉
                </h2>
                <p className="text-green-200 font-body text-lg mb-6">
                  Your team has been successfully registered for the Smart India Hackathon 2026 Internal Round.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="flex items-center justify-center gap-3 p-4 bg-gray-800/30 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <div className="text-left">
                    <p className="text-sm text-gray-400">Date</p>
                    <p className="text-white font-medium">5th September</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-3 p-4 bg-gray-800/30 rounded-lg">
                  <MapPin className="w-5 h-5 text-red-400" />
                  <div className="text-left">
                    <p className="text-sm text-gray-400">Venue</p>
                    <p className="text-white font-medium">Online</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-3 p-4 bg-gray-800/30 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-green-400" />
                  <div className="text-left">
                    <p className="text-sm text-gray-400">Updates</p>
                    <p className="text-white font-medium">WhatsApp Group</p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-gray-300 font-body mb-4">
                  Stay updated with all the latest information and announcements.
                </p>
                <p className="text-subheading text-sm font-body">
                  Registration Date: {registrationDate
                    ? new Date(registrationDate).toLocaleDateString("en-IN")
                    : "—"}
                </p>
              </div>
            </motion.div>

            {/* WhatsApp Group Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 mb-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-display text-heading mb-4">
                  Join WhatsApp Group
                </h2>
                <p className="text-subheading font-body">
                  <strong className="text-red-400">Compulsory</strong> - All participants must join for updates and announcements
                </p>
              </div>

              <div className="flex justify-center">
                <div className="text-center">
                  <div className="w-48 h-48 bg-white rounded-2xl p-4 mb-4 mx-auto shadow-2xl">
                    <img 
                      src="/sih/sihqr.jpg" 
                      alt="WhatsApp QR Code" 
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                  <p className="text-sm text-gray-400 mb-3">
                    Scan this QR code with your phone to join the group
                  </p>
                  <div className="max-w-md mx-auto text-center text-xs sm:text-sm text-gray-400 border-t border-gray-800/60 pt-4">
                    <p className="font-semibold mb-1 text-red-400">WhatsApp Group Guidelines</p>
                    <p className="leading-relaxed">
                      This is a professional group exclusively for information sharing and doubts. No irrational or disrespectful behavior will be entertained.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Important Documents Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-4 sm:p-6 md:p-8 mb-8"
            >
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-display text-heading mb-4">
                  Important Documents
                </h2>
                <p className="text-subheading font-body text-sm sm:text-base">
                  Download these required documents for the hackathon
                </p>
              </div>

              {/* Important Notice */}
              <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 bg-amber-500/20 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-500 rounded-full"></div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-200 mb-2 text-sm sm:text-base">Important Notice</h3>
                    <p className="text-amber-100/80 text-xs sm:text-sm leading-relaxed">
                      The <strong>PPT template is mandatory</strong> for the actual hackathon presentation. 
                      The guidelines are for your reference to understand the rules and requirements.
                    </p>
                  </div>
                </div>
              </div>

              {/* Documents List */}
              <div className="space-y-4 sm:space-y-6">
                {/* PPT Template */}
                <motion.div
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 bg-gray-800/30 rounded-xl border border-gray-700 hover:border-heading/30 transition-all duration-300 gap-4"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-white mb-1 text-sm sm:text-base">SIH 2026 Idea Presentation Format</h3>
                      <p className="text-gray-400 text-xs sm:text-sm">PowerPoint template for your hackathon presentation</p>
                    </div>
                  </div>
                  <a
                    href="https://www.sih.gov.in/letters/2026/SIH2026-IDEA-Presentation-Format.pptx"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 text-sm sm:text-base w-full sm:w-auto"
                  >
                    <Download className="w-4 h-4" />
                    Download
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </motion.div>

                {/* Guidelines */}
                <motion.div
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 bg-gray-800/30 rounded-xl border border-gray-700 hover:border-heading/30 transition-all duration-300 gap-4"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-white mb-1 text-sm sm:text-base">SIH 2026 Official Guidelines</h3>
                      <p className="text-gray-400 text-xs sm:text-sm">Reference document for rules and requirements</p>
                    </div>
                  </div>
                  <a
                    href="https://sih.gov.in/letters/2026/SIH%202026%20Guidelines.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 text-sm sm:text-base w-full sm:w-auto"
                  >
                    <Download className="w-4 h-4" />
                    Download
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </motion.div>
              </div>

              {/* Additional Info */}
              <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-gray-800/20 rounded-lg border border-gray-700">
                <div className="flex items-start gap-3">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 bg-blue-500/20 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full"></div>
                  </div>
                  <div>
                    <h4 className="font-medium text-white mb-2 text-sm sm:text-base">What to do with these documents?</h4>
                    <ul className="text-gray-300 text-xs sm:text-sm space-y-1">
                      <li>• Use the PPT template for your hackathon presentation (mandatory)</li>
                      <li>• Review the guidelines to understand rules and requirements</li>
                      <li>• Follow the presentation format structure during the hackathon</li>
                      <li>• Keep the template ready for the actual event</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-display text-heading mb-4">
                Team Information
              </h1>
              <p className="text-subheading font-body">
                Your registered team details
              </p>
            </div>

            {/* Team Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8"
            >
              <h2 className="text-2xl font-display text-heading mb-6">
                Team Overview
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-subheading text-sm font-medium mb-2">
                    Team Name
                  </label>
                  <p className="text-text bg-gray-800/30 border border-gray-600 rounded-lg px-4 py-3">
                    {team.teamName}
                  </p>
                </div>
                <div>
                  <label className="block text-subheading text-sm font-medium mb-2">
                    Registration Status
                  </label>
                  <p className="text-text bg-gray-800/30 border border-gray-600 rounded-lg px-4 py-3 capitalize">
                    {team.status}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Problem Statement */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8"
            >
              <h2 className="text-2xl font-display text-heading mb-6">
                Problem Statement
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-subheading text-sm font-medium mb-2">
                    Title
                  </label>
                  <p className="text-text bg-gray-800/30 border border-gray-600 rounded-lg px-4 py-3">
                    {team.problemStatement.psNumber}:{" "}
                    {team.problemStatement.title}
                  </p>
                </div>
                <div>
                  <label className="block text-subheading text-sm font-medium mb-2">
                    Description
                  </label>
                  <p className="text-text bg-gray-800/30 border border-gray-600 rounded-lg px-4 py-3">
                    {team.problemStatement.description}
                  </p>
                </div>
                <div>
                  <label className="block text-subheading text-sm font-medium mb-2">
                    Domain
                  </label>
                  <p className="text-text bg-gray-800/30 border border-gray-600 rounded-lg px-4 py-3">
                    {team.problemStatement.domain}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Team Leader */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8"
            >
              <h2 className="text-2xl font-display text-heading mb-6">
                Team Leader
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-subheading text-sm font-medium mb-2">
                    Name
                  </label>
                  <p className="text-text bg-gray-800/30 border border-gray-600 rounded-lg px-4 py-3">
                    {team.leader?.name || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-subheading text-sm font-medium mb-2">
                    Email
                  </label>
                  <p className="text-text bg-gray-800/30 border border-gray-600 rounded-lg px-4 py-3">
                    {team.leader?.email || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-subheading text-sm font-medium mb-2">
                    Phone
                  </label>
                  <p className="text-text bg-gray-800/30 border border-gray-600 rounded-lg px-4 py-3">
                    {team.leader?.phone || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-subheading text-sm font-medium mb-2">
                    Branch
                  </label>
                  <p className="text-text bg-gray-800/30 border border-gray-600 rounded-lg px-4 py-3">
                    {team.leader?.branch || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-subheading text-sm font-medium mb-2">
                    Year
                  </label>
                  <p className="text-text bg-gray-800/30 border border-gray-600 rounded-lg px-4 py-3">
                    {team.leader?.year || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-subheading text-sm font-medium mb-2">
                    Gender
                  </label>
                  <p className="text-text bg-gray-800/30 border border-gray-600 rounded-lg px-4 py-3">
                    {team.leader?.gender || "N/A"}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Team Members */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8"
            >
              <h2 className="text-2xl font-display text-heading mb-6">
                Team Members
              </h2>
              <div className="space-y-6">
                {team.members.map((member, index) => (
                  <div
                    key={index}
                    className="border border-gray-700 rounded-xl p-6"
                  >
                    <h3 className="text-lg font-medium text-subheading mb-4">
                      Member {index + 1}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-subheading text-xs font-medium mb-1">
                          Name
                        </label>
                        <p className="text-text bg-gray-800/30 border border-gray-600 rounded-md px-3 py-2 text-sm">
                          {member.name}
                        </p>
                      </div>
                      <div>
                        <label className="block text-subheading text-xs font-medium mb-1">
                          Email
                        </label>
                        <p className="text-text bg-gray-800/30 border border-gray-600 rounded-md px-3 py-2 text-sm">
                          {member.email}
                        </p>
                      </div>
                      <div>
                        <label className="block text-subheading text-xs font-medium mb-1">
                          Phone
                        </label>
                        <p className="text-text bg-gray-800/30 border border-gray-600 rounded-md px-3 py-2 text-sm">
                          {member.phone}
                        </p>
                      </div>
                      <div>
                        <label className="block text-subheading text-xs font-medium mb-1">
                          College
                        </label>
                        <p className="text-text bg-gray-800/30 border border-gray-600 rounded-md px-3 py-2 text-sm">
                          {member.college}
                        </p>
                      </div>
                      <div>
                        <label className="block text-subheading text-xs font-medium mb-1">
                          Branch
                        </label>
                        <p className="text-text bg-gray-800/30 border border-gray-600 rounded-md px-3 py-2 text-sm">
                          {member.branch}
                        </p>
                      </div>
                      <div>
                        <label className="block text-subheading text-xs font-medium mb-1">
                          Year
                        </label>
                        <p className="text-text bg-gray-800/30 border border-gray-600 rounded-md px-3 py-2 text-sm">
                          {member.year}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="text-center"
            >
              <p className="text-text font-body mb-6">
                For any changes or queries, please contact the administrators.
              </p>
            </motion.div>

            {/* Withdraw Button */}
            <WithdrawButton 
              teamName={team.teamName}
              onWithdrawSuccess={() => {
                // This will be called after successful withdrawal
                // The component handles redirection internally
              }}
            />
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
