"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";

interface WithdrawButtonProps {
  teamName: string;
  onWithdrawSuccess?: () => void;
}

export default function WithdrawButton({ teamName, onWithdrawSuccess }: WithdrawButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleWithdraw = async () => {
    if (!user) return;

    setIsWithdrawing(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/sih/api/team/withdraw", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        posthog.capture("team_withdrawn");
        alert(`Team withdrawal successful! ${data.message}`);
        
        // Call success callback if provided
        if (onWithdrawSuccess) {
          onWithdrawSuccess();
        }
        
        // Redirect to home page after successful withdrawal
        router.push("/");
      } else {
        const errorData = await response.json();
        alert(`Failed to withdraw team: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error withdrawing team:", error);
      alert("Failed to withdraw team. Please try again.");
    } finally {
      setIsWithdrawing(false);
      setShowConfirmDialog(false);
    }
  };

  return (
    <>
      {/* Withdraw Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="text-center"
      >
        <button
          onClick={() => setShowConfirmDialog(true)}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 mx-auto"
        >
          <Trash2 className="w-4 h-4" />
          Withdraw Team
        </button>
        <p className="text-gray-400 text-sm mt-2">
          Permanently remove your team from the competition
        </p>
      </motion.div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>

              <h3 className="text-xl font-display text-white mb-2">
                Withdraw Team
              </h3>
              <p className="text-gray-400 mb-6">
                Are you sure you want to withdraw your team &quot;{teamName}&quot; from the competition?
              </p>

              <div className="text-left bg-gray-800/50 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-300 font-medium mb-3">⚠️ This action will:</p>
                <ul className="text-sm text-gray-300 space-y-2">
                  <li>• Permanently delete your team registration</li>
                  <li>• Remove your account from the system</li>
                  <li>• Free up the problem statement slot for others</li>
                  <li>• Archive your team data for record-keeping</li>
                  <li>• Require creating a new account to participate again</li>
                </ul>
              </div>

              <p className="text-red-400 text-sm mb-6 font-medium">
                This action cannot be undone!
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={isWithdrawing}
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={isWithdrawing}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isWithdrawing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Withdrawing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Confirm Withdrawal
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
