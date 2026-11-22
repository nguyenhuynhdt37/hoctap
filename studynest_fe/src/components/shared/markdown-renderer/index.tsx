"use client";

import "highlight.js/styles/github-dark.css";
import { useEffect, useMemo, useRef } from "react";
import "./markdown.css";
import { renderLearningContent } from "./safe-html";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  /**
   * Nếu true, content được coi là HTML sẵn, không parse markdown
   * Mặc định: false (parse markdown)
   */
  isHtml?: boolean;
}

export default function MarkdownRenderer({
  content,
  className = "",
  isHtml = false,
}: MarkdownRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse markdown sang HTML hoặc sử dụng HTML trực tiếp
  // Dùng useMemo để tránh parse lại khi không cần thiết
  const htmlContent = useMemo(() => renderLearningContent(content, isHtml), [content, isHtml]);

  useEffect(() => {
    // Highlight code blocks sau khi render
    const highlightCodeBlocks = async () => {
      if (!containerRef.current || !htmlContent) return;

      const codeBlocks = containerRef.current.querySelectorAll("pre code");
      if (codeBlocks.length === 0) return;

      try {
        // Dynamic import highlight.js nếu chưa có
        if (typeof window !== "undefined" && !(window as any).hljs) {
          const hljs = (await import("highlight.js")).default;
          codeBlocks.forEach((block) => {
            try {
              hljs.highlightElement(block as HTMLElement);
            } catch (e) {
              console.warn("Error highlighting code block:", e);
            }
          });
        } else if ((window as any).hljs) {
          codeBlocks.forEach((block) => {
            try {
              (window as any).hljs.highlightElement(block);
            } catch (e) {
              console.warn("Error highlighting code block:", e);
            }
          });
        }
      } catch (error) {
        console.warn("Error loading highlight.js:", error);
      }
    };

    // Delay một chút để đảm bảo DOM đã render hoàn toàn
    const timer = setTimeout(() => {
      highlightCodeBlocks();
    }, 150);

    return () => clearTimeout(timer);
  }, [htmlContent]);

  // Empty content
  if (!content || !content.trim() || !htmlContent) {
    return (
      <div
        className={`tiptap-editor-content markdown-content ${className}`}
        style={{ minHeight: "auto", height: "auto" }}
      >
        <p className="text-subtle-foreground italic">Không có nội dung</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`tiptap-editor-content markdown-content prose prose-sm max-w-none ${className}`}
      style={{ minHeight: "auto", height: "auto" }}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
