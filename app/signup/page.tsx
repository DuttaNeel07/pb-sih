'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ValidatedInput from '@/components/ui/ValidatedInput';
import GoogleSignInButton from '@/components/ui/GoogleSignInButton';
import { useAuth } from '@/lib/context/AuthContext';
import posthog from 'posthog-js';
import { formatSignupEndAt, isSignupClosed } from '@/lib/signup';

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [signupClosed, setSignupClosed] = useState(() => isSignupClosed());
  
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const updateSignupStatus = async () => {
      setSignupClosed(isSignupClosed());
      try {
        const response = await fetch('/sih/api/auth/signup-status', {
          cache: 'no-store',
        });
        if (response.ok) {
          const data = await response.json();
          setSignupClosed(!data.signupOpen);
        }
      } catch {
        // Use the local deadline if the server-status request is unavailable.
      }
    };

    updateSignupStatus();
    const interval = window.setInterval(updateSignupStatus, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (error) setError(''); // Clear error when user types
    
    // Real-time password validation
    if (field === 'confirmPassword' || field === 'password') {
      const password = field === 'password' ? value : formData.password;
      const confirmPassword = field === 'confirmPassword' ? value : formData.confirmPassword;
      
      if (confirmPassword && password !== confirmPassword) {
        setPasswordError('Passwords do not match');
      } else {
        setPasswordError('');
      }
    }
  };

  const validateForm = () => {
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (signupClosed) {
      setError(`Signup closed at ${formatSignupEndAt()}.`);
      return;
    }
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setError('');

    try {
      await signUp(formData.email, formData.password, formData.name);
      posthog.capture('user_signup_completed', { authentication_method: 'email_password' });
      router.push('/'); // Redirect to home page after successful signup
    } catch (error: unknown) {
      console.error('Signup error:', error);
      setError(getErrorMessage(getErrorCode(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (signupClosed) {
      setError(`Signup closed at ${formatSignupEndAt()}.`);
      return;
    }

    setError('');
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      posthog.capture('user_signup_completed', { authentication_method: 'google' });
      router.push('/');
    } catch (error: unknown) {
      console.error('Google sign-in error:', error);
      // Only show error if it's not a popup closed error
      const errorCode = getErrorCode(error);
      if (errorCode !== 'auth/popup-closed-by-user' && errorCode !== 'auth/cancelled-popup-request') {
        setError(getErrorMessage(errorCode));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Please try logging in.';
      case 'auth/invalid-email':
        return 'Invalid email address format.';
      case 'auth/weak-password':
        return 'Password is too weak. Please choose a stronger password.';
      case 'auth/operation-not-allowed':
        return 'Email/password accounts are not enabled. Please contact support.';
      case 'SIGNUP_CLOSED':
        return `Signup closed at ${formatSignupEndAt()}.`;
      default:
        return 'Signup failed. Please try again.';
    }
  };

  const getErrorCode = (error: unknown): string => {
    return error && typeof error === 'object' && 'code' in error &&
      typeof error.code === 'string'
      ? error.code
      : '';
  };

  if (signupClosed) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-md px-6 pb-12 pt-32 text-center">
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-8">
            <p className="text-sm uppercase tracking-[0.3em] text-red-300">
              Signup closed
            </p>
            <h1 className="mt-4 font-display text-4xl font-light text-heading">
              New account creation is no longer available
            </h1>
            <p className="mt-4 text-gray-300">
              Signup closed at {formatSignupEndAt()}.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block text-subheading hover:text-subheading/80"
            >
              Sign in to an existing account
            </Link>
          </div>
        </main>
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
              Join Us
            </h1>
            <p className="text-gray-400 text-lg font-body">
              Create your account to get started
            </p>
          </motion.div>

          {/* Signup Form */}
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
                  className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm font-body"
                >
                  {error}
                </motion.div>
              )}

              {/* Name Field */}
              <ValidatedInput
                label="Full Name"
                type="text"
                value={formData.name}
                onChange={(value) => handleInputChange('name', value)}
                placeholder="Enter your full name"
                required
                validationType="name"
              />

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
                <label className="block text-subheading text-sm font-medium mb-2 tracking-wide">
                  Password <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-heading focus:outline-none transition-colors duration-300 font-body"
                  placeholder="Create a password (min 6 characters)"
                  required
                  minLength={6}
                />
                <p className="mt-2 text-xs text-gray-500 font-body">
                  Password must be at least 6 characters long
                </p>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-subheading text-sm font-medium mb-2 tracking-wide">
                  Confirm Password <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-800/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none transition-colors duration-300 font-body ${
                    passwordError 
                      ? 'border-red-500 focus:border-red-400' 
                      : 'border-gray-700 focus:border-heading'
                  }`}
                  placeholder="Confirm your password"
                  required
                  minLength={6}
                />
                {passwordError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 text-sm text-red-400 font-body"
                  >
                    {passwordError}
                  </motion.div>
                )}
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isLoading || !!passwordError}
                className={`w-full py-4 rounded-lg text-white font-medium tracking-wide font-body transition-all duration-300 ${
                  isLoading || passwordError
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-heading hover:bg-heading/90 hover:shadow-lg hover:shadow-heading/20'
                }`}
                whileHover={!isLoading && !passwordError ? { scale: 1.02 } : {}}
                whileTap={!isLoading && !passwordError ? { scale: 0.98 } : {}}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Creating account...
                  </div>
                ) : (
                  'Create Account'
                )}
              </motion.button>

              {/* Google Sign In */}
              <GoogleSignInButton
                onSignIn={handleGoogleSignIn}
                text="Sign up with Google"
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

              {/* Login Link */}
              <div className="text-center">
                <p className="text-gray-400 font-body">
                  Already have an account?{' '}
                  <Link 
                    href="/login" 
                    className="text-subheading hover:text-subheading/80 transition-colors duration-300 font-medium"
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
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
