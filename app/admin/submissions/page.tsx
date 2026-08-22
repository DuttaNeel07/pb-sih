"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/lib/context/AdminAuthContext";
import { getProperDeliveryUrl } from "@/lib/utils/cloudinary-client";
import {
  Search,
  Download,
  Eye,
  Calendar,
  Users,
  FileText,
  ExternalLink,
} from "lucide-react";
import posthog from "posthog-js";
import toast from "react-hot-toast";

interface Task {
  _id: string;
  title: string;
  description?: string;
  dueDate?: string;
  submissionCount: number;
  totalAssigned: number;
}

interface Team {
  _id: string;
  teamName: string;
  leader: {
    name: string;
    email: string;
  };
  status: "registered" | "selected" | "waitlisted" | "rejected" | "finalist";
  problemStatement: {
    _id: string;
    title: string;
  };
}

interface Submission {
  _id: string;
  taskId: string;
  teamId: string;
  team: Team;
  submittedAt: string;
  files: string[];
  data: Record<string, string | number>;
  status: "submitted" | "reviewed" | "approved" | "rejected";
  feedback?: string;
}

interface ProblemStatement {
  _id: string;
  title: string;
}

export default function AdminSubmissions() {
  const { admin, isEvaluator } = useAdminAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [problemStatements, setProblemStatements] = useState<
    ProblemStatement[]
  >([]);
  const [evaluatorAssignments, setEvaluatorAssignments] = useState<string[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [problemStatementFilter, setProblemStatementFilter] = useState("all");

  // Modals
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [selectedPDFUrl, setSelectedPDFUrl] = useState("");

  const fetchTaskSubmissionStats = async (taskId: string) => {
    const token = localStorage.getItem("adminToken");
    try {
      const response = await fetch(`/sih/api/admin/submissions/${taskId}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        return { submitted: data.submissionCount, total: data.totalAssigned };
      }
    } catch (error) {
      console.error("Error fetching submission stats:", error);
    }
    return { submitted: 0, total: 0 };
  };

  const fetchTasks = useCallback(async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/sih/api/admin/tasks", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        // Transform tasks to include submission stats
        const tasksWithStats = await Promise.all(
          data.tasks.map(async (task: Task) => {
            const submissionStats = await fetchTaskSubmissionStats(task._id);
            return {
              ...task,
              submissionCount: submissionStats.submitted,
              totalAssigned: submissionStats.total,
            };
          })
        );
        setTasks(tasksWithStats);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch evaluator assignments for filtering submissions
  const fetchEvaluatorAssignments = useCallback(async () => {
    if (!isEvaluator || !admin?._id) return;

    const token = localStorage.getItem("adminToken");
    try {
      const response = await fetch(
        `/api/admin/evaluators/${admin._id}/assignments`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEvaluatorAssignments(
          data.assignments?.map(
            (a: { problemStatement: string }) => a.problemStatement
          ) || []
        );
      }
    } catch (error) {
      console.error("Error fetching evaluator assignments:", error);
    }
  }, [isEvaluator, admin?._id]);

  useEffect(() => {
    const initializeData = async () => {
      await fetchTasks();
      await fetchProblemStatements();
      await fetchEvaluatorAssignments();
    };
    initializeData();
  }, [fetchTasks, fetchEvaluatorAssignments]);

  const fetchProblemStatements = async () => {
    const token = localStorage.getItem("adminToken");
    try {
      const response = await fetch("/sih/api/admin/problem-statements", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setProblemStatements(data.problemStatements || []);
      }
    } catch (error) {
      console.error("Error fetching problem statements:", error);
    }
  };

  // Fetch evaluator assignments for filtering submissions
  const fetchTaskSubmissions = async (taskId: string) => {
    setSubmissionsLoading(true);
    const token = localStorage.getItem("adminToken");

    try {
      const response = await fetch(`/sih/api/admin/submissions/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions || []);
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
    fetchTaskSubmissions(task._id);
  };

  const handleBackToTasks = () => {
    setSelectedTask(null);
    setSubmissions([]);
    setSearchQuery("");
    setStatusFilter("all");
    setProblemStatementFilter("all");
  };

  const handlePDFPreview = (fileUrl: string) => {
    // Convert to proper delivery URL for PDFs
    const properUrl = getProperDeliveryUrl(fileUrl);
    setSelectedPDFUrl(properUrl);
    setShowPDFModal(true);
  };

  const handleDownloadFile = (fileUrl: string, filename: string) => {
    // Convert to proper delivery URL before downloading
    const properUrl = getProperDeliveryUrl(fileUrl);
    const link = document.createElement("a");
    link.href = properUrl;
    link.download = filename;
    link.target = "_blank";

    // Add error handling for download
    link.onerror = () => {
      toast.error("❌ Unable to download file. Please try again.");
    };

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper function to detect if a string is a URL
  const isValidUrl = (string: string) => {
    try {
      const url = new URL(string);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  // Helper function to render value with clickable links
  const renderValueWithLinks = (value: string | number) => {
    const stringValue = String(value);

    if (isValidUrl(stringValue)) {
      return (
        <a
          href={stringValue}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1"
        >
          {stringValue}
          <ExternalLink className="w-3 h-3" />
        </a>
      );
    }

    return stringValue;
  };

  const handleStatusUpdate = async (teamId: string, newStatus: string) => {
    const token = localStorage.getItem("adminToken");

    try {
      const response = await fetch(`/sih/api/admin/teams/${teamId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        posthog.capture("submission_team_status_updated", { status: newStatus });
        // Refresh submissions to show updated status
        if (selectedTask) {
          fetchTaskSubmissions(selectedTask._id);
        }
        setShowStatusModal(false);
        setSelectedSubmission(null);
        toast.success("Team status updated successfully!");
      } else {
        toast.error("Failed to update team status");
      }
    } catch (error) {
      console.error("Error updating team status:", error);
      toast.error("An error occurred while updating team status");
    }
  };

  // Filter submissions based on search and filters
  const filteredSubmissions = submissions.filter((submission) => {
    const matchesSearch =
      submission.team.teamName
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      submission.team.leader.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      submission.team.leader.email
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || submission.team.status === statusFilter;
    const matchesProblemStatement =
      problemStatementFilter === "all" ||
      submission.team.problemStatement._id === problemStatementFilter;

    // For evaluators, only show submissions for their assigned problem statements
    const matchesEvaluatorAssignment =
      !isEvaluator ||
      evaluatorAssignments.includes(submission.team.problemStatement._id);

    return (
      matchesSearch &&
      matchesStatus &&
      matchesProblemStatement &&
      matchesEvaluatorAssignment
    );
  });

  // Filter problem statements for evaluators to show only their assigned ones
  const availableProblemStatements = isEvaluator
    ? problemStatements.filter((ps) => evaluatorAssignments.includes(ps._id))
    : problemStatements;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "registered":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "selected":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "waitlisted":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "rejected":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "finalist":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getFileExtension = (filename: string) => {
    return filename.split(".").pop()?.toLowerCase() || "";
  };

  const isDeadlinePassed = (dueDate: string) => {
    return new Date() > new Date(dueDate);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-heading border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading submissions...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display text-heading mb-2">
              {selectedTask
                ? `${selectedTask.title} - Submissions`
                : "Task Submissions"}
            </h1>
            <p className="text-gray-400">
              {selectedTask
                ? `Review and manage team submissions for this task`
                : "Select a task to view and manage team submissions"}
            </p>
          </div>

          {selectedTask && (
            <button
              onClick={handleBackToTasks}
              className="px-4 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              ← Back to Tasks
            </button>
          )}
        </div>

        {!selectedTask ? (
          /* Tasks Overview */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task) => (
              <motion.div
                key={task._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 cursor-pointer hover:border-heading/30 transition-colors"
                onClick={() => handleTaskSelect(task)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-display text-heading mb-2">
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-green-400">
                      <Users className="w-4 h-4" />
                      {task.submissionCount}/{task.totalAssigned}
                    </span>
                    {task.dueDate && (
                      <span
                        className={`flex items-center gap-1 ${
                          isDeadlinePassed(task.dueDate)
                            ? "text-red-400"
                            : "text-gray-400"
                        }`}
                      >
                        <Calendar className="w-4 h-4" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <span className="text-heading">View →</span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Task Submissions */
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search teams..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-heading"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-heading"
                >
                  <option value="all">All Status</option>
                  <option value="registered">Registered</option>
                  <option value="selected">Selected</option>
                  <option value="waitlisted">Waitlisted</option>
                  <option value="rejected">Rejected</option>
                  <option value="finalist">Finalist</option>
                </select>

                {/* Problem Statement Filter */}
                <select
                  value={problemStatementFilter}
                  onChange={(e) => setProblemStatementFilter(e.target.value)}
                  className="px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-heading"
                >
                  <option value="all">All Problem Statements</option>
                  {availableProblemStatements.map((ps) => (
                    <option key={ps._id} value={ps._id}>
                      {ps.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Results Summary */}
              <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
                <span>
                  Showing {filteredSubmissions.length} of {submissions.length}{" "}
                  submissions
                </span>
                {selectedTask.dueDate && (
                  <span
                    className={
                      isDeadlinePassed(selectedTask.dueDate)
                        ? "text-red-400"
                        : ""
                    }
                  >
                    Due:{" "}
                    {new Date(selectedTask.dueDate).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}{" "}
                    IST
                  </span>
                )}
              </div>
            </div>

            {/* Submissions List */}
            {submissionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-heading border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading submissions...</p>
                </div>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-display text-gray-400 mb-2">
                  No Submissions Found
                </h3>
                <p className="text-gray-500">
                  {submissions.length === 0
                    ? "No teams have submitted this task yet."
                    : "No submissions match your current filters."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSubmissions.map((submission) => (
                  <motion.div
                    key={submission._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-display text-heading">
                            {submission.team.teamName}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded text-xs border ${getStatusColor(
                              submission.team.status
                            )}`}
                          >
                            {submission.team.status}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm mb-1">
                          Leader: {submission.team.leader.name} (
                          {submission.team.leader.email})
                        </p>
                        <p className="text-gray-400 text-sm mb-1">
                          Problem Statement:{" "}
                          {submission.team.problemStatement.title}
                        </p>
                        <p className="text-gray-400 text-sm">
                          Submitted:{" "}
                          {new Date(submission.submittedAt).toLocaleString(
                            "en-IN",
                            { timeZone: "Asia/Kolkata" }
                          )}{" "}
                          IST
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedSubmission(submission);
                          setShowStatusModal(true);
                        }}
                        className="px-4 py-2 bg-heading/20 border border-heading/30 text-heading rounded-lg hover:bg-heading/30 transition-colors"
                      >
                        Update Status
                      </button>
                    </div>

                    {/* Submission Data */}
                    {Object.keys(submission.data).length > 0 && (
                      <div className="mb-4 p-4 bg-gray-800/30 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-300 mb-2">
                          Form Responses:
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(submission.data).map(
                            ([key, value]) => (
                              <div key={key} className="text-sm">
                                <span className="text-gray-400">{key}:</span>
                                <span className="text-white ml-2">
                                  {renderValueWithLinks(value)}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Files */}
                    {submission.files.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">
                          Submitted Files:
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {submission.files.map((fileUrl, index) => {
                            const filename =
                              fileUrl.split("/").pop() || `file-${index + 1}`;
                            const extension = getFileExtension(filename);
                            const isPDF = extension === "pdf";

                            return (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                  <span className="text-sm text-gray-300 truncate">
                                    {filename}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 ml-2">
                                  {isPDF && (
                                    <button
                                      onClick={() => handlePDFPreview(fileUrl)}
                                      className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                                      title="Preview PDF"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() =>
                                      handleDownloadFile(fileUrl, filename)
                                    }
                                    className="p-1 text-green-400 hover:text-green-300 transition-colors"
                                    title="Download"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Feedback */}
                    {submission.feedback && (
                      <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <h4 className="text-sm font-medium text-yellow-400 mb-2">
                          Admin Feedback:
                        </h4>
                        <p className="text-sm text-gray-300">
                          {submission.feedback}
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Status Update Modal */}
        <AnimatePresence>
          {showStatusModal && selectedSubmission && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setShowStatusModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-display text-heading mb-4">
                  Update Team Status
                </h3>
                <p className="text-gray-400 mb-4">
                  Update status for team:{" "}
                  <strong>{selectedSubmission.team.teamName}</strong>
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Current status:{" "}
                  <span
                    className={`px-2 py-1 rounded text-xs border ${getStatusColor(
                      selectedSubmission.team.status
                    )}`}
                  >
                    {selectedSubmission.team.status}
                  </span>
                </p>

                <div className="space-y-3">
                  {[
                    "registered",
                    "selected",
                    "waitlisted",
                    "rejected",
                    "finalist",
                  ].map((status) => (
                    <button
                      key={status}
                      onClick={() =>
                        handleStatusUpdate(selectedSubmission.team._id, status)
                      }
                      className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                        selectedSubmission.team.status === status
                          ? getStatusColor(status)
                          : "border-gray-600 text-gray-300 hover:border-gray-500"
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowStatusModal(false)}
                  className="w-full mt-4 px-4 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PDF Preview Modal */}
        <AnimatePresence>
          {showPDFModal && selectedPDFUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setShowPDFModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                  <h3 className="text-lg font-display text-heading">
                    PDF Preview
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.open(selectedPDFUrl, "_blank")}
                      className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded hover:bg-blue-500/30 transition-colors flex items-center gap-1"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in New Tab
                    </button>
                    <button
                      onClick={() => setShowPDFModal(false)}
                      className="px-3 py-1 bg-gray-800 border border-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
                <div className="flex-1 p-4">
                  <iframe
                    src={`${selectedPDFUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                    className="w-full h-full rounded-lg border border-gray-700"
                    title="PDF Preview"
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
