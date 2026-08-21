"use client";
import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, Reorder } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  ArrowLeft,
  Users,
  Trophy,
  Star,
  Save,
  Send,
  GripVertical,
  CheckCircle,
  AlertCircle,
  FileText,
  Download,
  Eye,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import posthog from "posthog-js";

interface TaskSubmission {
  taskId: string;
  taskTitle: string;
  taskType: string;
  submittedAt: string;
  files: string[];
  data: Record<string, string | number>;
  status: string;
}

interface PPTEvaluation {
  _id: string;
  teamName: string;
  problemStatement: string;
  evaluationResult: {
    diagramsUsed: number;
    evaluation: string;
    finalScore: number;
    problemStatement: string;
    teamName: string;
  };
  pptLinks: string[];
}

interface Team {
  _id: string;
  teamName: string;
  leader: {
    name: string;
    email: string;
  };
  status: string;
  registrationDate: string;
  submissions: TaskSubmission[];
  currentRank?: number;
  comments?: string;
  pptEvaluation?: PPTEvaluation;
}

interface ProblemStatement {
  _id: string;
  title: string;
  description?: string;
}

interface Evaluation {
  _id: string;
  isFinalized: boolean;
  submittedAt?: string;
}

interface RankingData {
  problemStatement: ProblemStatement;
  teams: Team[];
  evaluation: Evaluation | null;
}

export default function EvaluatorRanking() {
  const router = useRouter();
  const params = useParams();
  const problemStatementId = params.problemStatementId as string;

  const [rankingData, setRankingData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rankedTeams, setRankedTeams] = useState<Team[]>([]);
  const [comments, setComments] = useState<{ [teamId: string]: string }>({});
  const [expandedSubmissions, setExpandedSubmissions] = useState<{
    [teamId: string]: boolean;
  }>({});
  const [expandedTeams, setExpandedTeams] = useState<{
    [teamId: string]: boolean;
  }>({});
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [selectedPDFUrl, setSelectedPDFUrl] = useState("");

  // Helper functions
  const toggleSubmissions = (teamId: string) => {
    setExpandedSubmissions((prev) => ({
      ...prev,
      [teamId]: !prev[teamId],
    }));
  };

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) => ({
      ...prev,
      [teamId]: !prev[teamId],
    }));
  };

  const handlePDFPreview = (fileUrl: string) => {
    setSelectedPDFUrl(fileUrl);
    setShowPDFModal(true);
  };

  const handleDownloadFile = (fileUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileExtension = (filename: string) => {
    return filename.split(".").pop()?.toLowerCase() || "";
  };

  const getFileName = (fileUrl: string) => {
    return fileUrl.split("/").pop() || "file";
  };

  // Parse PPT evaluation scores from the evaluation string
  const parseEvaluationScores = (evaluation: string) => {
    const scores: { [key: string]: string } = {};
    const lines = evaluation.split('\n');
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.includes(':')) {
        const [category, scoreAndComment] = trimmedLine.split(':');
        if (category && scoreAndComment) {
          const categoryName = category.trim();
          scores[categoryName] = scoreAndComment.trim();
        }
      }
    });
    
    return scores;
  };

  // Get score color based on score value
  const getScoreColor = (scoreText: string) => {
    const match = scoreText.match(/^(\d+)\/(\d+)/);
    if (match) {
      const score = parseInt(match[1]);
      const maxScore = parseInt(match[2]);
      const percentage = (score / maxScore) * 100;
      
      if (percentage >= 80) return "text-green-400";
      if (percentage >= 60) return "text-yellow-400";
      if (percentage >= 40) return "text-orange-400";
      return "text-red-400";
    }
    return "text-gray-400";
  };

  const fetchRankingData = useCallback(async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/evaluator/ranking/${problemStatementId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRankingData(data);

        // Sort teams by PPT evaluation final score (highest first), then by current rank, then by registration date
        const sortedTeams = [...data.teams].sort((a, b) => {
          // First priority: PPT evaluation final score (highest first)
          const scoreA = a.pptEvaluation?.evaluationResult?.finalScore || 0;
          const scoreB = b.pptEvaluation?.evaluationResult?.finalScore || 0;
          if (scoreA !== scoreB) {
            return scoreB - scoreA; // Higher score comes first
          }
          
          // Second priority: current rank
          if (a.currentRank && b.currentRank) {
            return a.currentRank - b.currentRank;
          }
          if (a.currentRank) return -1;
          if (b.currentRank) return 1;
          
          // Third priority: registration date
          return (
            new Date(a.registrationDate).getTime() -
            new Date(b.registrationDate).getTime()
          );
        });

        setRankedTeams(sortedTeams);

        // Initialize comments from existing evaluation
        const initialComments: { [teamId: string]: string } = {};

        sortedTeams.forEach((team) => {
          if (team.comments) initialComments[team._id] = team.comments;
        });

        setComments(initialComments);
      } else if (response.status === 403) {
        router.push("/admin/evaluator");
      }
    } catch (error) {
      console.error("Error fetching ranking data:", error);
    } finally {
      setLoading(false);
    }
  }, [problemStatementId, router]);

  useEffect(() => {
    fetchRankingData();
  }, [fetchRankingData]);

  const handleCommentChange = (teamId: string, comment: string) => {
    setComments((prev) => ({
      ...prev,
      [teamId]: comment,
    }));
  };

  const saveRankings = async (finalize = false) => {
    if (!rankingData) return;

    // Validate required comments if finalizing
    if (finalize) {
      const missingComments = rankedTeams.filter(
        (team) => !comments[team._id]?.trim()
      );
      if (missingComments.length > 0) {
        alert(
          `Please provide evaluation comments for all teams before finalizing. Missing comments for: ${missingComments
            .map((t) => t.teamName)
            .join(", ")}`
        );
        return;
      }
    }

    setSaving(true);
    const token = localStorage.getItem("adminToken");

    try {
      const rankings = rankedTeams.map((team, index) => ({
        teamId: team._id,
        rank: index + 1,
        comments: comments[team._id] || undefined,
      }));

      const response = await fetch(
        `/api/admin/evaluator/ranking/${problemStatementId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rankings,
            isFinalized: finalize,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        posthog.capture(finalize ? "evaluator_rankings_finalized" : "evaluator_rankings_draft_saved", {
          ranked_team_count: rankings.length,
        });
        alert(
          finalize
            ? "Rankings finalized successfully!"
            : "Rankings saved as draft!"
        );

        if (finalize) {
          // Update evaluation state
          setRankingData((prev) =>
            prev
              ? {
                  ...prev,
                  evaluation: {
                    _id: data.evaluation._id,
                    isFinalized: true,
                    submittedAt: data.evaluation.submittedAt,
                  },
                }
              : null
          );
        }
      } else {
        const errorData = await response.json();
        alert(`Failed to save rankings: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error saving rankings:", error);
      alert("An error occurred while saving rankings");
    } finally {
      setSaving(false);
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

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-4 h-4" />;
      case 2:
      case 3:
        return <Star className="w-4 h-4" />;
      default:
        return (
          <span className="w-4 h-4 text-center text-xs font-bold">{rank}</span>
        );
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-heading border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading ranking interface...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!rankingData) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-display text-heading mb-2">
            Problem Statement Not Found
          </h2>
          <p className="text-gray-400 mb-4">
            The requested problem statement was not found or is not assigned to
            you.
          </p>
          <button
            onClick={() => router.push("/admin/evaluator")}
            className="px-4 py-2 bg-heading/20 border border-heading/30 text-heading rounded-lg hover:bg-heading/30 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </AdminLayout>
    );
  }

  const { problemStatement, teams, evaluation } = rankingData;
  const isFinalized = evaluation?.isFinalized || false;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin/evaluator")}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-display text-heading mb-1">
                Rank Submissions
              </h1>
              <p className="text-gray-400">{problemStatement.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isFinalized && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg">
                <CheckCircle className="w-4 h-4" />
                Finalized
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg">
              <Users className="w-4 h-4" />
              {teams.length} teams
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
          <h3 className="text-blue-400 font-medium mb-2">
            Ranking Instructions
          </h3>
          <ul className="text-sm text-blue-300 space-y-1">
            <li>
              • Drag and drop teams to reorder rankings (1 = best,{" "}
              {teams.length} = worst)
            </li>
            <li>• Add optional scores (0-100) and evaluation comments</li>
            <li>
              • Save as draft to continue later, or finalize to submit final
              rankings
            </li>
            <li>• Once finalized, rankings cannot be modified</li>
          </ul>
        </div>

        {/* Ranking Interface */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
          <Reorder.Group
            axis="y"
            values={rankedTeams}
            onReorder={setRankedTeams}
            className="space-y-4"
          >
            <AnimatePresence>
              {rankedTeams.map((team, index) => (
                <Reorder.Item
                  key={team._id}
                  value={team}
                  className={`bg-gray-800/50 border border-gray-700 rounded-xl ${
                    !isFinalized
                      ? "cursor-grab active:cursor-grabbing"
                      : "cursor-default"
                  }`}
                  dragListener={!isFinalized}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Collapsed Team Card */}
                  <div className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Drag Handle & Rank */}
                      <div className="flex items-center gap-3">
                        {!isFinalized && (
                          <GripVertical className="w-5 h-5 text-gray-500" />
                        )}
                        <div
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${getRankColor(
                            index + 1
                          )}`}
                        >
                          {getRankIcon(index + 1)}
                          <span>#{index + 1}</span>
                        </div>
                      </div>

                      {/* Team Basic Info */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-display text-heading">
                              {team.teamName}
                            </h3>
                            <p className="text-gray-400 text-sm">
                              Leader: {team.leader.name} ({team.leader.email})
                            </p>
                          </div>
                          
                          {/* Expand/Collapse Button */}
                          <button
                            onClick={() => toggleTeam(team._id)}
                            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200 border border-transparent hover:border-gray-600"
                          >
                            {expandedTeams[team._id] ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Team Details */}
                  {expandedTeams[team._id] && (
                    <div className="px-4 pb-4 border-t border-gray-700">
                      <div className="pt-4">

                      {/* Submissions Section */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-300">
                            📋 Submissions ({team.submissions?.length || 0}{" "}
                            tasks)
                          </h4>

                        </div>

                        {/* Submissions List */}
                        {team.submissions && team.submissions.length > 0 ? (
                          <div className="space-y-2">
                            {team.submissions
                              .slice(
                                0,
                                expandedSubmissions[team._id] ? undefined : 2
                              )
                              .map((submission) => (
                                <div
                                  key={submission.taskId}
                                  className="p-3 bg-gray-800/30 rounded-lg border border-gray-700"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <h5 className="text-sm font-medium text-heading">
                                        {submission.taskTitle}
                                      </h5>
                                      <p className="text-xs text-gray-400">
                                        Submitted:{" "}
                                        {new Date(
                                          submission.submittedAt
                                        ).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Files */}
                                  {submission.files &&
                                    submission.files.length > 0 && (
                                      <div className="mt-2">
                                        <div className="flex flex-wrap gap-2">
                                          {submission.files.map(
                                            (fileUrl, fileIdx) => {
                                              const filename =
                                                getFileName(fileUrl);
                                              const extension =
                                                getFileExtension(filename);
                                              const isPDF = extension === "pdf";

                                              return (
                                                <div
                                                  key={fileIdx}
                                                  className="flex items-center gap-2 px-2 py-1 bg-gray-700/50 rounded text-xs"
                                                >
                                                  <FileText className="w-3 h-3 text-blue-400" />
                                                  <span className="text-gray-300 truncate max-w-32">
                                                    {filename}
                                                  </span>
                                                  <div className="flex items-center gap-1">
                                                    {isPDF && (
                                                      <button
                                                        onClick={() =>
                                                          handlePDFPreview(
                                                            fileUrl
                                                          )
                                                        }
                                                        className="text-blue-400 hover:text-blue-300"
                                                        title="Preview"
                                                        >
                                                        <Eye className="w-3 h-3" />
                                                      </button>
                                                    )}
                                                    <button
                                                      onClick={() =>
                                                        handleDownloadFile(
                                                          fileUrl,
                                                          filename
                                                        )
                                                      }
                                                      className="text-green-400 hover:text-green-300"
                                                      title="Download"
                                                    >
                                                      <Download className="w-3 h-3" />
                                                    </button>
                                                  </div>
                                                </div>
                                              );
                                            }
                                          )}
                                        </div>
                                      </div>
                                    )}

                                  {/* Data/Form responses */}
                                  {submission.data &&
                                    Object.keys(submission.data).length > 0 && (
                                      <div className="mt-2 p-2 bg-gray-900/50 rounded text-xs">
                                        {Object.entries(submission.data).map(
                                          ([key, value]) => (
                                            <div
                                              key={key}
                                              className="flex justify-between"
                                            >
                                              <span className="text-gray-400">
                                                {key}:
                                              </span>
                                              <span className="text-gray-300 ml-2 truncate">
                                                {typeof value === "string" &&
                                                value.startsWith("http") ? (
                                                  <a
                                                    href={value}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                                                  >
                                                    Link{" "}
                                                    <ExternalLink className="w-3 h-3" />
                                                  </a>
                                                ) : (
                                                  String(value)
                                                )}
                                              </span>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    )}
                                </div>
                              ))}

                            {/* Show more button */}
                            {team.submissions.length > 2 &&
                              !expandedSubmissions[team._id] && (
                                <button
                                  onClick={() => toggleSubmissions(team._id)}
                                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  +{team.submissions.length - 2} more
                                  submissions
                                </button>
                              )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 italic">
                            No submissions found
                          </div>
                        )}
                      </div>

                      {/* PPT Evaluation Section */}
                      {team.pptEvaluation && (
                        <div className="mt-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                          <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                            PPT Evaluation Breakdown
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(parseEvaluationScores(team.pptEvaluation.evaluationResult.evaluation)).map(([category, scoreAndComment]) => {
                              const [scoreText, ...commentParts] = scoreAndComment.split(' - ');
                              const comment = commentParts.join(' - ');
                              
                              return (
                                <div key={category} className="p-2 bg-gray-900/50 rounded text-xs">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-gray-300 font-medium">{category}</span>
                                    <span className={`font-bold ${getScoreColor(scoreText)}`}>
                                      {scoreText}
                                    </span>
                                  </div>
                                  {comment && (
                                    <p className="text-gray-400 text-xs leading-relaxed">
                                      {comment}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Evaluation Comments - Now Required */}
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          💬 Evaluation Comments{" "}
                          <span className="text-red-400">*</span>
                        </label>
                        <textarea
                          value={comments[team._id] || ""}
                          onChange={(e) =>
                            handleCommentChange(team._id, e.target.value)
                          }
                          disabled={isFinalized}
                          className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-heading disabled:opacity-50 resize-none"
                          placeholder="Required: Enter detailed evaluation feedback..."
                          rows={3}
                          required
                          />
                        <p className="text-xs text-gray-500 mt-1">
                          Provide comprehensive feedback on innovation,
                          technical implementation, business viability, and
                          presentation quality.
                        </p>
                      </div>
                      </div>
                    </div>
                  )}
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        </div>

        {/* PDF Preview Modal */}
        {showPDFModal && selectedPDFUrl && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowPDFModal(false)}
          >
            <div
              className="bg-white rounded-lg w-full max-w-4xl h-full max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  PDF Preview
                </h3>
                <button
                  onClick={() => setShowPDFModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <iframe
                src={selectedPDFUrl}
                className="flex-1 w-full"
                title="PDF Preview"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!isFinalized && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Drag teams to reorder • Higher position = better rank
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => saveRankings(false)}
                disabled={saving}
                className="px-6 py-3 bg-gray-800 border border-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <button
                onClick={() => {
                  if (
                    confirm(
                      "Are you sure you want to finalize these rankings? This action cannot be undone."
                    )
                  ) {
                    saveRankings(true);
                  }
                }}
                disabled={saving}
                className="px-6 py-3 bg-heading/20 border border-heading/30 text-heading rounded-lg hover:bg-heading/30 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                Finalize Rankings
              </button>
            </div>
          </div>
        )}

        {isFinalized && evaluation?.submittedAt && (
          <div className="text-center py-6 bg-green-500/10 border border-green-500/30 rounded-2xl">
            <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <h3 className="text-green-400 font-medium mb-1">
              Rankings Finalized
            </h3>
            <p className="text-sm text-green-300">
              Submitted on{" "}
              {new Date(evaluation.submittedAt).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })}{" "}
              IST
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
