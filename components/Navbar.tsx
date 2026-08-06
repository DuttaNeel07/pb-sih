"use client";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/context/AuthContext";
import { useState } from "react";

export default function Navbar() {
  const { user, signOut, loading, hasTeam } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  return (
    <>
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-gray-800/30"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Link
                href="/"
                className="flex shrink-0 items-center"
                aria-label="DSCE home"
              >
                <Image
                  src="/DSCElogo.svg"
                  alt="DSCE Logo"
                  width={66}
                  height={64}
                  priority
                  className="h-11 w-11 object-contain sm:h-12 sm:w-12 lg:h-14 lg:w-14"
                />
              </Link>
            </motion.div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              <motion.div
                whileHover={{ y: -1 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Link
                  href="/problem-statements"
                  className="text-gray-300 hover:text-subheading transition-colors duration-300 tracking-wide font-body text-sm"
                >
                  Problem Statements
                </Link>
              </motion.div>

              <motion.div
                whileHover={{ y: -1 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Link
                  href="/results"
                  className="text-gray-300 hover:text-green-400 transition-colors duration-300 tracking-wide font-body text-sm"
                >
                  Results
                </Link>
              </motion.div>

              <motion.div
                whileHover={{ y: -1 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Link
                  href={hasTeam ? "/team-info" : "/registration"}
                  className={`${
                    hasTeam
                      ? "text-gray-300 hover:text-subheading"
                      : "text-gray-300 hover:text-heading"
                  } transition-colors duration-300 tracking-wide font-body text-sm`}
                >
                  {hasTeam ? "Team Info" : "Registration"}
                </Link>
              </motion.div>

              {hasTeam && (
                <motion.div
                  whileHover={{ y: -1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Link
                    href="/team-tasks"
                    className="text-gray-300 hover:text-heading transition-colors duration-300 tracking-wide font-body text-sm"
                  >
                    My Tasks
                  </Link>
                </motion.div>
              )}

              {/* Desktop Auth Links */}
              {!loading && user && (
                <div className="relative group flex items-center">
                  <span className="text-gray-400 hover:text-gray-300 text-sm font-body cursor-pointer transition-colors duration-300 hidden lg:inline">
                    Welcome, {user.displayName || user.email}
                  </span>
                  <span className="text-gray-400 hover:text-gray-300 text-sm font-body cursor-pointer transition-colors duration-300 lg:hidden">
                    {user.displayName?.split(" ")[0] ||
                      user.email?.split("@")[0]}
                  </span>
                  <motion.button
                    onClick={() => signOut()}
                    whileHover={{ y: -1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className="ml-4 text-gray-300 hover:text-red-400 transition-all duration-300 tracking-wide font-body text-sm opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 whitespace-nowrap"
                  >
                    Sign Out
                  </motion.button>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Menu Button */}
            <motion.button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden relative z-50 p-2 text-gray-300 hover:text-white transition-colors duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-6 h-6 relative flex flex-col justify-center items-center">
                <motion.span
                  className="w-6 h-0.5 bg-current absolute"
                  animate={{
                    rotate: isMobileMenuOpen ? 45 : 0,
                    y: isMobileMenuOpen ? 0 : -6,
                  }}
                  transition={{ duration: 0.3 }}
                />
                <motion.span
                  className="w-6 h-0.5 bg-current absolute"
                  animate={{
                    opacity: isMobileMenuOpen ? 0 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                />
                <motion.span
                  className="w-6 h-0.5 bg-current absolute"
                  animate={{
                    rotate: isMobileMenuOpen ? -45 : 0,
                    y: isMobileMenuOpen ? 0 : 6,
                  }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Mobile Menu Content */}
            <motion.div
              className="absolute top-0 right-0 w-72 h-full bg-background/95 backdrop-blur-md border-l border-gray-800/30"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <div className="flex flex-col h-full pt-20 px-6">
                {/* Mobile Navigation Links */}
                <div className="flex flex-col space-y-6">
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                  >
                    <Link
                      href="/problem-statements"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block text-gray-300 hover:text-subheading transition-colors duration-300 tracking-wide font-body text-lg py-2"
                    >
                      Problem Statements
                    </Link>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15, duration: 0.4 }}
                  >
                    <Link
                      href="/results"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block text-gray-300 hover:text-green-400 transition-colors duration-300 tracking-wide font-body text-lg py-2"
                    >
                      Results
                    </Link>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                  >
                    <Link
                      href={hasTeam ? "/team-info" : "/registration"}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block ${
                        hasTeam
                          ? "text-gray-300 hover:text-subheading"
                          : "text-gray-300 hover:text-heading"
                      } transition-colors duration-300 tracking-wide font-body text-lg py-2`}
                    >
                      {hasTeam ? "Team Info" : "Registration"}
                    </Link>
                  </motion.div>

                  {hasTeam && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25, duration: 0.4 }}
                    >
                      <Link
                        href="/team-tasks"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block text-gray-300 hover:text-heading transition-colors duration-300 tracking-wide font-body text-lg py-2"
                      >
                        My Tasks
                      </Link>
                    </motion.div>
                  )}

                  {/* Mobile Auth Section */}
                  {!loading && user && (
                    <motion.div
                      className="border-t border-gray-800/30 pt-6 mt-6"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3, duration: 0.4 }}
                    >
                      <div className="flex flex-col space-y-4">
                        <span className="text-gray-400 text-sm font-body">
                          Welcome, {user.displayName || user.email}
                        </span>
                        <motion.button
                          onClick={() => {
                            signOut();
                            setIsMobileMenuOpen(false);
                          }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="self-start text-gray-300 hover:text-red-400 transition-colors duration-300 tracking-wide font-body text-lg py-2"
                        >
                          Sign Out
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
