"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/lib/context/AdminAuthContext";
import {
  ArrowLeft,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  FileText,
  Eye,
  Search,
} from "lucide-react";

interface EvaluatorProgress {
  _id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  totalAssignments: number;
  completedEvaluations: number;
  draftEvaluations: number;
  progressPercentage: number;
  problemStatements: Array<{
    problemStatement: {
      _id: string;
      psNumber: string;
      title: string;
    };
    totalTeams: number;
    isEvaluated: boolean;
    isFinalized: boolean;
    submittedAt?: string;
    rankedTeams: number;
  }>;
}

interface EvaluatorRankingsData {
  evaluators: EvaluatorProgress[];
}

export default function EvaluatorRankingsOverview() {
  const { isSuperAdmin } = useAdminAuth();
  const router = useRouter();
  const [data, setData] = useState<EvaluatorRankingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchEvaluatorRankings = useCallback(async () => {
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch("/sih/api/admin/rankings/evaluators", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setData(data);
      } else if (response.status === 403) {
        router.push("/admin");
      }
    } catch (error) {
      console.error("Error fetching evaluator rankings:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isSuperAdmin) {
      router.push("/admin");
      return;
    }
    fetchEvaluatorRankings();
  }, [isSuperAdmin, router, fetchEvaluatorRankings]);

  // Filter evaluators based on search term (PS number, email)
  const filteredEvaluators =
    data?.evaluators.filter((evaluator) => {
      const searchLower = searchTerm.toLowerCase();

      // Search by email
      if (evaluator.email.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search by PS numbers assigned to this evaluator
      return evaluator.problemStatements.some((ps) =>
        ps.problemStatement.psNumber.toLowerCase().includes(searchLower)
      );
    }) || [];

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-400 bg-green-400/20";
    if (percentage >= 50) return "text-yellow-400 bg-yellow-400/20";
    return "text-red-400 bg-red-400/20";
  };

  const getStatusIcon = (ps: EvaluatorProgress["problemStatements"][0]) => {
    if (ps.isFinalized) {
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    } else if (ps.isEvaluated) {
      return <Clock className="w-4 h-4 text-yellow-400" />;
    } else {
      return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-heading border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading evaluator rankings...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-display text-heading mb-2">
            Access Denied
          </h2>
          <p className="text-gray-400">
            You don&apos;t have permission to view this page.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin/super-admin-dashboard")}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-display text-heading mb-1">
                Evaluator Rankings Overview
              </h1>
              <p className="text-gray-400">
                Track individual evaluator progress and performance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg">
            <Users className="w-4 h-4" />
            {searchTerm
              ? `${filteredEvaluators.length} of ${data.evaluators.length}`
              : data.evaluators.length}{" "}
            evaluators
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-display text-heading">
                Total Evaluators
              </h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {filteredEvaluators.length}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-display text-heading">Completed</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {filteredEvaluators.reduce(
                (sum, evaluator) => sum + evaluator.completedEvaluations,
                0
              )}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              <h3 className="text-lg font-display text-heading">Drafts</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {filteredEvaluators.reduce(
                (sum, evaluator) => sum + evaluator.draftEvaluations,
                0
              )}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-display text-heading">
                Avg Progress
              </h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {Math.round(
                filteredEvaluators.reduce(
                  (sum, evaluator) => sum + evaluator.progressPercentage,
                  0
                ) / (filteredEvaluators.length || 1)
              )}
              %
            </p>
          </motion.div>
        </div>

        {/* Search Box */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search by PS number or evaluator email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-heading/50 focus:bg-gray-800/70 transition-colors"
          />
        </div>

        {/* Evaluators List */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
          <h2 className="text-xl font-display text-heading mb-6">
            Individual Evaluator Progress
          </h2>

          {filteredEvaluators.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-display text-heading mb-2">
                No evaluators found
              </h3>
              <p className="text-gray-400">
                {searchTerm
                  ? "Try adjusting your search criteria."
                  : "No evaluators available."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvaluators.map((evaluator, index) => (
                <motion.div
                  key={evaluator._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-heading/20 rounded-full flex items-center justify-center">
                        <span className="text-lg font-medium text-heading">
                          {evaluator.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-display text-heading">
                          {evaluator.email}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          Joined:{" "}
                          {new Date(evaluator.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Progress */}
                      <div className="text-right">
                        <div
                          className={`px-3 py-1 rounded text-sm font-medium ${getProgressColor(
                            evaluator.progressPercentage
                          )}`}
                        >
                          {evaluator.progressPercentage}% Complete
                        </div>
                        <p className="text-gray-400 text-xs mt-1">
                          {evaluator.completedEvaluations}/
                          {evaluator.totalAssignments} assignments
                        </p>
                      </div>

                      {/* View Details Button */}
                      <button
                        onClick={() =>
                          router.push(
                            `/admin/super-admin-dashboard/evaluator-rankings/${evaluator._id}`
                          )
                        }
                        className="px-4 py-2 bg-heading/20 border border-heading/30 text-heading rounded-lg hover:bg-heading/30 transition-colors flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                    </div>
                  </div>

                  {/* Problem Statements Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span className="text-gray-400">Assignments:</span>
                      <span className="text-white font-medium">
                        {evaluator.totalAssignments}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-gray-400">Completed:</span>
                      <span className="text-white font-medium">
                        {evaluator.completedEvaluations}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-yellow-400" />
                      <span className="text-gray-400">Drafts:</span>
                      <span className="text-white font-medium">
                        {evaluator.draftEvaluations}
                      </span>
                    </div>
                  </div>

                  {/* Recent Problem Statements */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">
                      Problem Statements Status:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {evaluator.problemStatements.map((ps, psIndex) => (
                        <div
                          key={psIndex}
                          className="flex items-center gap-2 px-3 py-1 bg-gray-700/50 rounded-lg text-xs"
                        >
                          {getStatusIcon(ps)}
                          <span className="text-gray-300">
                            {ps.problemStatement.psNumber}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
