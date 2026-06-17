"use client";

import { useState, useCallback, useEffect } from "react";
import { HiSparkles, HiX } from "react-icons/hi";
import ChatSql from "./index";

export default function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  // Đóng khi nhấn Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [isOpen]);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={toggle}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg transition-all duration-300 ${
          isOpen
            ? "bg-gray-600 hover:bg-gray-700 rotate-0"
            : "bg-green-600 hover:bg-green-700 hover:scale-110"
        }`}
        aria-label={isOpen ? "Đóng chat" : "Mở trợ lý AI"}
      >
        {isOpen ? (
          <HiX className="w-6 h-6 text-white" />
        ) : (
          <HiSparkles className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={toggle}
          />

          {/* Chat Window */}
          <div className="fixed bottom-24 right-6 z-50 w-[calc(100vw-48px)] max-w-md h-[500px] md:h-[600px] animate-in slide-in-from-bottom-4 fade-in duration-200">
            <ChatSql />
          </div>
        </>
      )}
    </>
  );
}
