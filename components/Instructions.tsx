'use client';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function Instructions() {
  return (
    <section id="instructions" className="py-24 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <motion.h2
            className="font-display text-4xl md:text-6xl font-light mb-6 tracking-tight leading-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="text-heading">Please Read</span>
            <br />
            <span className="text-subheading">Instructions</span>
          </motion.h2>
          <motion.p
            className="font-body text-lg text-gray-400 max-w-3xl mx-auto font-light leading-relaxed tracking-wide"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Before registering, please think rationally and ensure your team adheres to the following rules.
          </motion.p>
        </motion.div>

        {/* Instructions Card */}
        <motion.div
          className="mx-auto max-w-3xl"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div
            className="bg-gray-900/30 border border-gray-800 rounded-2xl p-8 md:p-10 hover:border-heading/30 transition-all duration-500"
            variants={itemVariants}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <ul className="space-y-5 text-gray-300">
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-subheading/60 rounded-full mt-2"></div>
                <span className="font-body tracking-wide">The number of teams reserved for a specific problem statement is 3. We encourage registering on the platform as soon as possible.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-subheading/60 rounded-full mt-2"></div>
                <span className="font-body tracking-wide">Each team must be exactly 6 members, including atleast 1 female.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-subheading/60 rounded-full mt-2"></div>
                <span className="font-body tracking-wide">Students can be from different branches or years but must be from DSCE.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-subheading/60 rounded-full mt-2"></div>
                <span className="font-body tracking-wide">Each team is allowed to register only once, multiple registrations are not allowed.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-subheading/60 rounded-full mt-2"></div>
                <span className="font-body tracking-wide">Only the team leader has to fill the form.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-subheading/60 rounded-full mt-2"></div>
                <span className="font-body tracking-wide">If a team works on a problem different from the one they picked, they'll be disqualified.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-subheading/60 rounded-full mt-2"></div>
                <span className="font-body tracking-wide">The internal round will be conducted entirely online. All teams must participate remotely.</span>
              </li>
            </ul>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}


