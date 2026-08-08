"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/lib/context/AdminAuthContext";
import { AlertCircle } from "lucide-react";

interface ProblemStatement {
  _id: string;
  psNumber: string;
  title: string;
  description: string;
  domain: string;
  link: string;
  teamCount: number;
  maxTeams: number;
  isActive: boolean;
  createdAt: string;
}

export default function ProblemStatementsManagement() {
  const { isSuperAdmin } = useAdminAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [problemStatements, setProblemStatements] = useState<
    ProblemStatement[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchProblemStatements();
  }, []);

  const fetchProblemStatements = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/sih/api/admin/problem-statements", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setProblemStatements(data.problemStatements || []);
      } else {
        console.error("Failed to fetch problem statements:", response.status);
      }
    } catch (error) {
      console.error("Error fetching problem statements:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePSStatus = async (psId: string, currentStatus: boolean) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const response = await fetch("/sih/api/admin/problem-statements", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ psId, isActive: !currentStatus }),
      });

      if (response.ok) {
        setProblemStatements(
          problemStatements.map((ps) =>
            ps._id === psId ? { ...ps, isActive: !currentStatus } : ps
          )
        );
      } else {
        console.error(
          "Failed to update problem statement status:",
          response.status
        );
      }
    } catch (error) {
      console.error("Error updating problem statement status:", error);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    const token = localStorage.getItem("adminToken");
    if (!file || !token) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/sih/api/admin/problem-statements", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully uploaded ${result.imported} problem statements!`);
        fetchProblemStatements(); // Refresh the list
      } else {
        const error = await response.json();
        alert(`Upload failed: ${error.message}`);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("An error occurred during upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const downloadTemplate = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const response = await fetch("/sih/api/admin/problem-statements/template", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "problem-statements-template.xlsx";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error("Failed to download template:", response.status);
        alert("Failed to download template");
      }
    } catch (error) {
      console.error("Error downloading template:", error);
      alert("Error downloading template");
    }
  };

  const filteredPS = problemStatements.filter((ps) => {
    const matchesSearch =
      searchTerm === "" ||
      ps.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ps.psNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ps.domain.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDomain = domainFilter === "all" || ps.domain === domainFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && ps.isActive) ||
      (statusFilter === "inactive" && !ps.isActive);

    return matchesSearch && matchesDomain && matchesStatus;
  });

  const domains = [...new Set(problemStatements.map((ps) => ps.domain))];

  // Redirect evaluators
  if (!isSuperAdmin) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-display text-heading mb-2">
            Access Denied
          </h2>
          <p className="text-gray-400">
            Only super admins can manage problem statements.
          </p>
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
              Problem Statements
            </h1>
            <p className="text-subheading font-body">
              Manage problem statements and bulk uploads
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={downloadTemplate}
              className="px-4 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Download Template
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-heading/20 border border-heading/30 text-heading rounded-lg hover:bg-heading/30 transition-colors disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Bulk Upload"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Upload Info */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-blue-400 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-blue-400 font-medium text-sm">
                Bulk Upload Instructions
              </p>
              <p className="text-blue-300/80 text-sm mt-1">
                Download the Excel template, fill in your problem statements
                data, then upload the file. Supported formats: .xlsx, .xls, .csv
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search problem statements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-heading focus:border-heading"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <select
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
                className="px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-heading"
              >
                <option value="all">All Domains</option>
                {domains.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-heading"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Problem Statements Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
                >
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-700 rounded mb-3"></div>
                    <div className="h-6 bg-gray-700 rounded mb-4"></div>
                    <div className="h-16 bg-gray-700 rounded mb-4"></div>
                    <div className="flex justify-between">
                      <div className="h-4 bg-gray-700 rounded w-20"></div>
                      <div className="h-8 bg-gray-700 rounded w-16"></div>
                    </div>
                  </div>
                </div>
              ))
            : filteredPS.map((ps) => (
                <motion.div
                  key={ps._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
                      <span className="bg-heading/10 text-heading px-3 py-1 rounded-full text-sm font-medium border border-heading/20">
                        {ps.domain}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {ps.psNumber.split("/").map((num, index) => (
                          <span
                            key={index}
                            className="bg-subheading/10 text-subheading px-2 py-1 rounded-full text-xs font-medium border border-subheading/20"
                          >
                            {num}
                          </span>
                        ))}
                      </div>
                      {ps.link && (
                        <div className="flex flex-wrap gap-1">
                          {ps.link.split("/").map((part, index) => (
                            <span
                              key={index}
                              className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full text-xs font-medium border border-blue-500/20"
                            >
                              {part}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 self-start sm:self-auto">
                      <button
                        onClick={() => togglePSStatus(ps._id, ps.isActive)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          ps.isActive ? "bg-green-600" : "bg-gray-600"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            ps.isActive ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-display text-lg text-white mb-3 line-clamp-2">
                    {ps.title}
                  </h3>

                  <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                    {ps.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400 text-sm">
                        Teams: {ps.teamCount}/{ps.maxTeams}
                      </span>
                      <span
                        className={`text-sm ${
                          ps.isActive ? "text-green-400" : "text-gray-500"
                        }`}
                      >
                        {ps.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {ps.link && (
                      <a
                        href={ps.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-heading hover:text-subheading transition-colors"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
        </div>

        {filteredPS.length === 0 && !loading && (
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-gray-400 text-lg">No problem statements found</p>
            <p className="text-gray-500 text-sm mt-2">
              Try adjusting your filters or upload some problem statements
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
