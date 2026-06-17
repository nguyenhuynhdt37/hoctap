"use client";

import { useEffect, useState } from "react";
import { HiAcademicCap } from "react-icons/hi";

interface Particle {
  left: number;
  top: number;
  duration: number;
}

export default function Loading() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 8 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        duration: 3 + Math.random() * 2,
      }))
    );
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      {/* Background animated circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-96 h-96 bg-green-200/20 rounded-full blur-3xl animate-pulse-slow"
          style={{
            top: "20%",
            left: "15%",
            animationDelay: "0s",
          }}
        />
        <div
          className="absolute w-80 h-80 bg-emerald-200/20 rounded-full blur-3xl animate-pulse-slow"
          style={{
            bottom: "20%",
            right: "15%",
            animationDelay: "1s",
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative flex flex-col items-center gap-8">
        {/* Logo Container with Multiple Animations */}
        <div className="relative">
          {/* Outer rotating ring */}
          <div className="absolute inset-0 w-32 h-32 rounded-full border-4 border-transparent border-t-green-400 border-r-emerald-400 animate-spin" />

          {/* Middle pulsing ring */}
          <div className="absolute inset-2 w-28 h-28 rounded-full bg-gradient-to-br from-green-400/20 to-emerald-400/20 animate-ping" />

          {/* Inner glowing circle */}
          <div className="absolute inset-4 w-24 h-24 rounded-full bg-gradient-to-br from-green-500/30 to-emerald-500/30 blur-xl animate-pulse" />

          {/* Main Logo */}
          <div className="relative w-32 h-32 flex items-center justify-center">
            <div className="relative group">
              {/* Logo background with gradient */}
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-green-500/50 transform transition-transform duration-500 animate-bounce-slow">
                <HiAcademicCap className="text-white text-5xl animate-wiggle" />
              </div>

              {/* Glowing effect */}
              <div className="absolute inset-0 w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl blur-lg opacity-60 animate-pulse" />
            </div>
          </div>
        </div>

        {/* StudyNest Text */}
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent animate-fade-in">
            StudyNest
          </h1>

          {/* Loading dots animation */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium text-gray-600">Đang tải</span>
            <div className="flex gap-1">
              <span
                className="w-2 h-2 bg-green-500 rounded-full animate-bounce-dot"
                style={{ animationDelay: "0s" }}
              />
              <span
                className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce-dot"
                style={{ animationDelay: "0.2s" }}
              />
              <span
                className="w-2 h-2 bg-teal-500 rounded-full animate-bounce-dot"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
          <div className="h-full bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 rounded-full animate-progress-bar" />
        </div>

        {/* Optional message */}
        <p
          className="text-sm text-gray-500 animate-fade-in"
          style={{ animationDelay: "0.5s" }}
        >
          Đang chuẩn bị nội dung cho bạn...
        </p>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-green-400 rounded-full opacity-40 animate-float-particle"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${particle.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes bounce-slow {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-10px) scale(1.05);
          }
        }

        @keyframes bounce-dot {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes wiggle {
          0%,
          100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-5deg);
          }
          75% {
            transform: rotate(5deg);
          }
        }

        @keyframes progress-bar {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.1);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes float-particle {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0;
          }
          50% {
            opacity: 0.6;
            transform: translateY(-100px) translateX(20px) scale(1.5);
          }
          100% {
            opacity: 0;
            transform: translateY(-200px) translateX(0) scale(1);
          }
        }

        .animate-spin {
          animation: spin 2s linear infinite;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        .animate-bounce-dot {
          animation: bounce-dot 1s ease-in-out infinite;
        }

        .animate-wiggle {
          animation: wiggle 2s ease-in-out infinite;
        }

        .animate-progress-bar {
          animation: progress-bar 1.5s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }

        .animate-fade-in {
          animation: fade-in 1s ease-out forwards;
        }

        .animate-float-particle {
          animation: float-particle 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
