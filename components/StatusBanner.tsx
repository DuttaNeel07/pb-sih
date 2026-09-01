'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';

export default function StatusBanner() {
  const { user, hasTeam, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return (
      <motion.div 
        className="bg-gradient-to-r from-heading/10 to-subheading/10 border border-heading/20 rounded-lg p-4 sm:p-6 mb-2 sm:mb-3 md:mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-heading font-semibold font-display text-base sm:text-lg mb-1">
              Get Started Today
            </h3>
            <p className="text-gray-400 font-body text-xs sm:text-sm">
              Sign up to register your team for Smart India Hackathon
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <Link href="/login">
              <motion.button 
                className="px-4 py-1.5 sm:px-6 sm:py-2 border border-heading text-heading rounded-full text-xs sm:text-sm font-medium hover:bg-heading hover:text-white transition-colors duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Login
              </motion.button>
            </Link>
            <Link href="/signup">
              <motion.button 
                className="px-4 py-1.5 sm:px-6 sm:py-2 bg-subheading text-gray-800 rounded-full text-xs sm:text-sm font-medium hover:bg-subheading/80 transition-colors duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Sign Up
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }

  if (hasTeam) {
    return (
      <motion.div 
        className="bg-gradient-to-r from-green-600/10 to-green-400/10 border border-green-500/20 rounded-lg p-4 sm:p-6 mb-2 sm:mb-3 md:mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-green-400 font-semibold font-display text-base sm:text-lg mb-1">
              Team Registered ✓
            </h3>
            <p className="text-gray-400 font-body text-xs sm:text-sm">
              Your team is successfully registered for the hackathon
            </p>
          </div>
          <Link href="/team-info">
            <motion.button 
              className="px-4 py-1.5 sm:px-6 sm:py-2 bg-green-500 text-white rounded-full text-xs sm:text-sm font-medium hover:bg-green-400 transition-colors duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              View Team Details
            </motion.button>
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="bg-gradient-to-r from-orange-600/10 to-orange-400/10 border border-orange-500/20 rounded-lg p-4 sm:p-6 mb-2 sm:mb-3 md:mb-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-orange-400 font-semibold font-display text-base sm:text-lg mb-1">
            Complete Your Registration
          </h3>
          <p className="text-gray-400 font-body text-xs sm:text-sm">
            You&apos;re logged in! Now register your team to participate
          </p>
        </div>
        <Link href="/registration">
          <motion.button 
            className="px-4 py-1.5 sm:px-6 sm:py-2 bg-orange-500 text-white rounded-full text-xs sm:text-sm font-medium hover:bg-orange-400 transition-colors duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Register Team
          </motion.button>
        </Link>
      </div>
    </motion.div>
  );
}
