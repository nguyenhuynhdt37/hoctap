"use client";

import { useCallback, useEffect, useState } from "react";
import { HiX } from "react-icons/hi";
import dynamic from "next/dynamic";

const ChatSql = dynamic(() => import("./index"), {
  loading: () => (
    <div role="status" className="flex h-full items-center justify-center rounded-2xl bg-surface text-sm text-muted-foreground">
      Đang mở trợ lý…
    </div>
  ),
});

export default function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

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
      <button
        type="button"
        onClick={toggle}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg border transition-all duration-300 flex items-center justify-center cursor-pointer ${
          isOpen
            ? "bg-surface border-border text-foreground hover:bg-primary-light"
            : "bg-primary border-primary-pastel text-primary-foreground hover:bg-primary-hover hover:scale-105 ring-4 ring-primary-light/80"
        }`}
        aria-label={isOpen ? "Đóng Mây Mây AI" : "Mở trợ lý Mây Mây AI"}
      >
        {isOpen ? (
          <HiX className="w-6 h-6" />
        ) : (
          <img
            src="/logo/studynest-logo-white-64.svg"
            alt="Mây Mây AI"
            className="w-7 h-7 object-contain"
          />
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-foreground/20 backdrop-blur-2xs z-40 md:hidden"
            onClick={toggle}
          />
          <div className="fixed bottom-24 right-6 z-50 w-[calc(100vw-48px)] max-w-md h-[500px] md:h-[580px] animate-in slide-in-from-bottom-4 fade-in duration-200">
            <ChatSql />
          </div>
        </>
      )}
    </>
  );
}
