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
  AlertTriangle,
  Trophy,
  Star,
  TrendingUp,
  AlertCircle,
  FileText,
} from "lucide-react";

interface TeamConsensus {
  team: {
    _id: string;
    teamName: string;
    status: "registered" | "selected" | "rejected" | "finalist";
    leader: {
      name: string;
      email: string;
    };
  };
  rankings: Array<{
    evaluatorEmail: string;
    rank?: number;
    score?: number;
    comments?: string;
  }>;
  consensus: {
    averageRank: number | null;
    averageScore: number | null;
    rankStandardDeviation: number | null;
    conflictLevel: "low" | "medium" | "high";
    evaluatorCount: number;
  };
}

interface EvaluatorRanking {
  evaluator: {
    _id: string;
    email: string;
  };
  evaluation: {
    _id: string;
    isFinalized: boolean;
    submittedAt?: string;
    rankings: Array<{
      teamId: string;
      rank: number;
      score?: number;
      comments?: string;
    }>;
  } | null;
}

interface ProblemStatementAnalysis {
  problemStatement: {
    _id: string;
    psNumber: string;
    title: string;
    description?: string;
  };
  statistics: {
    totalTeams: number;
    totalEvaluators: number;
    completedEvaluations: number;
    pendingEvaluations: number;
    conflictingTeams: number;
  };
  evaluatorRankings: EvaluatorRanking[];
  consensusAnalysis: TeamConsensus[];
}

export default function ProblemStatementDetail() {
  const { isSuperAdmin } = useAdminAuth();
  const router = useRouter();
  const params = useParams();
  const problemStatementId = params.problemStatementId as string;
  const [data, setData] = useState<ProblemStatementAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<"consensus" | "comparison">(
    "consensus"
  );
  const [selectingTeamId, setSelectingTeamId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchProblemStatementAnalysis = useCallback(async () => {
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch(
        `/sih/api/admin/rankings/problem-statement/${problemStatementId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setData(data);
      } else if (response.status === 403) {
        router.push("/admin");
      } else if (response.status === 404) {
        router.push("/admin/super-admin-dashboard/problem-rankings");
      }
    } catch (error) {
      console.error("Error fetching problem statement analysis:", error);
    } finally {
      setLoading(false);
    }
  }, [problemStatementId, router]);

  useEffect(() => {
    if (!isSuperAdmin) {
      router.push("/admin");
      return;
    }
    fetchProblemStatementAnalysis();
  }, [isSuperAdmin, router, fetchProblemStatementAnalysis]);

  const selectTeam = async (
    teamId: string,
    teamName: string,
    leaderEmail: string
  ) => {
    setSelectingTeamId(teamId);
    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch(`/sih/api/admin/teams/${teamId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: "selected",
          sendCongratulationsEmail: true,
          teamName: teamName,
          problemStatement: data?.problemStatement?.title,
        }),
      });

      if (response.ok) {
        // Update the local data
        setData((prevData) => {
          if (!prevData) return prevData;

          return {
            ...prevData,
            consensusAnalysis: prevData.consensusAnalysis.map((team) =>
              team.team._id === teamId
                ? { ...team, team: { ...team.team, status: "selected" } }
                : team
            ),
          };
        });
        setSuccessMessage(
          `🎉 Team "${teamName}" has been selected! Congratulations email sent to ${leaderEmail}`
        );
        setTimeout(() => setSuccessMessage(null), 5000);
      } else if (response.status === 403) {
        router.push("/admin");
      } else {
        console.error("Failed to select team");
        setSuccessMessage("❌ Failed to select team. Please try again.");
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error) {
      console.error("Error selecting team:", error);
      setSuccessMessage("❌ Error selecting team. Please try again.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } finally {
      setSelectingTeamId(null);
    }
  };

  const getStatusColor = (
    status: "registered" | "selected" | "rejected" | "finalist"
  ) => {
    switch (status) {
      case "selected":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "finalist":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "rejected":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "registered":
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  const getConflictColor = (level: "low" | "medium" | "high") => {
    switch (level) {
      case "high":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low":
        return "bg-green-500/20 text-green-400 border-green-500/30";
    }
  };

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

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-heading border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">
              Loading problem statement analysis...
            </p>
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
            Problem Statement Not Found
          </h2>
          <p className="text-gray-400 mb-4">
            The requested problem statement was not found.
          </p>
          <button
            onClick={() =>
              router.push("/admin/super-admin-dashboard/problem-rankings")
            }
            className="px-4 py-2 bg-heading/20 border border-heading/30 text-heading rounded-lg hover:bg-heading/30 transition-colors"
          >
            Back to Problem Rankings
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
                router.push("/admin/super-admin-dashboard/problem-rankings")
              }
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-display text-heading mb-1">
                {data.problemStatement.psNumber} - {data.problemStatement.title}
              </h1>
              <p className="text-gray-400">
                Ranking analysis across {data.statistics.totalEvaluators}{" "}
                evaluators
              </p>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2 p-1 bg-gray-800 rounded-lg">
            <button
              onClick={() => setSelectedView("consensus")}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                selectedView === "consensus"
                  ? "bg-heading/20 text-heading"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Consensus View
            </button>
            <button
              onClick={() => setSelectedView("comparison")}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                selectedView === "comparison"
                  ? "bg-heading/20 text-heading"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Comparison Matrix
            </button>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-green-500/20 border border-green-500/30 text-green-400 px-6 py-4 rounded-lg shadow-lg"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="font-medium">{successMessage}</span>
            </div>
          </motion.div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-display text-heading">Teams</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {data.statistics.totalTeams}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-display text-heading">Evaluators</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {data.statistics.totalEvaluators}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <h3 className="text-sm font-display text-heading">Completed</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {data.statistics.completedEvaluations}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              <h3 className="text-sm font-display text-heading">Pending</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {data.statistics.pendingEvaluations}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="text-sm font-display text-heading">Conflicts</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {data.statistics.conflictingTeams}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-display text-heading">Comments</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {data.consensusAnalysis.reduce(
                (total, team) =>
                  total + team.rankings.filter((r) => r.comments).length,
                0
              )}
            </p>
          </motion.div>
        </div>

        {/* Content based on selected view */}
        {selectedView === "consensus" ? (
          /* Consensus View */
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
            <h2 className="text-xl font-display text-heading mb-6">
              Team Consensus Rankings
            </h2>
            <div className="space-y-4">
              {data.consensusAnalysis.map((team, index) => (
                <motion.div
                  key={team.team._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="bg-gray-800/50 border border-gray-700 rounded-xl p-6"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {team.consensus.averageRank && (
                        <div
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${getRankColor(
                            Math.round(team.consensus.averageRank)
                          )}`}
                        >
                          {getRankIcon(Math.round(team.consensus.averageRank))}
                          <span>#{Math.round(team.consensus.averageRank)}</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-display text-heading truncate">
                          {team.team.teamName}
                        </h3>
                        <p className="text-gray-400 text-sm truncate">
                          Leader: {team.team.leader.name} (
                          {team.team.leader.email})
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Team Status Display */}
                      <div
                        className={`px-3 py-1 rounded text-xs border font-medium ${getStatusColor(
                          team.team.status
                        )}`}
                      >
                        {team.team.status}
                      </div>

                      {/* Select Team Button - Only show if not already selected */}
                      {team.team.status !== "selected" &&
                        team.team.status !== "finalist" && (
                          <button
                            onClick={() =>
                              selectTeam(
                                team.team._id,
                                team.team.teamName,
                                team.team.leader.email
                              )
                            }
                            disabled={selectingTeamId === team.team._id}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2"
                          >
                            {selectingTeamId === team.team._id ? (
                              <>
                                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                                Selecting...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                Select Team
                              </>
                            )}
                          </button>
                        )}

                      <div
                        className={`px-3 py-1 rounded text-xs border ${getConflictColor(
                          team.consensus.conflictLevel
                        )}`}
                      >
                        {team.consensus.conflictLevel} conflict
                      </div>

                      <div className="text-right text-sm">
                        <div className="text-gray-400">
                          {team.consensus.evaluatorCount} evaluator(s)
                        </div>
                        <div className="text-blue-400 text-xs">
                          💬 {team.rankings.filter((r) => r.comments).length}{" "}
                          comments
                        </div>
                        {team.consensus.averageScore && (
                          <div className="text-blue-400">
                            Avg Score: {team.consensus.averageScore.toFixed(1)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Individual Rankings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {team.rankings.map((ranking, rankIndex) => (
                      <div
                        key={rankIndex}
                        className={`p-3 rounded-lg border ${
                          ranking.comments
                            ? "bg-gray-700/50 border-blue-500/30"
                            : "bg-gray-700/50 border-gray-600/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-300 text-sm font-medium">
                              {ranking.evaluatorEmail}
                            </span>
                            {ranking.comments && (
                              <div
                                className="w-2 h-2 bg-blue-400 rounded-full"
                                title="Has comments"
                              ></div>
                            )}
                          </div>
                          {ranking.rank && (
                            <span className="text-blue-400 font-medium">
                              #{ranking.rank}
                            </span>
                          )}
                        </div>
                        {ranking.score && (
                          <div className="text-xs text-gray-400 mb-2">
                            Score: {ranking.score}/100
                          </div>
                        )}
                        {ranking.comments && (
                          <div className="mt-2 pt-2 border-t border-gray-600">
                            <div className="text-xs text-gray-500 mb-1">
                              💬 Evaluator Comments:
                            </div>
                            <div className="text-xs text-gray-300 leading-relaxed">
                              {ranking.comments}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          /* Comparison Matrix */
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
            <h2 className="text-xl font-display text-heading mb-6">
              Evaluator Comparison Matrix
            </h2>

            {/* Evaluator Status */}
            <div className="mb-6">
              <h3 className="text-lg font-display text-heading mb-4">
                Evaluator Progress
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.evaluatorRankings.map((evaluatorRanking) => (
                  <div
                    key={evaluatorRanking.evaluator._id}
                    className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">
                        {evaluatorRanking.evaluator.email}
                      </span>
                      {evaluatorRanking.evaluation ? (
                        evaluatorRanking.evaluation.isFinalized ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <Clock className="w-5 h-5 text-yellow-400" />
                        )
                      ) : (
                        <AlertCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="text-sm text-gray-400">
                      {evaluatorRanking.evaluation
                        ? evaluatorRanking.evaluation.isFinalized
                          ? `Completed: ${evaluatorRanking.evaluation.rankings.length} teams`
                          : "Draft saved"
                        : "Not started"}
                    </div>
                    {evaluatorRanking.evaluation?.submittedAt && (
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(
                          evaluatorRanking.evaluation.submittedAt
                        ).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Matrix Table - Only show if there are completed evaluations */}
            {data.evaluatorRankings.some(
              (er) => er.evaluation?.isFinalized
            ) && (
              <div className="space-y-4">
                {/* Instructions */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-blue-400 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-medium">💡 Tip:</span>
                    <span>
                      Hover over rank numbers to view evaluator comments and
                      detailed feedback
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left p-3 text-gray-400 font-medium">
                          Team
                        </th>
                        {data.evaluatorRankings
                          .filter((er) => er.evaluation?.isFinalized)
                          .map((evaluatorRanking) => (
                            <th
                              key={evaluatorRanking.evaluator._id}
                              className="text-center p-3 text-gray-400 font-medium min-w-24"
                            >
                              {evaluatorRanking.evaluator.email.split("@")[0]}
                            </th>
                          ))}
                        <th className="text-center p-3 text-gray-400 font-medium">
                          Avg Rank
                        </th>
                        <th className="text-center p-3 text-gray-400 font-medium">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.consensusAnalysis.map((team) => (
                        <tr
                          key={team.team._id}
                          className="border-b border-gray-800 hover:bg-gray-800/30"
                        >
                          <td className="p-3">
                            <div className="text-white font-medium">
                              {team.team.teamName}
                            </div>
                            <div className="text-gray-400 text-sm">
                              {team.team.leader.name}
                            </div>
                          </td>
                          {data.evaluatorRankings
                            .filter((er) => er.evaluation?.isFinalized)
                            .map((evaluatorRanking) => {
                              const ranking = team.rankings.find(
                                (r) =>
                                  r.evaluatorEmail ===
                                  evaluatorRanking.evaluator.email
                              );
                              return (
                                <td
                                  key={evaluatorRanking.evaluator._id}
                                  className="text-center p-3"
                                >
                                  {ranking?.rank ? (
                                    <div className="group relative">
                                      <span
                                        className={`px-2 py-1 rounded text-sm font-medium cursor-help ${getRankColor(
                                          ranking.rank
                                        ).replace(
                                          "border-",
                                          "border border-"
                                        )}`}
                                        title={
                                          ranking.comments ||
                                          "No comments provided"
                                        }
                                      >
                                        #{ranking.rank}
                                      </span>
                                      {ranking.comments && (
                                        <div className="invisible group-hover:visible absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 border border-gray-600 rounded-lg text-xs text-gray-200 shadow-lg">
                                          <div className="font-medium text-blue-400 mb-1">
                                            💬{" "}
                                            {
                                              evaluatorRanking.evaluator.email.split(
                                                "@"
                                              )[0]
                                            }
                                            :
                                          </div>
                                          <div className="leading-relaxed">
                                            {ranking.comments}
                                          </div>
                                          {/* Tooltip arrow */}
                                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-500">-</span>
                                  )}
                                </td>
                              );
                            })}
                          <td className="text-center p-3">
                            {team.consensus.averageRank ? (
                              <div className="flex flex-col items-center">
                                <span className="text-white font-medium">
                                  #{team.consensus.averageRank.toFixed(1)}
                                </span>
                                <span
                                  className={`text-xs ${
                                    getConflictColor(
                                      team.consensus.conflictLevel
                                    ).split(" ")[1]
                                  }`}
                                >
                                  {team.consensus.conflictLevel}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="text-center p-3">
                            {team.team.status === "selected" ? (
                              <div className="flex items-center justify-center gap-2 text-green-400">
                                <CheckCircle className="w-5 h-5" />
                                <span className="text-sm font-medium">
                                  Selected
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={() =>
                                  selectTeam(
                                    team.team._id,
                                    team.team.teamName,
                                    team.team.leader.email
                                  )
                                }
                                disabled={selectingTeamId === team.team._id}
                                className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                              >
                                {selectingTeamId === team.team._id ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                                    Selecting...
                                  </div>
                                ) : (
                                  "Select Team"
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
