"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/lib/context/AdminAuthContext";
import { AlertCircle } from "lucide-react";
import posthog from "posthog-js";
import toast from "react-hot-toast";

interface Task {
  _id: string;
  title: string;
  description: string;
  fields: TaskField[];
  assignedTo?: string[];
  assignedTeamsCount?: number;
  dueDate?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

interface TaskField {
  label: string;
  type: "text" | "textarea" | "file" | "url" | "number" | "date";
  required: boolean;
  description?: string;
  acceptedFormats?: string[];
  maxSize?: number;
  maxLength?: number;
  placeholder?: string;
}

interface Team {
  _id: string;
  teamName: string;
  leader: { name: string; email: string };
  status: string;
  registrationDate: string;
}

export default function TasksManagement() {
  const { isSuperAdmin } = useAdminAuth();
  // Remove unused admin variable
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [teamsByStatus, setTeamsByStatus] = useState<Record<string, Team[]>>(
    {}
  );
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(
    new Set()
  );
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [teamStatusFilter, setTeamStatusFilter] = useState("all");
  const [registrationStartDate, setRegistrationStartDate] = useState("");
  const [registrationEndDate, setRegistrationEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    fields: [] as TaskField[],
    assignedTo: [] as string[],
    dueDate: "",
    dueTime: "",
  });

  // Function definitions
  const fetchTasks = async () => {
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
        setTasks(data.tasks || []);
      } else {
        console.error("Failed to fetch tasks:", response.status);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamsForSelection = useCallback(async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (teamStatusFilter !== "all") {
        params.append("status", teamStatusFilter);
      }
      if (registrationStartDate) {
        params.append("startDate", registrationStartDate);
      }
      if (registrationEndDate) {
        params.append("endDate", registrationEndDate);
      }

      const response = await fetch(
        `/api/admin/teams/selection?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAllTeams(data.teams || []);
        setTeamsByStatus(data.teamsByStatus || {});
        setStatusCounts(data.statusCounts || {});
      } else {
        console.error("Failed to fetch teams:", response.status);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  }, [teamStatusFilter, registrationStartDate, registrationEndDate]);

  useEffect(() => {
    fetchTasks();
    // Initial fetch of teams without any filters
    const initialFetchTeams = async () => {
      const token = localStorage.getItem("adminToken");
      if (!token) return;

      try {
        const response = await fetch("/sih/api/admin/teams/selection", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setAllTeams(data.teams || []);
          setTeamsByStatus(data.teamsByStatus || {});
          setStatusCounts(data.statusCounts || {});
        } else {
          console.error("Failed to fetch teams:", response.status);
        }
      } catch (error) {
        console.error("Error fetching teams:", error);
      }
    };

    initialFetchTeams();
  }, []);

  // Refetch teams when filters change
  useEffect(() => {
    fetchTeamsForSelection();
  }, [
    teamStatusFilter,
    registrationStartDate,
    registrationEndDate,
    fetchTeamsForSelection,
  ]);

  // Filter teams based on search query and status
  useEffect(() => {
    let filtered = allTeams;

    // Filter by status
    if (teamStatusFilter !== "all") {
      filtered = filtered.filter((team) => team.status === teamStatusFilter);
    }

    // Filter by registration date range
    if (registrationStartDate || registrationEndDate) {
      filtered = filtered.filter((team) => {
        const teamRegDate = new Date(team.registrationDate);
        let matchesDateRange = true;

        if (registrationStartDate) {
          const startDate = new Date(registrationStartDate);
          matchesDateRange = matchesDateRange && teamRegDate >= startDate;
        }

        if (registrationEndDate) {
          const endDate = new Date(registrationEndDate);
          endDate.setHours(23, 59, 59, 999); // Include the full day
          matchesDateRange = matchesDateRange && teamRegDate <= endDate;
        }

        return matchesDateRange;
      });
    }

    // Filter by search query
    if (teamSearchQuery.trim()) {
      const query = teamSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (team) =>
          team.teamName.toLowerCase().includes(query) ||
          team.leader.name.toLowerCase().includes(query) ||
          team.leader.email.toLowerCase().includes(query)
      );
    }

    setFilteredTeams(filtered);
  }, [
    allTeams,
    teamSearchQuery,
    teamStatusFilter,
    registrationStartDate,
    registrationEndDate,
  ]);

  // Update assignedTo array when selectedTeamIds changes
  useEffect(() => {
    setNewTask((prev) => ({
      ...prev,
      assignedTo: Array.from(selectedTeamIds),
    }));
  }, [selectedTeamIds]);

  // Bulk selection functions
  const selectAllTeams = () => {
    const allTeamIds = new Set(filteredTeams.map((team) => team._id));
    setSelectedTeamIds(allTeamIds);
  };

  const selectNoneTeams = () => {
    setSelectedTeamIds(new Set());
  };

  const selectTeamsByStatus = (status: string) => {
    const teamsWithStatus = allTeams.filter((team) => team.status === status);
    const teamIds = new Set(teamsWithStatus.map((team) => team._id));
    setSelectedTeamIds(teamIds);
  };

  const toggleTeamSelection = (teamId: string) => {
    const newSelection = new Set(selectedTeamIds);
    if (newSelection.has(teamId)) {
      newSelection.delete(teamId);
    } else {
      newSelection.add(teamId);
    }
    setSelectedTeamIds(newSelection);
  };

  const handleTeamSearch = (query: string) => {
    setTeamSearchQuery(query);
  };

  const handleStatusFilter = (status: string) => {
    setTeamStatusFilter(status);
  };

  const resetTaskForm = () => {
    setNewTask({
      title: "",
      description: "",
      fields: [],
      assignedTo: [],
      dueDate: "",
      dueTime: "",
    });
    setSelectedTeamIds(new Set());
    setTeamSearchQuery("");
    setTeamStatusFilter("all");
    setRegistrationStartDate("");
    setRegistrationEndDate("");
  };

  const addField = () => {
    setNewTask((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        {
          label: "",
          type: "text",
          required: false,
          description: "",
          acceptedFormats: [],
          maxSize: 10,
          maxLength: 500,
          placeholder: "",
        },
      ],
    }));
  };

  const updateField = (index: number, field: Partial<TaskField>) => {
    setNewTask((prev) => ({
      ...prev,
      fields: prev.fields.map((f, i) => (i === index ? { ...f, ...field } : f)),
    }));
  };

  const removeField = (index: number) => {
    setNewTask((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  };

  const createTask = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token || !newTask.title.trim()) return;

    setSubmitting(true);
    try {
      // Combine date and time if both are provided
      let combinedDateTime = "";
      if (newTask.dueDate) {
        if (newTask.dueTime) {
          combinedDateTime = `${newTask.dueDate}T${newTask.dueTime}:00`;
        } else {
          combinedDateTime = `${newTask.dueDate}T23:59:59`;
        }
      }

      const taskData = {
        title: newTask.title,
        description: newTask.description,
        fields: newTask.fields,
        assignedTo: newTask.assignedTo,
        dueDate: combinedDateTime || undefined,
      };

      const response = await fetch("/sih/api/admin/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(taskData),
      });

      if (response.ok) {
        posthog.capture("admin_task_created", {
          assigned_team_count: taskData.assignedTo.length,
          field_count: taskData.fields.length,
          has_due_date: Boolean(taskData.dueDate),
        });
        await fetchTasks(); // Refresh tasks
        setShowCreateForm(false);
        setNewTask({
          title: "",
          description: "",
          fields: [],
          assignedTo: [],
          dueDate: "",
          dueTime: "",
        });
        setSelectedTeamIds(new Set()); // Clear team selection
        toast.success("Task created and assigned successfully!");
      } else {
        const error = await response.json();
        toast.error(`Failed to create task: ${error.message}`);
      }
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("An error occurred while creating the task");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: boolean) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const response = await fetch("/sih/api/admin/tasks", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ taskId, isActive: !currentStatus }),
      });

      if (response.ok) {
        posthog.capture("admin_task_status_updated", {
          is_active: !currentStatus,
        });
        setTasks(
          tasks.map((task) =>
            task._id === taskId ? { ...task, isActive: !currentStatus } : task
          )
        );
      } else {
        console.error("Failed to update task status:", response.status);
      }
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  // If not a super admin, show access denied
  if (!isSuperAdmin) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600">
              You don&apos;t have permission to access this page.
            </p>
          </div>
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
              Task Management
            </h1>
            <p className="text-subheading font-body">
              Create and assign tasks to teams
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-6 py-2 bg-heading/20 border border-heading/30 text-heading rounded-lg hover:bg-heading/30 transition-colors"
          >
            Create New Task
          </button>
        </div>

        {/* Tasks List */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-heading mx-auto mb-4"></div>
              <p className="text-gray-400">Loading tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-gray-600 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              <p className="text-gray-400 text-lg">No tasks created yet</p>
              <p className="text-gray-500 text-sm mt-2">
                Create your first task to get started
              </p>
            </div>
          ) : (
            tasks.map((task) => (
              <motion.div
                key={task._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-display text-heading mb-2">
                      {task.title}
                    </h3>
                    <p className="text-gray-400 text-sm mb-3">
                      {task.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>
                        Assigned to{" "}
                        {task.assignedTeamsCount ??
                          task.assignedTo?.length ??
                          0}{" "}
                        teams
                      </span>
                      {task.dueDate && (
                        <span>
                          Due:{" "}
                          {new Date(task.dueDate).toLocaleString("en-IN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                      <span>
                        Created: {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleTaskStatus(task._id, task.isActive)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      task.isActive ? "bg-green-600" : "bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        task.isActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Task Fields */}
                {task.fields.length > 0 && (
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="text-sm font-medium text-subheading mb-3">
                      Task Fields:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {task.fields.map((field, index) => (
                        <div
                          key={index}
                          className="bg-gray-800/50 rounded-lg p-3"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white text-sm font-medium">
                              {field.label}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                field.type === "file"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : field.type === "url"
                                  ? "bg-green-500/20 text-green-400"
                                  : field.type === "date"
                                  ? "bg-purple-500/20 text-purple-400"
                                  : field.type === "textarea"
                                  ? "bg-orange-500/20 text-orange-400"
                                  : "bg-gray-500/20 text-gray-400"
                              }`}
                            >
                              {field.type}
                            </span>
                            {field.required && (
                              <span className="text-xs text-red-400">
                                Required
                              </span>
                            )}
                          </div>
                          {field.description && (
                            <p className="text-xs text-gray-400 mb-2">
                              {field.description}
                            </p>
                          )}

                          {/* File Upload Restrictions Display */}
                          {field.type === "file" && (
                            <div className="text-xs text-gray-400 space-y-1">
                              {field.maxSize && (
                                <div className="flex items-center gap-1">
                                  <span className="text-blue-400">Size:</span>
                                  <span>
                                    {field.maxSize < 1
                                      ? `${Math.round(
                                          field.maxSize * 1024
                                        )} KB max`
                                      : `${field.maxSize} MB max`}
                                  </span>
                                </div>
                              )}
                              {field.acceptedFormats &&
                                field.acceptedFormats.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-blue-400">
                                      Formats:
                                    </span>
                                    <span>
                                      .{field.acceptedFormats.join(", .")}
                                    </span>
                                  </div>
                                )}
                            </div>
                          )}

                          {/* Text Field Restrictions Display */}
                          {(field.type === "text" ||
                            field.type === "textarea") && (
                            <div className="text-xs text-gray-400 space-y-1">
                              {field.maxLength && (
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-400">
                                    Max length:
                                  </span>
                                  <span>{field.maxLength} characters</span>
                                </div>
                              )}
                              {field.placeholder && (
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-400">
                                    Placeholder:
                                  </span>
                                  <span>&ldquo;{field.placeholder}&rdquo;</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>

        {/* Create Task Modal */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => {
                setShowCreateForm(false);
                resetTaskForm();
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-display text-heading">
                    Create New Task
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      resetTaskForm();
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <svg
                      className="w-6 h-6"
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

                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-subheading text-sm font-medium mb-2">
                        Task Title *
                      </label>
                      <input
                        type="text"
                        value={newTask.title}
                        onChange={(e) =>
                          setNewTask((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-heading"
                        placeholder="Enter task title"
                      />
                    </div>
                    <div>
                      <label className="block text-subheading text-sm font-medium mb-2">
                        Due Date & Time
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-gray-300 text-xs mb-1">
                            Date
                          </label>
                          <input
                            type="date"
                            value={newTask.dueDate}
                            onChange={(e) =>
                              setNewTask((prev) => ({
                                ...prev,
                                dueDate: e.target.value,
                                // Clear time if date is cleared
                                dueTime: e.target.value ? prev.dueTime : "",
                              }))
                            }
                            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-heading"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-300 text-xs mb-1">
                            Time
                          </label>
                          <input
                            type="time"
                            value={newTask.dueTime}
                            onChange={(e) =>
                              setNewTask((prev) => ({
                                ...prev,
                                dueTime: e.target.value,
                              }))
                            }
                            disabled={!newTask.dueDate}
                            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-heading disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="Optional"
                          />
                          {!newTask.dueDate && (
                            <p className="text-gray-500 text-xs mt-1">
                              Select a date first to enable time
                            </p>
                          )}
                          {newTask.dueDate && !newTask.dueTime && (
                            <p className="text-gray-400 text-xs mt-1">
                              Will default to 11:59 PM if not specified
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-subheading text-sm font-medium mb-2">
                      Description
                    </label>
                    <textarea
                      value={newTask.description}
                      onChange={(e) =>
                        setNewTask((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-heading"
                      placeholder="Describe the task requirements"
                    />
                  </div>

                  {/* Assign to Teams */}
                  <div>
                    <label className="block text-subheading text-sm font-medium mb-3">
                      Assign to Teams
                    </label>

                    {/* Search and Filter Controls */}
                    <div className="mb-4 space-y-3">
                      {/* Search Bar */}
                      <input
                        type="text"
                        placeholder="Search teams by name, leader, or email..."
                        value={teamSearchQuery}
                        onChange={(e) => handleTeamSearch(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-heading"
                      />

                      {/* Registration Date Filter */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-gray-300 text-xs mb-1">
                            Registration Start Date
                          </label>
                          <input
                            type="date"
                            value={registrationStartDate}
                            onChange={(e) =>
                              setRegistrationStartDate(e.target.value)
                            }
                            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-heading"
                            placeholder="From date"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-300 text-xs mb-1">
                            Registration End Date
                          </label>
                          <input
                            type="date"
                            value={registrationEndDate}
                            onChange={(e) =>
                              setRegistrationEndDate(e.target.value)
                            }
                            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-heading"
                            placeholder="To date"
                          />
                        </div>
                      </div>

                      {/* Clear Date Filters Button */}
                      {(registrationStartDate || registrationEndDate) && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRegistrationStartDate("");
                              setRegistrationEndDate("");
                            }}
                            className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-sm hover:bg-red-500/30 transition-colors"
                          >
                            Clear Date Filters
                          </button>
                          <span className="text-xs text-gray-400">
                            {registrationStartDate && registrationEndDate
                              ? `Showing teams registered between ${new Date(
                                  registrationStartDate
                                ).toLocaleDateString()} and ${new Date(
                                  registrationEndDate
                                ).toLocaleDateString()}`
                              : registrationStartDate
                              ? `Showing teams registered from ${new Date(
                                  registrationStartDate
                                ).toLocaleDateString()}`
                              : `Showing teams registered until ${new Date(
                                  registrationEndDate
                                ).toLocaleDateString()}`}
                          </span>
                        </div>
                      )}

                      {/* Filter and Bulk Selection Row */}
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Status Filter */}
                        <select
                          value={teamStatusFilter}
                          onChange={(e) => handleStatusFilter(e.target.value)}
                          className="px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-heading"
                        >
                          <option value="all">
                            All Status ({allTeams.length})
                          </option>
                          {Object.entries(statusCounts).map(
                            ([status, count]) => (
                              <option key={status} value={status}>
                                {status.charAt(0).toUpperCase() +
                                  status.slice(1)}{" "}
                                ({count})
                              </option>
                            )
                          )}
                        </select>

                        {/* Bulk Selection Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={selectAllTeams}
                            className="px-3 py-1 bg-heading/20 text-heading border border-heading/30 rounded text-sm hover:bg-heading/30 transition-colors"
                          >
                            Select All ({filteredTeams.length})
                          </button>
                          <button
                            type="button"
                            onClick={selectNoneTeams}
                            className="px-3 py-1 bg-gray-700 text-gray-300 border border-gray-600 rounded text-sm hover:bg-gray-600 transition-colors"
                          >
                            Select None
                          </button>
                        </div>

                        {/* Quick Status Selection */}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-sm">
                            Quick select:
                          </span>
                          {Object.entries(statusCounts).map(
                            ([status, count]) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => selectTeamsByStatus(status)}
                                className={`px-2 py-1 rounded text-xs transition-colors ${
                                  status === "selected"
                                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                    : status === "registered"
                                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                    : status === "finalist"
                                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                    : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                                } hover:opacity-80`}
                              >
                                {status} ({count})
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      {/* Selection Summary */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">
                          Showing {filteredTeams.length} of {allTeams.length}{" "}
                          teams
                        </span>
                        <span className="text-heading font-medium">
                          Selected: {selectedTeamIds.size} teams
                        </span>
                      </div>
                    </div>

                    {/* Team List */}
                    <div className="bg-gray-800/50 border border-gray-600 rounded-lg max-h-60 overflow-y-auto">
                      {filteredTeams.length === 0 ? (
                        <div className="p-4 text-center text-gray-400">
                          {teamSearchQuery ||
                          teamStatusFilter !== "all" ||
                          registrationStartDate ||
                          registrationEndDate
                            ? "No teams match the current filters"
                            : "No teams available"}
                        </div>
                      ) : (
                        <div className="p-3 space-y-2">
                          {filteredTeams.map((team) => (
                            <label
                              key={team._id}
                              className="flex items-center gap-3 p-2 rounded hover:bg-gray-700/50 transition-colors cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedTeamIds.has(team._id)}
                                onChange={() => toggleTeamSelection(team._id)}
                                className="w-4 h-4 text-heading focus:ring-heading border-gray-600 rounded"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-white text-sm font-medium truncate">
                                    {team.teamName}
                                  </span>
                                  <span
                                    className={`text-xs px-2 py-1 rounded ${
                                      team.status === "selected"
                                        ? "bg-green-500/20 text-green-400"
                                        : team.status === "registered"
                                        ? "bg-blue-500/20 text-blue-400"
                                        : team.status === "finalist"
                                        ? "bg-purple-500/20 text-purple-400"
                                        : "bg-gray-500/20 text-gray-400"
                                    }`}
                                  >
                                    {team.status}
                                  </span>
                                </div>
                                <div className="text-gray-400 text-xs truncate">
                                  {team.leader.name} • {team.leader.email}
                                </div>
                                <div className="text-gray-500 text-xs">
                                  Registered:{" "}
                                  {new Date(
                                    team.registrationDate
                                  ).toLocaleDateString("en-IN", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Task Fields */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-subheading text-sm font-medium">
                        Task Fields
                      </label>
                      <button
                        onClick={addField}
                        className="text-sm px-3 py-1 bg-heading/20 text-heading border border-heading/30 rounded hover:bg-heading/30"
                      >
                        Add Field
                      </button>
                    </div>

                    <div className="space-y-4">
                      {newTask.fields.map((field, index) => (
                        <div
                          key={index}
                          className="bg-gray-800/50 border border-gray-600 rounded-lg p-4"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) =>
                                updateField(index, { label: e.target.value })
                              }
                              placeholder="Field label"
                              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-heading"
                            />
                            <select
                              value={field.type}
                              onChange={(e) =>
                                updateField(index, {
                                  type: e.target.value as TaskField["type"],
                                })
                              }
                              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-heading"
                            >
                              <option value="text">Text</option>
                              <option value="textarea">Textarea</option>
                              <option value="file">File Upload</option>
                              <option value="url">URL</option>
                              <option value="number">Number</option>
                              <option value="date">Date</option>
                            </select>
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={field.required}
                                  onChange={(e) =>
                                    updateField(index, {
                                      required: e.target.checked,
                                    })
                                  }
                                  className="w-4 h-4 text-heading focus:ring-heading border-gray-600 rounded"
                                />
                                <span className="text-white text-sm">
                                  Required
                                </span>
                              </label>
                              <button
                                onClick={() => removeField(index)}
                                className="text-red-400 hover:text-red-300 ml-auto"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Field Description */}
                          <div className="mb-3">
                            <input
                              type="text"
                              value={field.description || ""}
                              onChange={(e) =>
                                updateField(index, {
                                  description: e.target.value,
                                })
                              }
                              placeholder="Field description (optional)"
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-heading"
                            />
                          </div>

                          {/* File Upload Specific Controls */}
                          {field.type === "file" && (
                            <div className="space-y-3 border-t border-gray-700 pt-3">
                              <h5 className="text-sm font-medium text-white">
                                File Upload Settings
                              </h5>

                              {/* File Size Limit */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-gray-300 text-xs mb-1">
                                    Max File Size
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      value={field.maxSize || 10}
                                      onChange={(e) =>
                                        updateField(index, {
                                          maxSize:
                                            parseFloat(e.target.value) || 10,
                                        })
                                      }
                                      min="0.001"
                                      max="100"
                                      step="0.1"
                                      className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-heading"
                                    />
                                    <span className="text-gray-400 text-xs">
                                      MB
                                    </span>
                                  </div>
                                  <p className="text-gray-500 text-xs mt-1">
                                    {field.maxSize && field.maxSize < 1
                                      ? `${Math.round(field.maxSize * 1024)} KB`
                                      : `${field.maxSize || 10} MB`}
                                  </p>
                                </div>

                                {/* Quick Size Presets */}
                                <div>
                                  <label className="block text-gray-300 text-xs mb-1">
                                    Quick Presets
                                  </label>
                                  <div className="flex flex-wrap gap-1">
                                    {[
                                      { label: "500KB", value: 0.5 },
                                      { label: "1MB", value: 1 },
                                      { label: "5MB", value: 5 },
                                      { label: "10MB", value: 10 },
                                    ].map((preset) => (
                                      <button
                                        key={preset.label}
                                        type="button"
                                        onClick={() =>
                                          updateField(index, {
                                            maxSize: preset.value,
                                          })
                                        }
                                        className={`px-2 py-1 text-xs rounded transition-colors ${
                                          field.maxSize === preset.value
                                            ? "bg-heading/30 text-heading border border-heading/50"
                                            : "bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600"
                                        }`}
                                      >
                                        {preset.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Allowed File Formats */}
                              <div>
                                <label className="block text-gray-300 text-xs mb-1">
                                  Allowed File Formats
                                </label>
                                <div className="space-y-2">
                                  {/* Common Format Checkboxes */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {[
                                      { label: "PDF", value: "pdf" },
                                      { label: "Word", value: "doc,docx" },
                                      {
                                        label: "PowerPoint",
                                        value: "ppt,pptx",
                                      },
                                      { label: "Excel", value: "xls,xlsx" },
                                      {
                                        label: "Images",
                                        value: "jpg,jpeg,png,gif",
                                      },
                                      { label: "Text", value: "txt,rtf" },
                                      { label: "Video", value: "mp4,avi,mov" },
                                      { label: "Audio", value: "mp3,wav,aac" },
                                    ].map((formatGroup) => {
                                      const formats =
                                        formatGroup.value.split(",");
                                      const isSelected = formats.some(
                                        (format) =>
                                          field.acceptedFormats?.includes(
                                            format
                                          )
                                      );

                                      return (
                                        <label
                                          key={formatGroup.label}
                                          className="flex items-center gap-2"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                              const currentFormats =
                                                field.acceptedFormats || [];
                                              let newFormats;

                                              if (e.target.checked) {
                                                newFormats = [
                                                  ...new Set([
                                                    ...currentFormats,
                                                    ...formats,
                                                  ]),
                                                ];
                                              } else {
                                                newFormats =
                                                  currentFormats.filter(
                                                    (f) => !formats.includes(f)
                                                  );
                                              }

                                              updateField(index, {
                                                acceptedFormats: newFormats,
                                              });
                                            }}
                                            className="w-3 h-3 text-heading focus:ring-heading border-gray-600 rounded"
                                          />
                                          <span className="text-white text-xs">
                                            {formatGroup.label}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>

                                  {/* Custom Format Input */}
                                  <div>
                                    <input
                                      type="text"
                                      placeholder="Custom formats (comma-separated, e.g., zip,rar)"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          const input =
                                            e.target as HTMLInputElement;
                                          const customFormats = input.value
                                            .split(",")
                                            .map((f) => f.trim().toLowerCase())
                                            .filter((f) => f);

                                          if (customFormats.length > 0) {
                                            const currentFormats =
                                              field.acceptedFormats || [];
                                            const newFormats = [
                                              ...new Set([
                                                ...currentFormats,
                                                ...customFormats,
                                              ]),
                                            ];
                                            updateField(index, {
                                              acceptedFormats: newFormats,
                                            });
                                            input.value = "";
                                          }
                                        }
                                      }}
                                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-heading"
                                    />
                                  </div>

                                  {/* Selected Formats Display */}
                                  {field.acceptedFormats &&
                                    field.acceptedFormats.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {field.acceptedFormats.map(
                                          (format, formatIndex) => (
                                            <span
                                              key={formatIndex}
                                              className="inline-flex items-center gap-1 px-2 py-1 bg-heading/20 text-heading text-xs rounded border border-heading/30"
                                            >
                                              .{format}
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const newFormats =
                                                    field.acceptedFormats?.filter(
                                                      (_, i) =>
                                                        i !== formatIndex
                                                    ) || [];
                                                  updateField(index, {
                                                    acceptedFormats: newFormats,
                                                  });
                                                }}
                                                className="text-heading hover:text-red-400 ml-1"
                                              >
                                                ×
                                              </button>
                                            </span>
                                          )
                                        )}
                                      </div>
                                    )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Text Field Specific Controls */}
                          {(field.type === "text" ||
                            field.type === "textarea") && (
                            <div className="space-y-3 border-t border-gray-700 pt-3">
                              <h5 className="text-sm font-medium text-white">
                                Text Field Settings
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-gray-300 text-xs mb-1">
                                    Placeholder Text
                                  </label>
                                  <input
                                    type="text"
                                    value={field.placeholder || ""}
                                    onChange={(e) =>
                                      updateField(index, {
                                        placeholder: e.target.value,
                                      })
                                    }
                                    placeholder="Enter placeholder text"
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-heading"
                                  />
                                </div>
                                <div>
                                  <label className="block text-gray-300 text-xs mb-1">
                                    Max Length
                                  </label>
                                  <input
                                    type="number"
                                    value={field.maxLength || 500}
                                    onChange={(e) =>
                                      updateField(index, {
                                        maxLength:
                                          parseInt(e.target.value) || 500,
                                      })
                                    }
                                    min="1"
                                    max="10000"
                                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-heading"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-6 border-t border-gray-700">
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        resetTaskForm();
                      }}
                      className="px-6 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createTask}
                      disabled={
                        submitting ||
                        !newTask.title.trim() ||
                        (newTask.assignedTo?.length || 0) === 0
                      }
                      className="px-6 py-2 bg-heading/20 border border-heading/30 text-heading rounded-lg hover:bg-heading/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? "Creating..." : "Create Task"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
