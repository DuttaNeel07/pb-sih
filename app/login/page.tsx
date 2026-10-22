/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ValidatedInput from "@/components/ui/ValidatedInput";
import GoogleSignInButton from "@/components/ui/GoogleSignInButton";
import { useAuth } from "@/lib/context/AuthContext";

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  const { signIn, resetPassword, signInWithGoogle } = useAuth();
  const router = useRouter();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (error) setError(''); // Clear error when user types
    if (message) setMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await signIn(formData.email, formData.password);
      router.push('/'); // Redirect to home page after successful login
    } catch (error: any) {
      console.error('Login error:', error);
      setError(getErrorMessage(error.code));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      router.push('/');
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      // Only show error if it's not a popup closed error
      if (error?.code !== 'auth/popup-closed-by-user' && error?.code !== 'auth/cancelled-popup-request') {
        setError(getErrorMessage(error.code));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = formData.email.trim();
    setError('');
    setMessage('');

    if (!email) {
      setError('Enter your email address to receive a password reset link.');
      return;
    }

    setIsResetting(true);
    try {
      await resetPassword(email);
      setMessage('If an account exists for this email, check your inbox for the reset link. After setting your new password, return here to sign in.');
    } catch (error: any) {
      console.error('Password reset error:', error);
      if (error?.code === 'auth/user-not-found') {
        setMessage('If an account exists for this email, Firebase will send a password reset link.');
      } else if (error?.code === 'auth/invalid-email') {
        setError('Enter a valid email address.');
      } else if (error?.code === 'auth/too-many-requests') {
        setError('Too many reset attempts. Please try again later.');
      } else {
        setError('Could not send the reset link. Please try again.');
      }
    } finally {
      setIsResetting(false);
    }
  };

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-email':
        return 'Invalid email address format.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      default:
        return 'Login failed. Please check your credentials and try again.';
    }
  };

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
              Welcome Back
            </h1>
            <p className="text-gray-400 text-lg font-body">
              Sign in to access your account
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
              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  role="alert"
                  className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm font-body"
                >
                  {error}
                </motion.div>
              )}

              {message && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  role="status"
                  className="p-4 bg-green-900/20 border border-green-800 rounded-lg text-green-400 text-sm font-body"
                >
                  {message}
                </motion.div>
              )}

              {/* Email Field */}
              <ValidatedInput
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(value) => handleInputChange('email', value)}
                placeholder="Enter your email address"
                required
                validationType="email"
              />

              {/* Password Field */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <label htmlFor="login-password" className="text-subheading text-sm font-medium tracking-wide">
                    Password <span className="text-red-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isResetting}
                    className="text-sm font-medium text-subheading transition-colors hover:text-subheading/80 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isResetting ? 'Sending...' : 'Forgot password?'}
                  </button>
                </div>
                <input
                  id="login-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-heading focus:outline-none transition-colors duration-300 font-body"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                className={`w-full py-4 rounded-lg text-white font-medium tracking-wide font-body transition-all duration-300 ${
                  isLoading 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-heading hover:bg-heading/90 hover:shadow-lg hover:shadow-heading/20'
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
                  'Sign In'
                )}
              </motion.button>

              {/* Google Sign In */}
              <GoogleSignInButton
                onSignIn={handleGoogleSignIn}
                text="Sign in with Google"
                isLoading={isGoogleLoading}
              />

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-gray-900/30 text-gray-400 font-body">or</span>
                </div>
              </div>

              {/* Sign Up Link */}
              <div className="text-center">
                <p className="text-gray-400 font-body">
                  Don&apos;t have an account?{' '}
                  <Link 
                    href="/signup" 
                    className="text-subheading hover:text-subheading/80 transition-colors duration-300 font-medium"
                  >
                    Sign up here
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
              Secure login powered by Firebase Authentication
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
