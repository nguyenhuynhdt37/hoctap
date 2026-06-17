"use client";

import "highlight.js/styles/github-dark.css";
import MarkdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import markdownItAttrs from "markdown-it-attrs";
import markdownItTaskLists from "markdown-it-task-lists";
import { useEffect, useMemo, useRef } from "react";

interface ChatMarkdownProps {
  content: string;
  className?: string;
}

// Parse markdown to HTML
const parseMarkdown = (markdown: string): string => {
  if (!markdown?.trim()) return "";
  if (markdown.trim().startsWith("<")) return markdown;

  const md = new MarkdownIt({
    html: true,
    linkify: true,
    breaks: true,
    typographer: false,
  })
    .use(markdownItTaskLists, { enabled: true, label: true })
    .use(markdownItAttrs)
    .use(markdownItAnchor, { permalink: false });

  // Override link renderer to open in new tab
  const defaultLinkRender =
    md.renderer.rules.link_open ||
    function (tokens, idx, options, _env, self) {
      return self.renderToken(tokens, idx, options);
    };

  md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
    tokens[idx].attrSet("target", "_blank");
    tokens[idx].attrSet("rel", "noopener noreferrer");
    return defaultLinkRender(tokens, idx, options, env, self);
  };

  return md.render(markdown);
};

export default function ChatMarkdown({
  content,
  className = "",
}: ChatMarkdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const htmlContent = useMemo(() => {
    if (!content?.trim()) return "";
    try {
      return parseMarkdown(content);
    } catch (error) {
      console.error("Error parsing markdown:", error);
      return content;
    }
  }, [content]);

  // Highlight code blocks
  useEffect(() => {
    const highlight = async () => {
      if (!containerRef.current || !htmlContent) return;

      const codeBlocks = containerRef.current.querySelectorAll("pre code");
      if (codeBlocks.length === 0) return;

      try {
        const hljs = (await import("highlight.js")).default;
        codeBlocks.forEach((block) => {
          try {
            hljs.highlightElement(block as HTMLElement);
          } catch {}
        });
      } catch {}
    };

    const timer = setTimeout(highlight, 100);
    return () => clearTimeout(timer);
  }, [htmlContent]);

  if (!content?.trim() || !htmlContent) {
    return null;
  }

  return (
    <>
      <style jsx global>{`
        /* Reset và override Tailwind cho chat markdown */
        .chat-md {
          font-size: 13px !important;
          line-height: 1.6 !important;
          color: #374151 !important;
          word-wrap: break-word !important;
        }

        /* Paragraphs */
        .chat-md p {
          margin: 0.5em 0 !important;
          display: block !important;
        }

        .chat-md p:first-child {
          margin-top: 0 !important;
        }

        .chat-md p:last-child {
          margin-bottom: 0 !important;
        }

        /* Headings */
        .chat-md h1,
        .chat-md h2,
        .chat-md h3,
        .chat-md h4,
        .chat-md h5,
        .chat-md h6 {
          font-weight: 600 !important;
          margin: 0.75em 0 0.5em !important;
          color: #111827 !important;
          display: block !important;
        }

        .chat-md h1 {
          font-size: 1.25em !important;
        }
        .chat-md h2 {
          font-size: 1.15em !important;
        }
        .chat-md h3 {
          font-size: 1.1em !important;
        }
        .chat-md h4 {
          font-size: 1em !important;
        }

        /* Lists - QUAN TRỌNG: override Tailwind reset */
        .chat-md ul {
          list-style-type: disc !important;
          margin: 0.5em 0 !important;
          padding-left: 1.5em !important;
          display: block !important;
        }

        .chat-md ol {
          list-style-type: decimal !important;
          margin: 0.5em 0 !important;
          padding-left: 1.5em !important;
          display: block !important;
        }

        .chat-md li {
          margin: 0.25em 0 !important;
          display: list-item !important;
          padding-left: 0.25em !important;
        }

        .chat-md ul > li {
          list-style-type: disc !important;
        }

        .chat-md ol > li {
          list-style-type: decimal !important;
        }

        .chat-md ul ul,
        .chat-md ol ul {
          list-style-type: circle !important;
        }

        .chat-md ul ul ul,
        .chat-md ol ul ul {
          list-style-type: square !important;
        }

        .chat-md li::marker {
          color: #6b7280 !important;
        }

        /* Inline code */
        .chat-md code {
          font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace !important;
          font-size: 0.9em !important;
          background: #f3f4f6 !important;
          padding: 0.15em 0.4em !important;
          border-radius: 4px !important;
          color: #dc2626 !important;
        }

        /* Code blocks */
        .chat-md pre {
          margin: 0.75em 0 !important;
          border-radius: 6px !important;
          overflow: hidden !important;
          display: block !important;
        }

        .chat-md pre code {
          display: block !important;
          padding: 0.75em 1em !important;
          background: #1f2937 !important;
          color: #e5e7eb !important;
          font-size: 12px !important;
          line-height: 1.5 !important;
          overflow-x: auto !important;
          border-radius: 0 !important;
        }

        /* Blockquotes */
        .chat-md blockquote {
          margin: 0.5em 0 !important;
          padding: 0.5em 1em !important;
          border-left: 3px solid #10b981 !important;
          background: #f0fdf4 !important;
          color: #166534 !important;
          display: block !important;
        }

        .chat-md blockquote p {
          margin: 0 !important;
        }

        /* Links */
        .chat-md a {
          color: #059669 !important;
          text-decoration: none !important;
        }

        .chat-md a:hover {
          text-decoration: underline !important;
        }

        /* Images */
        .chat-md img {
          max-width: 100% !important;
          height: auto !important;
          border-radius: 6px !important;
          margin: 0.5em 0 !important;
          display: block !important;
        }

        /* Tables */
        .chat-md table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin: 0.75em 0 !important;
          font-size: 12px !important;
          display: table !important;
        }

        .chat-md thead {
          display: table-header-group !important;
        }

        .chat-md tbody {
          display: table-row-group !important;
        }

        .chat-md tr {
          display: table-row !important;
        }

        .chat-md th,
        .chat-md td {
          border: 1px solid #e5e7eb !important;
          padding: 0.5em 0.75em !important;
          text-align: left !important;
          display: table-cell !important;
        }

        .chat-md th {
          background: #f9fafb !important;
          font-weight: 600 !important;
        }

        /* Horizontal rule */
        .chat-md hr {
          border: none !important;
          border-top: 1px solid #e5e7eb !important;
          margin: 1em 0 !important;
          display: block !important;
        }

        /* Text styles */
        .chat-md strong,
        .chat-md b {
          font-weight: 600 !important;
          color: #111827 !important;
        }

        .chat-md em,
        .chat-md i {
          font-style: italic !important;
        }

        .chat-md u {
          text-decoration: underline !important;
        }

        .chat-md s,
        .chat-md del {
          text-decoration: line-through !important;
        }

        /* Task lists */
        .chat-md .task-list-item {
          list-style: none !important;
          margin-left: -1.5em !important;
        }

        .chat-md .task-list-item input[type="checkbox"] {
          margin-right: 0.5em !important;
        }

        /* Definition lists */
        .chat-md dl {
          margin: 0.5em 0 !important;
          display: block !important;
        }

        .chat-md dt {
          font-weight: 600 !important;
          margin-top: 0.5em !important;
        }

        .chat-md dd {
          margin-left: 1em !important;
        }
      `}</style>

      <div
        ref={containerRef}
        className={`chat-md ${className}`}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </>
  );
}
