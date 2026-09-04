"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/lib/context/AdminAuthContext";
import {
  ArrowLeft,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Trophy,
  Star,
  Award,
  Calendar,
} from "lucide-react";

interface TeamRanking {
  teamId: string;
  teamName: string;
  teamLeader: {
    name: string;
    email: string;
  };
  rank: number;
  score?: number;
  comments?: string;
  evaluatedAt: string;
}

interface EvaluationDetail {
  problemStatement: {
    _id: string;
    title: string;
    description?: string;
  };
  totalTeams: number;
  allTeams: Array<{
    _id: string;
    teamName: string;
    leader: {
      name: string;
      email: string;
    };
  }>;
  evaluation: {
    _id: string;
    isFinalized: boolean;
    submittedAt?: string;
    rankings: TeamRanking[];
    totalRanked: number;
  } | null;
}

interface EvaluatorDetail {
  _id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  statistics: {
    totalAssignments: number;
    completedEvaluations: number;
    draftEvaluations: number;
    totalTeamsEvaluated: number;
    progressPercentage: number;
  };
  evaluations: EvaluationDetail[];
}

export default function EvaluatorDetail() {
  const { isSuperAdmin } = useAdminAuth();
  const router = useRouter();
  const params = useParams();
  const evaluatorId = params.evaluatorId as string;
  const [evaluator, setEvaluator] = useState<EvaluatorDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEvaluatorDetail = useCallback(async () => {
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch(
        `/sih/api/admin/rankings/evaluator/${evaluatorId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEvaluator(data.evaluator);
      } else if (response.status === 403) {
        router.push("/admin");
      } else if (response.status === 404) {
        router.push("/admin/super-admin-dashboard/evaluator-rankings");
      }
    } catch (error) {
      console.error("Error fetching evaluator detail:", error);
    } finally {
      setLoading(false);
    }
  }, [evaluatorId, router]);

  useEffect(() => {
    if (!isSuperAdmin) {
      router.push("/admin");
      return;
    }
    fetchEvaluatorDetail();
  }, [isSuperAdmin, router, fetchEvaluatorDetail]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-4 h-4 text-yellow-400" />;
      case 2:
      case 3:
        return <Star className="w-4 h-4 text-gray-400" />;
      default:
        return (
          <span className="w-4 h-4 text-center text-xs font-bold text-gray-500">
            {rank}
          </span>
        );
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case 2:
        return "bg-gray-400/20 text-gray-300 border-gray-400/30";
      case 3:
        return "bg-amber-600/20 text-amber-500 border-amber-600/30";
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  const getStatusIcon = (evaluation: EvaluationDetail["evaluation"]) => {
    if (!evaluation) {
      return <AlertCircle className="w-5 h-5 text-gray-400" />;
    } else if (evaluation.isFinalized) {
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    } else {
      return <Clock className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getStatusText = (evaluation: EvaluationDetail["evaluation"]) => {
    if (!evaluation) return "Not Started";
    if (evaluation.isFinalized) return "Completed";
    return "Draft";
  };

  const getStatusColor = (evaluation: EvaluationDetail["evaluation"]) => {
    if (!evaluation) return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    if (evaluation.isFinalized)
      return "bg-green-500/20 text-green-400 border-green-500/30";
    return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-heading border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading evaluator details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!evaluator) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-display text-heading mb-2">
            Evaluator Not Found
          </h2>
          <p className="text-gray-400 mb-4">
            The requested evaluator was not found.
          </p>
          <button
            onClick={() =>
              router.push("/admin/super-admin-dashboard/evaluator-rankings")
            }
            className="px-4 py-2 bg-heading/20 border border-heading/30 text-heading rounded-lg hover:bg-heading/30 transition-colors"
          >
            Back to Evaluators
          </button>
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
              onClick={() =>
                router.push("/admin/super-admin-dashboard/evaluator-rankings")
              }
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-heading/20 rounded-full flex items-center justify-center">
                <span className="text-2xl font-medium text-heading">
                  {evaluator.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-display text-heading mb-1">
                  {evaluator.email}
                </h1>
                <p className="text-gray-400">
                  Evaluator since{" "}
                  {new Date(evaluator.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg">
            <Award className="w-4 h-4" />
            {evaluator.statistics.progressPercentage}% Complete
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-display text-heading">Assignments</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {evaluator.statistics.totalAssignments}
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
              <h3 className="text-sm font-display text-heading">Completed</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {evaluator.statistics.completedEvaluations}
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
              <h3 className="text-sm font-display text-heading">Drafts</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {evaluator.statistics.draftEvaluations}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-display text-heading">
                Teams Ranked
              </h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {evaluator.statistics.totalTeamsEvaluated}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-display text-heading">Progress</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {evaluator.statistics.progressPercentage}%
            </p>
          </motion.div>
        </div>

        {/* Evaluations */}
        <div className="space-y-6">
          <h2 className="text-xl font-display text-heading">
            Problem Statement Evaluations
          </h2>

          {evaluator.evaluations.map((evaluation, index) => (
            <motion.div
              key={evaluation.problemStatement._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
            >
              {/* Problem Statement Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(evaluation.evaluation)}
                    <span
                      className={`px-2 py-1 rounded text-xs border ${getStatusColor(
                        evaluation.evaluation
                      )}`}
                    >
                      {getStatusText(evaluation.evaluation)}
                    </span>
                  </div>
                  <h3 className="text-lg font-display text-heading mb-2">
                    {evaluation.problemStatement.title}
                  </h3>
                  {evaluation.problemStatement.description && (
                    <p className="text-gray-400 text-sm mb-3">
                      {evaluation.problemStatement.description}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-sm text-gray-400">
                    {evaluation.evaluation?.totalRanked || 0} /{" "}
                    {evaluation.totalTeams} teams ranked
                  </div>
                  {evaluation.evaluation?.submittedAt && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <Calendar className="w-3 h-3" />
                      Submitted:{" "}
                      {new Date(
                        evaluation.evaluation.submittedAt
                      ).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Rankings */}
              {evaluation.evaluation &&
              evaluation.evaluation.rankings.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">
                    Team Rankings:
                  </h4>
                  {evaluation.evaluation.rankings.map((ranking) => (
                    <div
                      key={ranking.teamId}
                      className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${getRankColor(
                            ranking.rank
                          )}`}
                        >
                          {getRankIcon(ranking.rank)}
                          <span>#{ranking.rank}</span>
                        </div>
                        <div>
                          <h5 className="text-white font-medium">
                            {ranking.teamName}
                          </h5>
                          <p className="text-gray-400 text-sm">
                            Leader: {ranking.teamLeader.name} (
                            {ranking.teamLeader.email})
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        {ranking.score && (
                          <div className="text-sm font-medium text-blue-400 mb-1">
                            Score: {ranking.score}/100
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          Evaluated:{" "}
                          {new Date(ranking.evaluatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                  <p>No rankings submitted yet</p>
                  <p className="text-sm mt-1">
                    {evaluation.totalTeams} teams waiting to be evaluated
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
