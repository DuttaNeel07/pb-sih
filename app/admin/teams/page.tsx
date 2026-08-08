"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/lib/context/AdminAuthContext";
import { AlertCircle } from "lucide-react";

interface TeamMember {
  name: string;
  email: string;
  phone: string;
  gender: "male" | "female" | "other";
  college: string;
  year: string;
  branch: string;
}

interface Team {
  _id: string;
  teamName: string;
  leader: {
    name: string;
    email: string;
    phone: string;
  };
  memberCount: number;
  problemStatement: {
    psNumber: string;
    title: string;
  };
  status: "registered" | "selected" | "waitlisted" | "rejected" | "finalist";
  registrationDate: string;
  createdAt?: string;
}

interface DetailedTeam {
  _id: string;
  teamName: string;
  leader: {
    name: string;
    email: string;
    phone: string;
    gender?: string;
    college?: string;
    year?: string;
    branch?: string;
  };
  members: TeamMember[];
  problemStatement: {
    psNumber: string;
    title: string;
    domain?: string;
    description?: string;
  };
  status: "registered" | "selected" | "waitlisted" | "rejected" | "finalist";
  registrationDate: string;
  createdAt: string;
  updatedAt: string;
  tasks: Array<{
    taskId: string;
    submittedAt: string;
    status: string;
    feedback?: string;
  }>;
  memberCount: number;
}

export default function TeamsManagement() {
  const { isSuperAdmin } = useAdminAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  );
  const [selectedTeam, setSelectedTeam] = useState<DetailedTeam | null>(null);
  const [loadingTeamDetails, setLoadingTeamDetails] = useState(false);

  const statusColors = {
    registered: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    selected: "bg-green-500/20 text-green-400 border-green-500/30",
    waitlisted: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30",
    finalist: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };

  const fetchTeamDetails = async (teamId: string) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setLoadingTeamDetails(true);
    try {
      const response = await fetch(`/sih/api/admin/teams/${teamId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedTeam(data.team);
      } else {
        console.error("Failed to fetch team details:", response.status);
      }
    } catch (error) {
      console.error("Error fetching team details:", error);
    } finally {
      setLoadingTeamDetails(false);
    }
  };

  const fetchTeams = useCallback(async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        ...(filter !== "all" && { status: filter }),
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`/sih/api/admin/teams?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams || []);
        setTotalPages(Math.ceil((data.total || 0) / 10));
      } else {
        console.error("Failed to fetch teams:", response.status);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filter, searchTerm]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const updateTeamStatus = async (teamId: string, newStatus: string) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setUpdating(teamId);
    try {
      const response = await fetch("/sih/api/admin/teams", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ teamId, status: newStatus }),
      });

      if (response.ok) {
        setTeams(
          teams.map((team) =>
            team._id === teamId
              ? { ...team, status: newStatus as Team["status"] }
              : team
          )
        );
      } else {
        console.error("Failed to update team status:", response.status);
      }
    } catch (error) {
      console.error("Error updating team status:", error);
    } finally {
      setUpdating(null);
    }
  };

  const deleteTeam = async (teamId: string) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setDeleting(teamId);
    try {
      const response = await fetch("/sih/api/admin/teams", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ teamId }),
      });

      if (response.ok) {
        const data = await response.json();
        // Remove the team from the list
        setTeams(teams.filter((team) => team._id !== teamId));
        setShowDeleteConfirm(null);

        // Show success message (you can replace this with a proper notification system)
        alert(
          `Team removed successfully! ${data.deletedTeam.leaderEmail} has been notified.`
        );

        // Refresh the teams list to get updated counts
        fetchTeams();
      } else {
        const errorData = await response.json();
        alert(`Failed to remove team: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error deleting team:", error);
      alert("Failed to remove team. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  const filteredTeams = teams.filter((team) => {
    const matchesFilter = filter === "all" || team.status === filter;
    return matchesFilter;
  });

  // Redirect evaluators
  if (!isSuperAdmin) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-display text-heading mb-2">
            Access Denied
          </h2>
          <p className="text-gray-400">Only super admins can manage teams.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display text-heading mb-2">
              Teams Management
            </h1>
            <p className="text-subheading font-body">
              Manage team registrations and status updates
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search teams, leaders, emails, or problem statements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-heading focus:border-heading"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              {[
                "all",
                "registered",
                "selected",
                "waitlisted",
                "rejected",
                "finalist",
              ].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                    filter === status
                      ? "bg-heading/20 text-heading border border-heading/30"
                      : "bg-gray-800/50 text-gray-400 border border-gray-600 hover:bg-gray-700/50"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Teams Table */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-heading mx-auto mb-4"></div>
              <p className="text-gray-400">Loading teams...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50 border-b border-gray-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">
                        Team
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">
                        Leader
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">
                        Problem Statement
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">
                        Registered
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredTeams.map((team) => (
                      <motion.tr
                        key={team._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-white font-medium">
                              {team.teamName}
                            </p>
                            <p className="text-gray-400 text-sm">
                              {team.memberCount + 1} members
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => fetchTeamDetails(team._id)}
                            className="text-left hover:bg-gray-700/30 rounded-lg p-2 transition-colors w-full"
                            disabled={loadingTeamDetails}
                          >
                            <div>
                              <p className="text-white hover:text-blue-400 transition-colors">
                                {team.leader.name}
                              </p>
                              <p className="text-gray-400 text-sm">
                                {team.leader.email}
                              </p>
                              <p className="text-xs text-blue-400 mt-1">
                                Click to view full team
                              </p>
                            </div>
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p
                              className="text-white font-medium"
                              title={team.problemStatement.psNumber}
                            >
                              {(() => {
                                const psNumbers =
                                  team.problemStatement.psNumber.split("/");
                                if (psNumbers.length <= 2) {
                                  return team.problemStatement.psNumber;
                                }
                                return `${psNumbers[0]}/${psNumbers[1]}.....`;
                              })()}
                            </p>
                            <p
                              className="text-gray-400 text-sm truncate max-w-[120px]"
                              title={team.problemStatement.title}
                            >
                              {team.problemStatement.title}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${
                              statusColors[team.status]
                            }`}
                          >
                            {team.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-sm">
                          {new Date(
                            team.createdAt || team.registrationDate
                          ).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <select
                              value={team.status}
                              onChange={(e) =>
                                updateTeamStatus(team._id, e.target.value)
                              }
                              disabled={
                                updating === team._id || deleting === team._id
                              }
                              className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-heading"
                            >
                              <option value="registered">Registered</option>
                              <option value="selected">Selected</option>
                              <option value="waitlisted">Waitlisted</option>
                              <option value="rejected">Rejected</option>
                              <option value="finalist">Finalist</option>
                            </select>

                            <button
                              onClick={() => setShowDeleteConfirm(team._id)}
                              disabled={
                                updating === team._id || deleting === team._id
                              }
                              className="px-3 py-1 bg-red-600/20 text-red-400 border border-red-500/30 rounded text-sm hover:bg-red-600/30 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title="Remove Team"
                            >
                              Remove
                            </button>

                            {updating === team._id && (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-heading"></div>
                            )}
                            {deleting === team._id && (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-gray-800/50 border-t border-gray-700 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-400 text-sm">
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setCurrentPage(Math.max(1, currentPage - 1))
                        }
                        disabled={currentPage === 1}
                        className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() =>
                          setCurrentPage(Math.min(totalPages, currentPage + 1))
                        }
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Team Details Modal */}
        {selectedTeam && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-display text-white">
                      {selectedTeam.teamName}
                    </h3>
                    <p className="text-gray-400">Complete Team Information</p>
                  </div>
                  <button
                    onClick={() => setSelectedTeam(null)}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-6 h-6 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Team Leader */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-yellow-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      Team Leader
                    </h4>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <div className="space-y-2">
                        <p>
                          <span className="text-gray-400">Name:</span>{" "}
                          <span className="text-white">
                            {selectedTeam.leader.name}
                          </span>
                        </p>
                        <p>
                          <span className="text-gray-400">Email:</span>{" "}
                          <span className="text-white">
                            {selectedTeam.leader.email}
                          </span>
                        </p>
                        <p>
                          <span className="text-gray-400">Phone:</span>{" "}
                          <span className="text-white">
                            {selectedTeam.leader.phone}
                          </span>
                        </p>
                        {selectedTeam.leader.gender && (
                          <p>
                            <span className="text-gray-400">Gender:</span>{" "}
                            <span className="text-white capitalize">
                              {selectedTeam.leader.gender}
                            </span>
                          </p>
                        )}
                        {selectedTeam.leader.college && (
                          <p>
                            <span className="text-gray-400">College:</span>{" "}
                            <span className="text-white">
                              {selectedTeam.leader.college}
                            </span>
                          </p>
                        )}
                        {selectedTeam.leader.year &&
                          selectedTeam.leader.branch && (
                            <p>
                              <span className="text-gray-400">Course:</span>{" "}
                              <span className="text-white">
                                {selectedTeam.leader.year} -{" "}
                                {selectedTeam.leader.branch}
                              </span>
                            </p>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Problem Statement */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white">
                      Problem Statement
                    </h4>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <div className="space-y-2">
                        <p>
                          <span className="text-gray-400">PS Number:</span>{" "}
                          <span className="text-white font-medium">
                            {selectedTeam.problemStatement.psNumber}
                          </span>
                        </p>
                        <p>
                          <span className="text-gray-400">Title:</span>{" "}
                          <span className="text-white">
                            {selectedTeam.problemStatement.title}
                          </span>
                        </p>
                        {selectedTeam.problemStatement.domain && (
                          <p>
                            <span className="text-gray-400">Domain:</span>{" "}
                            <span className="text-white">
                              {selectedTeam.problemStatement.domain}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Team Status & Info */}
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <div className="space-y-2">
                        <p>
                          <span className="text-gray-400">Status:</span>
                          <span
                            className={`ml-2 inline-flex px-3 py-1 rounded-full text-xs font-medium border ${
                              statusColors[selectedTeam.status]
                            }`}
                          >
                            {selectedTeam.status}
                          </span>
                        </p>
                        <p>
                          <span className="text-gray-400">Members:</span>{" "}
                          <span className="text-white">
                            {selectedTeam.memberCount + 1} total
                          </span>
                        </p>
                        <p>
                          <span className="text-gray-400">Registered:</span>{" "}
                          <span className="text-white">
                            {new Date(
                              selectedTeam.registrationDate
                            ).toLocaleDateString()}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team Members */}
                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-white mb-4">
                    Team Members ({selectedTeam.members.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedTeam.members.map((member, index) => (
                      <div
                        key={index}
                        className="bg-gray-800/50 rounded-lg p-4"
                      >
                        <div className="space-y-2">
                          <h5 className="text-white font-medium">
                            {member.name}
                          </h5>
                          <p className="text-sm text-gray-300">
                            {member.email}
                          </p>
                          <p className="text-sm text-gray-400">
                            {member.phone}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                              {member.gender}
                            </span>
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                              {member.year}
                            </span>
                            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                              {member.branch}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {member.college}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tasks (if any) */}
                {selectedTeam.tasks.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold text-white mb-4">
                      Task Submissions ({selectedTeam.tasks.length})
                    </h4>
                    <div className="space-y-3">
                      {selectedTeam.tasks.map((task, index) => (
                        <div
                          key={index}
                          className="bg-gray-800/50 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-white">Task {index + 1}</p>
                              <p className="text-sm text-gray-400">
                                Submitted:{" "}
                                {new Date(
                                  task.submittedAt
                                ).toLocaleDateString()}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                task.status === "submitted"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : task.status === "approved"
                                  ? "bg-green-500/20 text-green-400"
                                  : task.status === "rejected"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-yellow-500/20 text-yellow-400"
                              }`}
                            >
                              {task.status}
                            </span>
                          </div>
                          {task.feedback && (
                            <p className="text-sm text-gray-300 mt-2">
                              <span className="text-gray-400">Feedback:</span>{" "}
                              {task.feedback}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Close Button */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setSelectedTeam(null)}
                    className="px-6 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-md w-full mx-4"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>

                <h3 className="text-xl font-display text-white mb-2">
                  Remove Team
                </h3>
                <p className="text-gray-400 mb-6">
                  Are you sure you want to remove this team? This action will:
                </p>

                <div className="text-left bg-gray-800/50 rounded-lg p-4 mb-6">
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li>• Delete the team leader&apos;s account completely</li>
                    <li>• Remove the team from the system</li>
                    <li>• Send an email notification to the leader</li>
                    <li>• Decrease the problem statement team count</li>
                    <li>• Store team data in deleted records</li>
                  </ul>
                </div>

                <p className="text-red-400 text-sm mb-6 font-medium">
                  This action cannot be undone!
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteTeam(showDeleteConfirm)}
                    disabled={deleting === showDeleteConfirm}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {deleting === showDeleteConfirm
                      ? "Removing..."
                      : "Remove Team"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
