"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ValidatedInput from "@/components/ui/ValidatedInput";

export default function AdminRegister() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    secretKey: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.secretKey) {
      newErrors.secretKey = "Secret key is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch("/sih/api/admin/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          secretKey: formData.secretKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setSuccess(true);
      // Redirect to login after successful registration
      setTimeout(() => {
        router.push("/admin/login");
      }, 2000);
    } catch (error: unknown) {
      console.error("Admin registration error:", error);

      const errorMessage = (error as Error).message || "Registration failed";

      if (
        errorMessage.includes("secret key") ||
        errorMessage.includes("Invalid secret key")
      ) {
        setErrors({ secretKey: "Invalid secret key" });
      } else if (errorMessage.includes("email already exists")) {
        setErrors({ email: "Admin with this email already exists" });
      } else {
        setErrors({ secretKey: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-24 pb-12 px-6">
          <div className="max-w-md mx-auto">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-8">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h1 className="font-display text-2xl font-light mb-2 text-heading">
                  Registration Successful!
                </h1>
                <p className="text-gray-400 mb-4">
                  Your admin account has been created successfully.
                </p>
                <p className="text-sm text-gray-500">
                  Redirecting to login page...
                </p>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    );
  }

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
              Admin Registration
            </h1>
            <p className="text-gray-400 text-lg font-body">
              Role determined automatically by secret key
            </p>
          </motion.div>

          {/* Registration Form */}
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
                placeholder="Enter your email address"
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
                  placeholder="Enter your password (min 8 characters)"
                  required
                />
                {errors.password && (
                  <p className="mt-2 text-sm text-red-400 font-body">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-subheading text-sm font-medium mb-2 tracking-wide">
                  Confirm Password <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  className={`w-full px-4 py-3 bg-gray-800/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none transition-colors duration-300 font-body ${
                    errors.confirmPassword
                      ? "border-red-500 focus:border-red-400"
                      : "border-gray-700 focus:border-heading"
                  }`}
                  placeholder="Confirm your password"
                  required
                />
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-400 font-body">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Secret Key Field */}
              <div>
                <label className="block text-subheading text-sm font-medium mb-2 tracking-wide">
                  Secret Key <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={formData.secretKey}
                  onChange={(e) =>
                    handleInputChange("secretKey", e.target.value)
                  }
                  className={`w-full px-4 py-3 bg-gray-800/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none transition-colors duration-300 font-body ${
                    errors.secretKey
                      ? "border-red-500 focus:border-red-400"
                      : "border-gray-700 focus:border-heading"
                  }`}
                  placeholder="Enter the admin registration secret key"
                  required
                />
                {errors.secretKey && (
                  <p className="mt-2 text-sm text-red-400 font-body">
                    {errors.secretKey}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500 font-body">
                  Your role (Evaluator/Super Admin) will be determined
                  automatically by the secret key
                </p>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={loading}
                className={`w-full py-4 rounded-lg text-white font-medium tracking-wide font-body transition-all duration-300 ${
                  loading
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-heading hover:bg-heading/90 hover:shadow-lg hover:shadow-heading/20"
                }`}
                whileHover={!loading ? { scale: 1.02 } : {}}
                whileTap={!loading ? { scale: 0.98 } : {}}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Creating Account...
                  </div>
                ) : (
                  "Create Admin Account"
                )}
              </motion.button>

              {/* Login Link */}
              <div className="text-center">
                <p className="text-gray-400 font-body">
                  Already have an admin account?{" "}
                  <Link
                    href="/admin/login"
                    className="text-heading hover:text-heading/80 transition-colors duration-200"
                  >
                    Sign in here
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
              Secure admin registration with secret key validation
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
