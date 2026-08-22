"use client";

import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      toastOptions={{
        duration: 5000,
        style: {
          background: "#111827",
          color: "#f9fafb",
          border: "1px solid #374151",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.35)",
          whiteSpace: "pre-line",
        },
      }}
    />
  );
}
