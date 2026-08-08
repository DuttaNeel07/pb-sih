"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/lib/context/AdminAuthContext";
import {
  Users,
  Settings,
  Edit,
  Save,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface ProblemStatement {
  _id: string;
  title: string;
  psNumber?: string;
}

interface Evaluator {
  _id: string;
  email: string;
  assignedProblemStatements: ProblemStatement[];
  isActive: boolean;
  createdAt: string;
}

interface AssignmentData {
  evaluators: Evaluator[];
  problemStatements: ProblemStatement[];
}

export default function EvaluatorAssignments() {
  const { isSuperAdmin } = useAdminAuth();
  const [assignmentData, setAssignmentData] = useState<AssignmentData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [editingEvaluator, setEditingEvaluator] = useState<string | null>(null);
  const [selectedProblemStatements, setSelectedProblemStatements] = useState<
    string[]
  >([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAssignmentData();
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  const fetchAssignmentData = async () => {
    const token = localStorage.getItem("adminToken");
    try {
      const response = await fetch("/sih/api/admin/evaluators/assignments", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAssignmentData(data);
      }
    } catch (error) {
      console.error("Error fetching assignment data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditEvaluator = (
    evaluatorId: string,
    currentAssignments: ProblemStatement[]
  ) => {
    setEditingEvaluator(evaluatorId);
    setSelectedProblemStatements(currentAssignments.map((ps) => ps._id));
  };

  const handleCancelEdit = () => {
    setEditingEvaluator(null);
    setSelectedProblemStatements([]);
  };

  const handleProblemStatementToggle = (problemStatementId: string) => {
    setSelectedProblemStatements((prev) => {
      if (prev.includes(problemStatementId)) {
        return prev.filter((id) => id !== problemStatementId);
      } else {
        return [...prev, problemStatementId];
      }
    });
  };

  const handleSaveAssignment = async () => {
    if (!editingEvaluator) return;

    setSaving(true);
    const token = localStorage.getItem("adminToken");

    try {
      const response = await fetch("/sih/api/admin/evaluators/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          evaluatorId: editingEvaluator,
          problemStatementIds: selectedProblemStatements,
        }),
      });

      if (response.ok) {
        await fetchAssignmentData(); // Refresh data
        setEditingEvaluator(null);
        setSelectedProblemStatements([]);
        alert("Assignment updated successfully!");
      } else {
        const errorData = await response.json();
        alert(`Failed to update assignment: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error updating assignment:", error);
      alert("An error occurred while updating assignment");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-heading border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading evaluator assignments...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-display text-heading mb-2">
            Access Denied
          </h2>
          <p className="text-gray-400">
            Only super admins can manage evaluator assignments.
          </p>
        </div>
      </AdminLayout>
    );
  }

  if (!assignmentData) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-display text-heading mb-2">
            Failed to Load Data
          </h2>
          <p className="text-gray-400">
            Unable to load evaluator assignment data.
          </p>
        </div>
      </AdminLayout>
    );
  }

  const { evaluators, problemStatements } = assignmentData;

  // Helper function to format problem statement display
  const formatProblemStatement = (ps: ProblemStatement) => {
    if (ps.psNumber) {
      return `${ps.psNumber} - ${ps.title}`;
    }
    return ps.title;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display text-heading mb-2">
              Evaluator Assignments
            </h1>
            <p className="text-gray-400">
              Manage problem statement assignments for evaluators
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg">
            <Users className="w-4 h-4" />
            {evaluators.length} Evaluators
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-display text-heading">
                Active Evaluators
              </h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {evaluators.filter((e) => e.isActive).length}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Settings className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-display text-heading">
                Problem Statements
              </h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {problemStatements.length}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-display text-heading">Assignments</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {evaluators.reduce(
                (sum, e) => sum + e.assignedProblemStatements.length,
                0
              )}
            </p>
          </motion.div>
        </div>

        {/* Evaluators List */}
        <div className="space-y-4">
          <h2 className="text-xl font-display text-heading">
            Evaluator Assignments
          </h2>

          {evaluators.length === 0 ? (
            <div className="text-center py-12 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl">
              <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-display text-gray-400 mb-2">
                No Evaluators Found
              </h3>
              <p className="text-gray-500">
                No evaluator accounts have been created yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {evaluators.map((evaluator) => (
                <motion.div
                  key={evaluator._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-display text-heading">
                          {evaluator.email}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded text-xs border ${
                            evaluator.isActive
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : "bg-red-500/20 text-red-400 border-red-500/30"
                          }`}
                        >
                          {evaluator.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-4">
                        Joined:{" "}
                        {new Date(evaluator.createdAt).toLocaleDateString()}
                      </p>

                      {/* Current Assignments */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">
                          Assigned Problem Statements (
                          {evaluator.assignedProblemStatements.length}):
                        </h4>

                        {editingEvaluator === evaluator._id ? (
                          /* Edit Mode */
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 gap-2">
                              {problemStatements.map((ps) => (
                                <label
                                  key={ps._id}
                                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                    selectedProblemStatements.includes(ps._id)
                                      ? "bg-heading/20 border-heading/30 text-heading"
                                      : "bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedProblemStatements.includes(
                                      ps._id
                                    )}
                                    onChange={() =>
                                      handleProblemStatementToggle(ps._id)
                                    }
                                    className="w-4 h-4 text-heading bg-gray-700 border-gray-600 rounded focus:ring-heading"
                                  />
                                  <span className="flex-1">
                                    {formatProblemStatement(ps)}
                                  </span>
                                </label>
                              ))}
                            </div>

                            <div className="text-xs text-gray-500">
                              Selected: {selectedProblemStatements.length}{" "}
                              problem statement
                              {selectedProblemStatements.length !== 1
                                ? "s"
                                : ""}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleSaveAssignment}
                                disabled={saving}
                                className="px-4 py-2 bg-heading/20 border border-heading/30 text-heading rounded-lg hover:bg-heading/30 transition-colors flex items-center gap-2 disabled:opacity-50"
                              >
                                <Save className="w-4 h-4" />
                                {saving ? "Saving..." : "Save"}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                disabled={saving}
                                className="px-4 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                              >
                                <X className="w-4 h-4" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* View Mode */
                          <div>
                            {evaluator.assignedProblemStatements.length ===
                            0 ? (
                              <p className="text-gray-500 text-sm">
                                No assignments yet
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {evaluator.assignedProblemStatements.map(
                                  (ps) => (
                                    <div
                                      key={ps._id}
                                      className="px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-300"
                                    >
                                      {formatProblemStatement(ps)}
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    {editingEvaluator !== evaluator._id && (
                      <button
                        onClick={() =>
                          handleEditEvaluator(
                            evaluator._id,
                            evaluator.assignedProblemStatements
                          )
                        }
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                        title="Edit assignments"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
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
