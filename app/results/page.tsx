"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Trophy, Star, CheckCircle, Search } from "lucide-react";

interface SelectedTeam {
  _id: string;
  teamName: string;
  status: string;
  registrationDate: string;
  memberCount: number;
  leader: {
    name: string;
    email: string;
  };
  problemStatement: {
    psNumber: string;
    title: string;
    description?: string;
    domain?: string;
  };
}

interface ResultsData {
  teams: SelectedTeam[];
  selectedTeams: SelectedTeam[];
  waitlistedTeams: SelectedTeam[];
  statistics: {
    totalSelectedTeams: number;
    totalWaitlistedTeams: number;
    totalTeams: number;
    uniqueProblemStatements: number;
  };
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// TeamCard Component
function TeamCard({
  team,
  index,
  isWaitlisted = false,
}: {
  team: SelectedTeam;
  index: number;
  isWaitlisted?: boolean;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className={`bg-gradient-to-r ${
        isWaitlisted
          ? "from-yellow-900/20 to-yellow-800/10 border-yellow-700/30 hover:border-yellow-500/30"
          : "from-gray-900/30 to-gray-800/20 border-gray-700/30 hover:border-heading/30"
      } border rounded-xl p-6 transition-all duration-300 hover:bg-gray-800/40`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`${
              isWaitlisted ? "bg-yellow-500/20" : "bg-heading/20"
            } p-2 rounded-lg min-w-[40px] h-[40px] flex items-center justify-center`}
          >
            <span
              className={`${
                isWaitlisted ? "text-yellow-400" : "text-heading"
              } font-medium text-lg`}
            >
              {index + 1}
            </span>
          </div>
          <div>
            <h3 className="font-display text-xl text-white font-light">
              {team.teamName}
            </h3>
            <p className="text-gray-400 text-sm">Leader: {team.leader.name}</p>
          </div>
        </div>
        <div
          className={`bg-gradient-to-r ${
            isWaitlisted
              ? "from-yellow-500/20 to-yellow-400/10 border-yellow-500/30"
              : "from-blue-500/20 to-blue-400/10 border-blue-500/30"
          } border rounded-lg px-3 py-1`}
        >
          <span
            className={`${
              isWaitlisted ? "text-yellow-400" : "text-blue-400"
            } font-medium text-sm`}
          >
            PS{" "}
            {(() => {
              const psNumbers = team.problemStatement.psNumber.split("/");
              if (psNumbers.length <= 3) {
                return psNumbers.join("/");
              }
              return psNumbers.slice(0, 3).join("/") + "/...";
            })()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function ResultsPage() {
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await fetch("/sih/api/results");
        if (response.ok) {
          const results = await response.json();
          setData(results);
        }
      } catch (error) {
        console.error("Error fetching results:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  // Filter teams based on search
  const filteredSelectedTeams =
    data?.selectedTeams.filter((team) => {
      const matchesSearch =
        searchTerm === "" ||
        team.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.leader.name.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    }) || [];

  const filteredWaitlistedTeams =
    data?.waitlistedTeams.filter((team) => {
      const matchesSearch =
        searchTerm === "" ||
        team.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.leader.name.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    }) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-heading mx-auto mb-4"></div>
            <p className="text-text font-body text-lg">Loading results...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-background to-gray-900/50">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <Trophy className="w-12 h-12 text-heading" />
              <h1 className="font-display text-5xl md:text-7xl font-light text-heading tracking-tight">
                Results
              </h1>
            </div>
            <p className="font-body text-xl text-subheading max-w-3xl mx-auto leading-relaxed">
              Celebrating the exceptional teams selected in Smart India
              Hackathon 2026
            </p>
          </motion.div>

          {/* Statistics */}
          {data && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-5xl mx-auto"
            >
              <motion.div
                className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-3xl p-10 hover:border-green-500/30 transition-all duration-500 hover:scale-105"
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="flex items-center justify-center mb-6">
                  <div className="bg-green-500/20 p-4 rounded-2xl">
                    <CheckCircle className="w-10 h-10 text-green-400" />
                  </div>
                </div>
                <div className="text-4xl font-display text-green-400 mb-3 font-light">
                  {data.statistics.totalSelectedTeams}
                </div>
                <div className="text-gray-300 font-body text-lg">
                  Selected Teams
                </div>
                <div className="text-green-400/60 font-body text-sm mt-2">
                  🎉 Congratulations!
                </div>
              </motion.div>

              <motion.div
                className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 rounded-3xl p-10 hover:border-yellow-500/30 transition-all duration-500 hover:scale-105"
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="flex items-center justify-center mb-6">
                  <div className="bg-yellow-500/20 p-4 rounded-2xl">
                    <Star className="w-10 h-10 text-yellow-400" />
                  </div>
                </div>
                <div className="text-4xl font-display text-yellow-400 mb-3 font-light">
                  {data.statistics.totalWaitlistedTeams}
                </div>
                <div className="text-gray-300 font-body text-lg">
                  Waitlisted Teams
                </div>
              </motion.div>

              <motion.div
                className="bg-gradient-to-br from-heading/10 to-heading/5 border border-heading/20 rounded-3xl p-10 hover:border-heading/30 transition-all duration-500 hover:scale-105"
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="flex items-center justify-center mb-6">
                  <div className="bg-heading/20 p-4 rounded-2xl">
                    <Trophy className="w-10 h-10 text-heading" />
                  </div>
                </div>
                <div className="text-4xl font-display text-heading mb-3 font-light">
                  {data.statistics.uniqueProblemStatements}
                </div>
                <div className="text-gray-300 font-body text-lg">
                  Problem Statements
                </div>
                <div className="text-heading/60 font-body text-sm mt-2">
                  💡 Diverse domains
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Search */}
      {data && (
        <section className="py-8 px-6 border-b border-gray-800/50">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search teams or leaders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-900/50 border border-gray-700/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-heading/50 focus:border-heading/50 transition-all duration-300"
              />
            </div>
          </div>
        </section>
      )}

      {/* Selected Teams Section */}
      {data && filteredSelectedTeams.length > 0 && (
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-green-500/20 p-3 rounded-xl">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <div>
                  <h2 className="font-display text-3xl text-white font-light">
                    Selected Teams
                  </h2>
                  <p className="text-green-400/80 text-sm mt-1">
                    Congratulations to all selected teams! 🎉
                  </p>
                </div>
              </div>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                {filteredSelectedTeams.map((team, index) => (
                  <TeamCard
                    key={team._id}
                    team={team}
                    index={index}
                    isWaitlisted={false}
                  />
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Waitlisted Teams Section */}
      {data && filteredWaitlistedTeams.length > 0 && (
        <section className="py-16 px-6 border-t border-gray-800/50">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-yellow-500/20 p-3 rounded-xl">
                  <Star className="w-8 h-8 text-yellow-400" />
                </div>
                <div>
                  <h2 className="font-display text-3xl text-white font-light">
                    Waitlisted Teams
                  </h2>
                </div>
              </div>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                {filteredWaitlistedTeams.map((team, index) => (
                  <TeamCard
                    key={team._id}
                    team={team}
                    index={index}
                    isWaitlisted={true}
                  />
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}

      {/* No Results */}
      {data &&
        filteredSelectedTeams.length === 0 &&
        filteredWaitlistedTeams.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="bg-gray-900/30 border border-gray-700/50 rounded-3xl p-16 max-w-md mx-auto">
              <div className="text-8xl mb-6 opacity-50">🔍</div>
              <h3 className="text-3xl font-display text-heading mb-4 font-light">
                No Results Found
              </h3>
              <p className="text-gray-300 text-lg leading-relaxed">
                Try adjusting your search terms to find what you&apos;re looking
                for.
              </p>
              <button
                onClick={() => setSearchTerm("")}
                className="mt-6 px-6 py-3 bg-heading/20 hover:bg-heading/30 border border-heading/30 text-heading rounded-xl transition-all duration-300"
              >
                Clear Search
              </button>
            </div>
          </motion.div>
        )}
    </div>
  );
}

// function GroupedView({ filteredTeams }: { filteredTeams: SelectedTeam[] }) {
//   // Group filtered teams by PS number
//   const filteredByPS = filteredTeams.reduce((acc, team) => {
//     const psNumber = team.problemStatement.psNumber;
//     if (!acc[psNumber]) {
//       acc[psNumber] = {
//         problemStatement: team.problemStatement,
//         teams: [],
//       };
//     }
//     acc[psNumber].teams.push(team);
//     return acc;
//   }, {} as TeamsByPS);

//   return (
//     <motion.div
//       variants={containerVariants}
//       initial="hidden"
//       animate="visible"
//       className="space-y-12"
//     >
//       {Object.entries(filteredByPS).map(([psNumber, group]) => (
//         <motion.div
//           key={psNumber}
//           variants={itemVariants}
//           className="space-y-6"
//         >
//           {/* Problem Statement Header */}
//           <div className="bg-gradient-to-r from-gray-900/50 to-gray-800/30 border border-gray-700/50 rounded-3xl p-10 backdrop-blur-sm">
//             <div className="flex items-start gap-6">
//               <div className="bg-gradient-to-br from-heading/20 to-heading/10 p-4 rounded-2xl border border-heading/20">
//                 <TrendingUp className="w-8 h-8 text-heading" />
//               </div>
//               <div className="flex-1">
//                 <div className="flex items-center flex-wrap gap-3 mb-4">
//                   <span className="bg-gradient-to-r from-heading/20 to-heading/10 text-heading px-4 py-2 rounded-full text-sm font-medium border border-heading/20">
//                     PS {group.problemStatement.psNumber}
//                   </span>
//                   {group.problemStatement.domain && (
//                     <span className="bg-gradient-to-r from-subheading/20 to-subheading/10 text-subheading px-4 py-2 rounded-full text-sm font-medium border border-subheading/20">
//                       {group.problemStatement.domain}
//                     </span>
//                   )}
//                   <span className="bg-gradient-to-r from-green-500/20 to-green-400/10 text-green-400 px-4 py-2 rounded-full text-sm font-medium border border-green-500/20">
//                     {group.teams.length} Selected Team
//                     {group.teams.length !== 1 ? "s" : ""}
//                   </span>
//                 </div>
//                 <h3 className="text-3xl font-display text-white mb-4 font-light">
//                   {group.problemStatement.title}
//                 </h3>
//                 {/* {group.problemStatement.description && (
//                   <p className="text-gray-300 leading-relaxed text-lg">
//                     {group.problemStatement.description}
//                   </p>
//                 )} */}
//               </div>
//             </div>
//           </div>

//           {/* Teams for this PS */}
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//             {group.teams.map((team) => (
//               <TeamCard key={team._id} team={team} />
//             ))}
//           </div>
//         </motion.div>
//       ))}
//     </motion.div>
//   );
// }

// function GridView({ filteredTeams }: { filteredTeams: SelectedTeam[] }) {
//   return (
//     <motion.div
//       variants={containerVariants}
//       initial="hidden"
//       animate="visible"
//       className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
//     >
//       {filteredTeams.map((team) => (
//         <TeamCard key={team._id} team={team} />
//       ))}
//     </motion.div>
//   );
// }

// function TeamCard({ team }: { team: SelectedTeam }) {
//   return (
//     <motion.div
//       variants={itemVariants}
//       whileHover={{ y: -8, scale: 1.02 }}
//       transition={{ type: "spring", stiffness: 300, damping: 20 }}
//       className="group bg-gradient-to-br from-gray-900/40 to-gray-800/20 border border-gray-700/50 rounded-3xl p-8 hover:border-green-500/30 hover:from-green-500/5 hover:to-green-600/5 transition-all duration-500 backdrop-blur-sm"
//     >
//       {/* Header */}
//       <div className="flex items-start justify-between mb-6">
//         <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 p-3 rounded-2xl border border-green-500/20">
//           <Trophy className="w-6 h-6 text-green-400" />
//         </div>
//         <div className="flex flex-col gap-2 text-right">
//           <span className="bg-gradient-to-r from-green-500/20 to-green-400/20 text-green-400 px-3 py-1.5 rounded-full text-xs font-medium border border-green-500/20">
//             ✨ Selected
//           </span>
//           <span className="bg-gradient-to-r from-heading/20 to-heading/10 text-heading px-3 py-1.5 rounded-full text-xs font-medium border border-heading/20">
//             PS {team.problemStatement.psNumber}
//           </span>
//         </div>
//       </div>

//       {/* Team Name */}
//       <h3 className="font-display text-2xl text-white mb-3 group-hover:text-green-400 transition-colors duration-300 font-light">
//         {team.teamName}
//       </h3>

//       {/* Problem Statement */}
//       <p
//         className="text-gray-300 text-sm mb-6 leading-relaxed overflow-hidden"
//         style={{
//           display: "-webkit-box",
//           WebkitLineClamp: 2,
//           WebkitBoxOrient: "vertical",
//         }}
//       >
//         {team.problemStatement.title}
//       </p>

//       {/* Team Leader */}
//       <div className="flex items-center gap-4 mb-6 p-4 bg-gray-800/30 rounded-2xl border border-gray-700/30">
//         <div className="bg-gradient-to-br from-subheading/20 to-subheading/10 p-3 rounded-xl border border-subheading/20">
//           <Users className="w-5 h-5 text-subheading" />
//         </div>
//         <div className="flex-1">
//           <p className="text-white text-sm font-medium">{team.leader.name}</p>
//           <p className="text-gray-400 text-xs">Team Leader</p>
//         </div>
//       </div>

//       {/* Stats */}
//       <div className="flex items-center justify-between pt-4 border-t border-gray-700/30">
//         <div className="flex items-center gap-3 text-gray-300">
//           <div className="bg-blue-500/20 p-2 rounded-lg">
//             <Users className="w-4 h-4 text-blue-400" />
//           </div>
//           <div>
//             <p className="text-sm font-medium">
//               {team.memberCount + 1} Members
//             </p>
//             <p className="text-xs text-gray-500">Team Size</p>
//           </div>
//         </div>
//         <div className="flex items-center gap-3 text-gray-300">
//           <div className="bg-purple-500/20 p-2 rounded-lg">
//             <Calendar className="w-4 h-4 text-purple-400" />
//           </div>
//           <div className="text-right">
//             <p className="text-sm font-medium">
//               {new Date(team.registrationDate).toLocaleDateString()}
//             </p>
//             <p className="text-xs text-gray-500">Registered</p>
//           </div>
//         </div>
//       </div>

//       {/* Celebration Effect */}
//       <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-all duration-500 transform group-hover:scale-110">
//         <div className="bg-gradient-to-r from-green-400/20 to-yellow-400/20 p-2 rounded-full border border-green-400/30">
//           <div className="flex gap-1">
//             <Star className="w-4 h-4 text-green-400 animate-pulse" />
//             <Star
//               className="w-4 h-4 text-yellow-400 animate-pulse"
//               style={{ animationDelay: "0.2s" }}
//             />
//             <Star
//               className="w-4 h-4 text-heading animate-pulse"
//               style={{ animationDelay: "0.4s" }}
//             />
//           </div>
//         </div>
//       </div>
//     </motion.div>
//   );
// }
