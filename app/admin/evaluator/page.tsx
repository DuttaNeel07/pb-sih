"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  FileText,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

interface ProblemStatementStatus {
  problemStatement: {
    _id: string;
    title: string;
    description?: string;
    psNumber: string; // Changed from number to string
  };
  totalTeams: number;
  isEvaluated: boolean;
  isFinalized: boolean;
  submittedAt?: string;
  rankedTeams: number;
}

interface EvaluatorDashboardData {
  evaluator: {
    _id: string;
    email: string;
    role: string;
  };
  assignedProblemStatements: ProblemStatementStatus[];
}

export default function EvaluatorDashboard() {
  const router = useRouter();
  const [dashboardData, setDashboardData] =
    useState<EvaluatorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      await fetchDashboardData();
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    try {
      const response = await fetch("/sih/api/admin/evaluator/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Dashboard API Response:", data);
        console.log(
          "Assigned Problem Statements:",
          data.assignedProblemStatements
        );
        setDashboardData(data);
      } else if (response.status === 403) {
        // Not an evaluator, redirect to regular admin panel
        router.push("/admin");
      } else {
        console.error("Failed to fetch dashboard data");
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEvaluation = (problemStatementId: string) => {
    router.push(`/admin/evaluator/ranking/${problemStatementId}`);
  };

  const getStatusIcon = (status: ProblemStatementStatus) => {
    if (status.isFinalized) {
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    } else if (status.isEvaluated) {
      return <Clock className="w-5 h-5 text-yellow-400" />;
    } else {
      return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: ProblemStatementStatus) => {
    if (status.isFinalized) {
      return "Completed";
    } else if (status.isEvaluated) {
      return "Draft Saved";
    } else {
      return "Not Started";
    }
  };

  const getStatusColor = (status: ProblemStatementStatus) => {
    if (status.isFinalized) {
      return "bg-green-500/20 text-green-400 border-green-500/30";
    } else if (status.isEvaluated) {
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    } else {
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-heading border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading evaluator dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!dashboardData) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-display text-heading mb-2">
            Access Denied
          </h2>
          <p className="text-gray-400">
            You don&apos;t have evaluator permissions.
          </p>
        </div>
      </AdminLayout>
    );
  }

  const { evaluator, assignedProblemStatements } = dashboardData;
  const completedEvaluations = assignedProblemStatements.filter(
    (ps) => ps.isFinalized
  ).length;
  const totalAssignments = assignedProblemStatements.length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-3xl font-display text-heading mb-2">
              Evaluator Dashboard
            </h1>
            <p className="text-gray-400 mb-4">
              Welcome back, {evaluator.email}
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg">
              <Users className="w-4 h-4" />
              {completedEvaluations}/{totalAssignments} Evaluations Completed
            </div>
          </motion.div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-display text-heading">Assigned</h3>
            </div>
            <p className="text-2xl font-bold text-white">{totalAssignments}</p>
            <p className="text-sm text-gray-400">Problem Statements</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-display text-heading">Completed</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {completedEvaluations}
            </p>
            <p className="text-sm text-gray-400">Evaluations</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-display text-heading">Total Teams</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {assignedProblemStatements.reduce(
                (sum, ps) => sum + ps.totalTeams,
                0
              )}
            </p>
            <p className="text-sm text-gray-400">To Evaluate</p>
          </motion.div>
        </div>

        {/* Assigned Problem Statements */}
        <div>
          <h2 className="text-2xl font-display text-heading mb-6">
            Your Assigned Problem Statements
          </h2>

          {assignedProblemStatements.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl"
            >
              <AlertCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-display text-gray-400 mb-2">
                No Assignments Yet
              </h3>
              <p className="text-gray-500">
                You haven&apos;t been assigned any problem statements to
                evaluate. Contact your super admin for assignments.
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {assignedProblemStatements.map((ps, index) => (
                <motion.div
                  key={ps.problemStatement._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1 * index }}
                  className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-heading/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(ps)}
                        <span
                          className={`px-2 py-1 rounded text-xs border ${getStatusColor(
                            ps
                          )}`}
                        >
                          {getStatusText(ps)}
                        </span>
                      </div>
                      <h3 className="text-lg font-display text-heading mb-2">
                        {ps.problemStatement.psNumber}:{" "}
                        {ps.problemStatement.title}
                      </h3>
                      {ps.problemStatement.description && (
                        <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                          {ps.problemStatement.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-blue-400">
                        <Users className="w-4 h-4" />
                        {ps.totalTeams} teams
                      </span>
                      {ps.isEvaluated && (
                        <span className="flex items-center gap-1 text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          {ps.rankedTeams} ranked
                        </span>
                      )}
                    </div>
                  </div>

                  {ps.submittedAt && (
                    <p className="text-xs text-gray-500 mb-4">
                      Submitted:{" "}
                      {new Date(ps.submittedAt).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      })}{" "}
                      IST
                    </p>
                  )}

                  <button
                    onClick={() =>
                      handleStartEvaluation(ps.problemStatement._id)
                    }
                    className="w-full py-3 bg-heading/20 border border-heading/30 text-heading rounded-lg hover:bg-heading/30 transition-colors flex items-center justify-center gap-2"
                  >
                    {ps.isFinalized
                      ? "View Rankings"
                      : ps.isEvaluated
                      ? "Continue Evaluation"
                      : "Start Evaluation"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
