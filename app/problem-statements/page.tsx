'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';

interface ProblemStatement {
  _id: string;
  psNumber: string;
  title: string;
  description: string;
  domain: string;
  link: string;
  availableSlots: number;
  maxTeams: number;
  isActive: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function ProblemStatements() {
  const [problemStatements, setProblemStatements] = useState<ProblemStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetched, setFetched] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<ProblemStatement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (problem: ProblemStatement) => {
    setSelectedProblem(problem);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedProblem(null);
    setIsModalOpen(false);
  };

  useEffect(() => {
    const fetchProblemStatements = async () => {
      if (fetched) return;
      
      try {
        const response = await fetch('/sih/api/problem-statements');
        if (response.ok) {
          const data = await response.json();
          setProblemStatements(data.problemStatements || []);
        } else {
          // Fallback to static data if API fails
          setProblemStatements([]);
        }
      } catch (error) {
        console.error('Error fetching problem statements:', error);
        setProblemStatements([]);
      } finally {
        setLoading(false);
        setFetched(true);
      }
    };

    fetchProblemStatements();
  }, [fetched]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-20 w-20 md:h-32 md:w-32 border-b-2 border-heading mx-auto mb-4"></div>
            <p className="text-text font-body">Loading problem statements...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <style jsx>{`
        .modal-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .modal-scroll::-webkit-scrollbar-track {
          background: #1F2937;
          border-radius: 4px;
        }
        .modal-scroll::-webkit-scrollbar-thumb {
          background: #4B5563;
          border-radius: 4px;
        }
        .modal-scroll::-webkit-scrollbar-thumb:hover {
          background: #6B7280;
        }
      `}</style>
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-24 md:pt-32 pb-16 md:pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center">
          <motion.h1 
            className="font-display text-4xl sm:text-5xl md:text-7xl font-light mb-6 md:mb-8 tracking-tight leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-heading">Problem</span>
            <br />
            <span className="text-subheading">Statements</span>
          </motion.h1>
          
          <motion.p 
            className="font-body text-base md:text-lg text-gray-400 max-w-3xl mx-auto font-light leading-relaxed tracking-wide px-1 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Choose from a diverse range of real-world challenges. Each problem statement represents an opportunity to create meaningful impact through innovation.
          </motion.p>
          
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <motion.a
              href="https://www.sih.gov.in/sih2026PS"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-heading/10 text-heading rounded-full text-sm font-medium border border-heading/20 hover:bg-heading hover:text-white transition-colors duration-300 tracking-wide"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              For more depth and FAQ, visit official Smart India Hackathon page
            </motion.a>
          </motion.div>
        </div>
      </section>

      {/* Problem Statements Grid */}
      <section className="pb-20 md:pb-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {problemStatements.length > 0 ? problemStatements.map((problem) => (
              <motion.div 
                key={problem._id}
                className="group bg-gray-900/30 border border-gray-800 rounded-2xl p-6 md:p-8 hover:border-heading/30 transition-all duration-500 flex flex-col h-full"
                variants={itemVariants}
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {/* Header with bubbles */}
                <div className="flex items-center gap-3 flex-wrap mb-6">
                  <span className="bg-heading/10 text-heading px-3 py-1 rounded-full text-sm font-medium border border-heading/20 tracking-wide">
                    {problem.domain}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {problem.psNumber.split('/').map((num, index) => (
                      <span key={index} className="bg-subheading/10 text-subheading px-2 py-1 rounded-full text-xs font-medium border border-subheading/20 tracking-wide">
                        {num}
                      </span>
                    ))}
                  </div>
                  {/* Available Slots */}
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border tracking-wide ${
                    problem.availableSlots === 0 
                      ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                      : problem.availableSlots <= problem.maxTeams * 0.2 
                        ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                        : 'bg-green-500/10 text-green-400 border-green-500/20'
                  }`}>
                    Available: {problem.availableSlots}/{problem.maxTeams}
                  </span>
                  {problem.link && (
                    <div className="flex flex-wrap gap-1">
                        <a href={problem.link} target="_blank" className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full text-xs font-medium border border-blue-500/20 tracking-wide">
                          {problem.link}
                        </a>
                    </div>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-display text-xl sm:text-2xl font-light text-white mb-6 group-hover:text-subheading transition-colors duration-300 tracking-wide break-words leading-tight flex-grow">
                  {problem.title}
                </h3>

                {/* Footer */}
                <div className="flex items-center justify-end pt-4 border-t border-gray-800 mt-auto">
                  <motion.button
                    onClick={() => openModal(problem)}
                    className="px-4 py-2 md:px-6 md:py-2 bg-heading/10 text-heading rounded-full text-xs md:text-sm font-medium border border-heading/20 hover:bg-heading hover:text-white transition-colors duration-300 tracking-wide"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    View Details
                  </motion.button>
                </div>
              </motion.div>
            )) : (
              <div className="col-span-1 lg:col-span-2 text-center py-12">
                <p className="font-body text-gray-400 text-sm md:text-base">No problem statements to show.</p>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && selectedProblem && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
              className="modal-scroll bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#4B5563 #1F2937'
              }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 md:p-8">
                {/* Modal Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="bg-heading/10 text-heading px-3 py-1 rounded-full text-sm font-medium border border-heading/20 tracking-wide">
                      {selectedProblem.domain}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {selectedProblem.psNumber.split('/').map((num, index) => (
                        <span key={index} className="bg-subheading/10 text-subheading px-2 py-1 rounded-full text-xs font-medium border border-subheading/20 tracking-wide">
                          {num}
                        </span>
                      ))}
                    </div>
                    {/* Available Slots in Modal */}
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border tracking-wide ${
                      selectedProblem.availableSlots === 0 
                        ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                        : selectedProblem.availableSlots <= selectedProblem.maxTeams * 0.2 
                          ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                          : 'bg-green-500/10 text-green-400 border-green-500/20'
                    }`}>
                      Available: {selectedProblem.availableSlots}/{selectedProblem.maxTeams}
                    </span>
                    {selectedProblem.link && (
                      <div className="flex flex-wrap gap-1">
                        {selectedProblem.link.split('/').map((part, index) => (
                          <span key={index} className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full text-xs font-medium border border-blue-500/20 tracking-wide">
                            {part}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <motion.button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-white transition-colors duration-200 p-2"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </div>

                {/* Modal Title */}
                <h2 className="font-display text-2xl sm:text-3xl font-light text-white mb-6 tracking-wide break-words leading-tight">
                  {selectedProblem.title}
                </h2>

                {/* Modal Description */}
                <div className="space-y-4">
                  <h3 className="font-display text-lg font-medium text-white mb-3 tracking-wide">
                    Description
                  </h3>
                  <div className="font-body text-gray-300 text-base leading-relaxed tracking-wide break-words whitespace-pre-line">
                    {selectedProblem.description}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end pt-6 mt-6 border-t border-gray-800">
                  <motion.button
                    onClick={closeModal}
                    className="px-6 py-2 bg-gray-700 text-white rounded-full text-sm font-medium hover:bg-gray-600 transition-colors duration-300 tracking-wide"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    Close
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

