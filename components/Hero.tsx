'use client';
// IMPORT THE REQUIRED HOOKS
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import StatusBanner from './StatusBanner';
import SubmissionDeadlineBanner from './SubmissionDeadlineBanner';
import { useState, useEffect } from 'react';

export default function Hero() {
  const { user, hasTeam } = useAuth();

  // NEW: Add state to track the arrow's visibility
  const [showArrow, setShowArrow] = useState(true);

  const getStartedLink = () => {
    if (!user) return '/login';
    if (hasTeam) return '/team-info';
    return '/registration';
  };

  const getStartedText = () => {
    if (!user) return 'Login to Start';
    if (hasTeam) return 'View Team Info';
    return 'Register Team';
  };

  // NEW: Add an effect to listen to the scroll event
  useEffect(() => {
    const handleScroll = () => {
      // Hide arrow if scrolled more than 100px, otherwise show it
      if (window.scrollY > 100) {
        setShowArrow(false);
      } else {
        setShowArrow(true);
      }
    };

    // Add the event listener when the component mounts
    window.addEventListener('scroll', handleScroll);

    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []); // Empty dependency array means this effect runs only once on mount

  return (
    <section className="relative min-h-screen flex bg-background overflow-hidden">
      {/* Animated background elements */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
      >
        <div className="absolute top-1/4 left-1/4 w-48 h-48 sm:w-72 sm:h-72 md:w-96 md:h-96 bg-heading/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 sm:w-72 sm:h-72 md:w-96 md:h-96 bg-subheading/5 rounded-full blur-3xl"></div>
      </motion.div>

      <div className="relative z-10 text-center px-4 sm:px-6 max-w-8xl m-auto py-20">
        {/* Logo */}
        <motion.div
          className="mb-6 sm:mb-8 flex justify-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          <div className="text-center">
            <div className="flex items-center justify-center gap-8 mb-3">
              <Image
                src="https://pointblank.club/_next/static/media/logo.0sigtz4rhlxj0.svg"
                alt="PointBlank Logo"
                width={120}
                height={60}
                className="w-48 h-10 sm:w-60 sm:h-12 md:w-72 md:h-16"
              />
            </div>
          </div>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          className="font-display text-[clamp(1.5rem,4vw,2rem)] sm:text-[clamp(2rem,5vw,3rem)] md:text-[clamp(2.5rem,6vw,4rem)] lg:text-[clamp(3rem,7vw,5rem)] xl:text-[clamp(4rem,8vw,6rem)] 2xl:text-[clamp(5rem,9vw,8rem)] font-light mb-6 sm:mb-8 leading-[0.9] tracking-tight"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <motion.span
            className="text-heading block font-light"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
          >
            Smart India Hackathon
          </motion.span>
          <motion.span
            className="text-subheading block font-light"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease: 'easeOut' }}
          >
            Internal Round
          </motion.span>
        </motion.h1>

        {/* Date */}
        <motion.div
          className="mb-6 sm:mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
        >
          <div className="relative inline-block group mt-3">
            <div className="absolute inset-0 bg-gradient-to-r from-heading/20 to-subheading/20 rounded-full blur-lg group-hover:blur-xl transition-all duration-300"></div>
            <div className="relative px-4 py-2 sm:px-6 sm:py-3 md:px-8 md:py-4 bg-gradient-to-r from-heading/5 via-background to-subheading/5 rounded-full border border-heading/30 backdrop-blur-sm shadow-lg group-hover:shadow-xl transition-all duration-300">
              <div className="absolute -top-1 -left-1 w-3 h-3 bg-heading/40 rounded-full animate-pulse"></div>
              <div
                className="absolute -bottom-1 -right-1 w-2 h-2 bg-subheading/40 rounded-full animate-pulse"
                style={{ animationDelay: '0.5s' }}
              ></div>
              <div className="flex items-center gap-2 sm:gap-3">
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 text-heading/60"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-lg sm:text-xl md:text-2xl font-semibold bg-gradient-to-r from-heading to-subheading bg-clip-text text-transparent tracking-wide">
                  5th September
                </span>
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 text-subheading/60"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="max-w-6xl mx-auto px-6 text-left mt-8 sm:mt-12"
        >
          <StatusBanner />
          <SubmissionDeadlineBanner />
        </motion.div>
      </div>

      {/* Floating elements */}
      <motion.div
        className="absolute top-16 sm:top-20 left-6 sm:left-10 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-heading rounded-full"
        animate={{ y: [0, -20, 0], opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-20 sm:bottom-32 right-8 sm:right-16 w-2 h-2 sm:w-3 sm:h-3 bg-subheading rounded-full"
        animate={{ y: [0, 15, 0], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      {/* NEW: Conditionally render the arrow based on the `showArrow` state */}
      {showArrow && (
        <Link
          href="#instructions"
          className="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 text-subheading px-2 sm:px-4 z-20"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-1 sm:gap-2"
          >
            <span className="text-xs sm:text-sm md:text-base text-center leading-tight">
              <span className="block sm:inline">please read instructions</span>
              <span className="block sm:inline sm:ml-1">before registering</span>
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 9l6 6 6-6"
              />
            </svg>
          </motion.div>
        </Link>
      )}
    </section>
  );
}
