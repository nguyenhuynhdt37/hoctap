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
  }, []);

  return null;
}
