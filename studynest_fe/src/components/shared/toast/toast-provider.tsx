"use client";

import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";

export function ToastProvider() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Tránh render container toast trong SSR HTML để không bị browser extension chèn attribute gây Hydration Mismatch
  if (!mounted) {
    return null;
  }

  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "var(--color-surface)",
          color: "var(--color-foreground)",
          borderRadius: "1rem",
          padding: "0.875rem 1rem",
          boxShadow: "var(--shadow-ambient-md)",
          border: "1px solid var(--color-border)",
          maxWidth: "400px",
          fontSize: "0.875rem",
        },
        success: {
          iconTheme: {
            primary: "var(--color-success-foreground)",
            secondary: "var(--color-success-bg)",
          },
          style: {
            borderLeft: "4px solid var(--color-success-foreground)",
          },
        },
        error: {
          iconTheme: {
            primary: "var(--color-destructive-foreground)",
            secondary: "var(--color-destructive-bg)",
          },
          style: {
            borderLeft: "4px solid var(--color-destructive-foreground)",
          },
        },
        loading: {
          iconTheme: {
            primary: "var(--color-primary)",
            secondary: "var(--color-primary-light)",
          },
          style: {
            borderLeft: "4px solid var(--color-primary)",
          },
        },
      }}
    />
  );
}
