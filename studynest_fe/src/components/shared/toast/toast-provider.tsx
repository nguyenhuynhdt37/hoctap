"use client";

import { Toaster } from "react-hot-toast";

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "#fff",
          color: "#1f2937",
          borderRadius: "0.75rem",
          padding: "1rem",
          boxShadow:
            "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
          border: "1px solid #e5e7eb",
          maxWidth: "400px",
          fontSize: "0.875rem",
        },
        success: {
          iconTheme: {
            primary: "#00bba7",
            secondary: "#fff",
          },
          style: {
            borderLeft: "4px solid #00bba7",
          },
        },
        error: {
          iconTheme: {
            primary: "#ef4444",
            secondary: "#fff",
          },
          style: {
            borderLeft: "4px solid #ef4444",
          },
        },
        loading: {
          iconTheme: {
            primary: "#00bba7",
            secondary: "#fff",
          },
          style: {
            borderLeft: "4px solid #00bba7",
          },
        },
      }}
    />
  );
}
