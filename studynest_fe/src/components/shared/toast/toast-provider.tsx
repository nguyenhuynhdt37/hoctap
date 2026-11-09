"use client";

import { Toaster } from "react-hot-toast";

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "#FFFFFF",
          color: "#3D4A5A",
          borderRadius: "1rem",
          padding: "0.875rem 1rem",
          boxShadow:
            "0 12px 28px -6px rgba(53, 111, 167, 0.10), 0 4px 10px -2px rgba(61, 74, 90, 0.04)",
          border: "1px solid #E7EEF7",
          maxWidth: "400px",
          fontSize: "0.875rem",
        },
        success: {
          iconTheme: {
            primary: "#276749",
            secondary: "#E4F3E9",
          },
          style: {
            borderLeft: "4px solid #276749",
          },
        },
        error: {
          iconTheme: {
            primary: "#A23C46",
            secondary: "#FCE8E8",
          },
          style: {
            borderLeft: "4px solid #A23C46",
          },
        },
        loading: {
          iconTheme: {
            primary: "#356FA7",
            secondary: "#E8F2FA",
          },
          style: {
            borderLeft: "4px solid #356FA7",
          },
        },
      }}
    />
  );
}
