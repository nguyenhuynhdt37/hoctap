"use client";

import { uploadFile } from "@/lib/uploadFile";
import { useEffect, useRef, useState } from "react";
import {
  FaAlignCenter,
  FaAlignJustify,
  FaAlignLeft,
  FaAlignRight,
  FaBold,
  FaCode,
  FaImage,
  FaItalic,
  FaLink,
  FaListOl,
  FaListUl,
  FaQuoteLeft,
  FaSpinner,
  FaUnderline,
} from "react-icons/fa";
import "./editor.css";

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  uploadFolder?: string;
  uploadBucket?: string;
  onContentUpdate?: (updateMethod: (content: string) => void) => void;
}

export const RichTextEditor = ({
  value,
  onChange,
  placeholder,
  uploadFolder = "baiviet/content",
  uploadBucket = "clb-assets",
  onContentUpdate,
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (editorRef.current) {
          // Temporarily disable layout calculations
          const editor = editorRef.current;
          const originalOverflow = editor.style.overflow;
          const originalHeight = editor.style.height;

          // Set temporary styles to prevent layout issues
          editor.style.overflow = "hidden";
          editor.style.height = "auto";

          // Update content
          editor.innerHTML = value;

          // Force a reflow to ensure layout is calculated
          editor.offsetHeight;

          // Restore original styles
          editor.style.overflow = originalOverflow;
          editor.style.height = originalHeight;

          // Trigger onChange to ensure parent component is updated
          onChange(value);
        }
      });
    }
  }, [value, onChange]);

  // Expose safe update method to parent component
  useEffect(() => {
    if (onContentUpdate) {
      onContentUpdate(updateContentSafely);
    }
  }, [onContentUpdate]);

  // Add event listeners for toolbar state updates
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleSelectionChange = () => {
      updateToolbarStates();
    };

    const handleClick = () => {
      setTimeout(updateToolbarStates, 10);
    };

    const handleKeyUp = () => {
      setTimeout(updateToolbarStates, 10);
    };

    editor.addEventListener("click", handleClick);
    editor.addEventListener("keyup", handleKeyUp);
    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      editor.removeEventListener("click", handleClick);
      editor.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // Enhanced command execution with visual feedback
  const execCommandWithFeedback = (command: string, value?: string) => {
    document.execCommand(command, false, value);

    // Update toolbar button states
    updateToolbarStates();

    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const updateToolbarStates = () => {
    if (!editorRef.current) return;

    // Update button states based on current selection
    const buttons = document.querySelectorAll(".toolbar button");
    buttons.forEach((button) => {
      button.classList.remove("active");
    });

    // Check for active formatting
    if (document.queryCommandState("bold")) {
      const boldButton = document.querySelector('[title="In đậm"]');
      if (boldButton) boldButton.classList.add("active");
    }

    if (document.queryCommandState("italic")) {
      const italicButton = document.querySelector('[title="In nghiêng"]');
      if (italicButton) italicButton.classList.add("active");
    }

    if (document.queryCommandState("underline")) {
      const underlineButton = document.querySelector('[title="Gạch chân"]');
      if (underlineButton) underlineButton.classList.add("active");
    }

    // Check for active headings - Fixed logic
    const formatBlock = document.queryCommandValue("formatBlock");
    if (formatBlock) {
      // Check if it's a heading (h1, h2, h3)
      if (formatBlock === "h1") {
        const h1Button = document.querySelector('[title="Tiêu đề 1"]');
        if (h1Button) h1Button.classList.add("active");
      } else if (formatBlock === "h2") {
        const h2Button = document.querySelector('[title="Tiêu đề 2"]');
        if (h2Button) h2Button.classList.add("active");
      } else if (formatBlock === "h3") {
        const h3Button = document.querySelector('[title="Tiêu đề 3"]');
        if (h3Button) h3Button.classList.add("active");
      } else if (formatBlock === "blockquote") {
        const blockquoteButton = document.querySelector('[title="Trích dẫn"]');
        if (blockquoteButton) blockquoteButton.classList.add("active");
      }
    }

    // Check for active lists
    if (document.queryCommandState("insertUnorderedList")) {
      const ulButton = document.querySelector(
        '[title="Danh sách có dấu đầu dòng"]'
      );
      if (ulButton) ulButton.classList.add("active");
    }

    if (document.queryCommandState("insertOrderedList")) {
      const olButton = document.querySelector(
        '[title="Danh sách có số thứ tự"]'
      );
      if (olButton) olButton.classList.add("active");
    }

    // Check for active alignment - Fixed logic
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const parentElement = range.commonAncestorContainer as HTMLElement;
      const blockElement =
        parentElement.nodeType === Node.TEXT_NODE
          ? parentElement.parentElement
          : (parentElement as HTMLElement);

      if (blockElement) {
        const textAlign = window.getComputedStyle(blockElement).textAlign;

        if (textAlign === "left" || !textAlign || textAlign === "start") {
          const leftButton = document.querySelector('[title="Căn trái"]');
          if (leftButton) leftButton.classList.add("active");
        } else if (textAlign === "center") {
          const centerButton = document.querySelector('[title="Căn giữa"]');
          if (centerButton) centerButton.classList.add("active");
        } else if (textAlign === "right" || textAlign === "end") {
          const rightButton = document.querySelector('[title="Căn phải"]');
          if (rightButton) rightButton.classList.add("active");
        } else if (textAlign === "justify") {
          const justifyButton = document.querySelector('[title="Căn đều"]');
          if (justifyButton) justifyButton.classList.add("active");
        }
      }
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // Safe content update method for AI-generated content
  const updateContentSafely = (newContent: string) => {
    if (editorRef.current) {
      // Store current scroll position
      const scrollTop = editorRef.current.scrollTop;

      // Update content
      editorRef.current.innerHTML = newContent;

      // Restore scroll position
      editorRef.current.scrollTop = scrollTop;

      // Trigger onChange
      onChange(newContent);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    e.preventDefault();

    const items = e.clipboardData.items;
    let hasImage = false;
    let hasText = false;

    // Process all clipboard items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.type.indexOf("image") !== -1) {
        hasImage = true;
        const file = item.getAsFile();
        if (file) {
          console.log("Pasted image file:", file.name, file.type, file.size);
          await handleImageUpload(file);
        }
      } else if (item.type.indexOf("text") !== -1) {
        hasText = true;
        const text = await new Promise<string>((resolve) => {
          item.getAsString(resolve);
        });
        if (text.trim()) {
          document.execCommand("insertText", false, text);
        }
      }
    }

    // If no image and no text, try to get plain text
    if (!hasImage && !hasText) {
      const text = e.clipboardData.getData("text/plain");
      if (text.trim()) {
        document.execCommand("insertText", false, text);
      }
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Chỉ hỗ trợ file hình ảnh");
      return;
    }

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert("File quá lớn. Tối đa 50MB");
      return;
    }

    setUploading(true);
    try {
      console.log("Uploading image:", file.name, file.type, file.size);
      const url = await uploadFile(file, uploadFolder, uploadBucket);
      console.log("Upload successful:", url);

      // Create image element with better styling
      const img = document.createElement("img");
      img.src = url;
      img.alt = "Uploaded image";
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.style.borderRadius = "8px";
      img.style.margin = "1em 0";
      img.style.display = "block";
      img.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";

      // Insert at cursor position
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(img);

        // Add line break after image
        const br = document.createElement("br");
        range.setStartAfter(img);
        range.setEndAfter(img);
        range.insertNode(br);

        // Move cursor after image
        range.setStartAfter(br);
        range.setEndAfter(br);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        // Insert at end if no selection
        const br = document.createElement("br");
        editorRef.current?.appendChild(img);
        editorRef.current?.appendChild(br);
      }

      handleInput();
    } catch (error) {
      console.log("Error uploading image:", error);
      alert(
        "Lỗi khi upload hình ảnh: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setUploading(false);
    }
  };

  const insertImage = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleImageUpload(file);
      }
    };
    input.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        await handleImageUpload(file);
      }
    }
  };

  const insertLink = () => {
    const url = prompt("Nhập URL liên kết:");
    if (url) {
      execCommand("createLink", url);
    }
  };

  const formatHeading = (level: number) => {
    execCommand("formatBlock", `h${level}`);
  };

  const insertCodeBlock = () => {
    const language = prompt(
      "Nhập ngôn ngữ lập trình (tùy chọn):",
      "javascript"
    );
    const code = prompt("Nhập code:");

    if (code) {
      const codeBlock = document.createElement("pre");
      codeBlock.innerHTML = `<code class="language-${
        language || "text"
      }">${code}</code>`;

      // Insert at cursor position
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(codeBlock);

        // Add line break after code block
        const br = document.createElement("br");
        range.setStartAfter(codeBlock);
        range.setEndAfter(codeBlock);
        range.insertNode(br);

        // Move cursor after code block
        range.setStartAfter(br);
        range.setEndAfter(br);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        // Insert at end if no selection
        const br = document.createElement("br");
        editorRef.current?.appendChild(codeBlock);
        editorRef.current?.appendChild(br);
      }

      handleInput();
    }
  };

  return (
    <div className="rich-text-editor">
      {/* Toolbar */}
      <div className="toolbar">
        {/* Text Formatting */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => execCommandWithFeedback("bold")}
            className="p-2 text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title="In đậm"
          >
            <FaBold className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => execCommandWithFeedback("italic")}
            className="p-2 text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title="In nghiêng"
          >
            <FaItalic className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => execCommandWithFeedback("underline")}
            className="p-2 text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title="Gạch chân"
          >
            <FaUnderline className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-8 bg-gray-300 mx-1"></div>

        {/* Headings */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => formatHeading(1)}
            className="p-2 text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title="Tiêu đề 1"
          >
            H1
          </button>

          <button
            type="button"
            onClick={() => formatHeading(2)}
            className="p-2 text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title="Tiêu đề 2"
          >
            H2
          </button>

          <button
            type="button"
            onClick={() => formatHeading(3)}
            className="p-2 text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title="Tiêu đề 3"
          >
            H3
          </button>
        </div>

        <div className="w-px h-8 bg-gray-300 mx-1"></div>

        {/* Lists */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => execCommandWithFeedback("insertUnorderedList")}
            className="p-2 text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title="Danh sách có dấu đầu dòng"
          >
            <FaListUl className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => execCommandWithFeedback("insertOrderedList")}
            className="p-2 text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title="Danh sách có số thứ tự"
          >
            <FaListOl className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-8 bg-gray-300 mx-1"></div>

        {/* Alignment */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => execCommandWithFeedback("justifyLeft")}
            className="p-2 text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title="Căn trái"
          >
            <FaAlignLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => execCommandWithFeedback("justifyCenter")}
            className="p-2 text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title="Căn giữa"
          >
            <FaAlignCenter className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => execCommandWithFeedback("justifyRight")}
            className="p-2 text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title="Căn phải"
          >
            <FaAlignRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => execCommandWithFeedback("justifyFull")}
            className="p-2 text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title="Căn đều"
          >
            <FaAlignJustify className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-8 bg-gray-300 mx-1"></div>

        {/* Special Elements */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => execCommandWithFeedback("formatBlock", "blockquote")}
            className="p-2 text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title="Trích dẫn"
          >
            <FaQuoteLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={insertCodeBlock}
            className="p-2 text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title="Chèn code block"
          >
            <FaCode className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-8 bg-gray-300 mx-1"></div>

        {/* Media */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={insertLink}
            className="p-2 text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title="Chèn liên kết"
          >
            <FaLink className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={insertImage}
            disabled={uploading}
            className="p-2 text-gray-700 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
            title="Chèn hình ảnh"
          >
            {uploading ? (
              <FaSpinner className="w-4 h-4 animate-spin" />
            ) : (
              <FaImage className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`editor ${isFocused ? "ring-2 ring-green-500" : ""} ${
          dragOver ? "ring-2 ring-green-400 bg-green-50" : ""
        }`}
        data-placeholder={placeholder}
      />

      {/* Upload overlay */}
      {uploading && (
        <div className="upload-overlay">
          <div className="flex items-center">
            <FaSpinner className="w-8 h-8 text-green-500 animate-spin mr-2" />
            <p className="text-gray-700 font-semibold">Đang tải ảnh lên...</p>
          </div>
        </div>
      )}
    </div>
  );
};
