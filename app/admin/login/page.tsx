"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ValidatedInput from "@/components/ui/ValidatedInput";
import { useAdminAuth } from "@/lib/context/AdminAuthContext";
import posthog from "posthog-js";

export default function AdminLogin() {
  const { signIn, loading: authLoading, admin } = useAdminAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitLoading, setSubmitLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (admin && !authLoading) {
      if (admin.role === "evaluator") {
        router.push("/admin/evaluator");
      } else {
        router.push("/admin");
      }
    }
  }, [admin, authLoading, router]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitLoading(true);
    try {
      await signIn(formData.email, formData.password);
      posthog.capture("admin_login_completed");
      // Redirect will be handled by useEffect when admin state updates
    } catch (error: unknown) {
      console.error("Admin login error:", error);

      const errorMessage = (error as Error).message || "Login failed";

      if (errorMessage.includes("email") || errorMessage.includes("password")) {
        setErrors({ password: "Invalid email or password" });
      } else {
        setErrors({ password: errorMessage });
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const isLoading = authLoading || submitLoading;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-24 pb-12 px-6">
        <div className="max-w-md mx-auto">
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-display text-4xl md:text-5xl font-light mb-4 text-heading tracking-tight">
              Admin Login
            </h1>
            <p className="text-gray-400 text-lg font-body">
              Access the administrative dashboard
            </p>
          </motion.div>

          {/* Login Form */}
          <motion.div
            className="bg-gray-900/30 border border-gray-800 rounded-2xl p-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <ValidatedInput
                label="Admin Email"
                type="email"
                value={formData.email}
                onChange={(value) => handleInputChange("email", value)}
                placeholder="Enter your admin email"
                required
                validationType="email"
                error={errors.email}
              />

              {/* Password Field */}
              <div>
                <label className="block text-subheading text-sm font-medium mb-2 tracking-wide">
                  Password <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  className={`w-full px-4 py-3 bg-gray-800/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none transition-colors duration-300 font-body ${
                    errors.password
                      ? "border-red-500 focus:border-red-400"
                      : "border-gray-700 focus:border-heading"
                  }`}
                  placeholder="Enter your password"
                  required
                />
                {errors.password && (
                  <p className="mt-2 text-sm text-red-400 font-body">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                className={`w-full py-4 rounded-lg text-white font-medium tracking-wide font-body transition-all duration-300 ${
                  isLoading
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-heading hover:bg-heading/90 hover:shadow-lg hover:shadow-heading/20"
                }`}
                whileHover={!isLoading ? { scale: 1.02 } : {}}
                whileTap={!isLoading ? { scale: 0.98 } : {}}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  "Sign In to Admin Panel"
                )}
              </motion.button>

              {/* Admin Info */}
              <div className="text-center">
                <p className="text-gray-400 font-body">
                  Need an admin account?{" "}
                  <Link
                    href="/admin/register"
                    className="text-heading hover:text-heading/80 transition-colors duration-200"
                  >
                    Register here
                  </Link>
                </p>
              </div>
            </form>
          </motion.div>

          {/* Additional Info */}
          <motion.div
            className="text-center mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <p className="text-gray-500 text-sm font-body">
              Secure admin authentication with JWT tokens
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
