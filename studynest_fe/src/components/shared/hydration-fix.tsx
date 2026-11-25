"use client";

import { useEffect } from "react";

const EXTENSION_ATTRS = ["bis_skin_checked", "bis_register"] as const;

/**
 * Dọn dẹp nhẹ một lần các attribute do browser extension chèn vào DOM sau khi mount.
 * Việc ngăn mismatch trước/trong lúc hydrate được xử lý bởi pre-hydration script ở RootLayout;
 * tránh giữ MutationObserver toàn DOM suốt phiên để không gây lag UI.
 */
export default function HydrationFix() {
  useEffect(() => {
    // Chống crash `NotFoundError: Failed to execute 'removeChild'/'insertBefore'` khi các extension
    // dịch trang / phụ đề (vd: Google Translate, Immersive Translate, Youdao) tự bọc Text Node trong DOM.
    if (typeof Node === "function" && Node.prototype) {
      const proto = Node.prototype as Node & {
        __snDomPatched?: boolean;
      };
      if (!proto.__snDomPatched) {
        proto.__snDomPatched = true;
        const originalRemoveChild = Node.prototype.removeChild;
        Node.prototype.removeChild = function <T extends Node>(child: T): T {
          if (child && child.parentNode !== this) {
            return child;
          }
          return originalRemoveChild.call(this, child) as T;
        };

        const originalInsertBefore = Node.prototype.insertBefore;
        Node.prototype.insertBefore = function <T extends Node>(
          newNode: T,
          referenceNode: Node | null,
        ): T {
          if (referenceNode && referenceNode.parentNode !== this) {
            return newNode;
          }
          return originalInsertBefore.call(this, newNode, referenceNode) as T;
        };
      }
    }

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = event.reason instanceof Error ? event.reason.message : String(event.reason || "");
      if (msg.includes("controls.start() should only be called after a component has mounted")) {
        event.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    const cleanElement = (el: Element) => {
      for (const attr of EXTENSION_ATTRS) {
        if (el.hasAttribute(attr)) {
          el.removeAttribute(attr);
        }
      }
      for (const attrNode of Array.from(el.attributes)) {
        if (attrNode.name.startsWith("__processed_")) {
          el.removeAttribute(attrNode.name);
        }
      }
    };

    const runCleanup = () => {
      if (document.body) {
        cleanElement(document.body);
      }
      const markedElements = document.querySelectorAll(
        "[bis_skin_checked], [bis_register]"
      );
      markedElements.forEach(cleanElement);
    };

    runCleanup();
    return () => window.removeEventListener("unhandledrejection", onUnhandledRejection);
  }, []);

  return null;
}
