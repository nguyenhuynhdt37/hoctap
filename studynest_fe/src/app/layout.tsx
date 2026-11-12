import HydrationFix from "@/components/shared/hydration-fix";
import RouteProgressBar from "@/components/shared/route-progress-bar";
import { NotificationToastListener } from "@/components/shared/toast/notification-toast-listener";
import { ToastProvider } from "@/components/shared/toast/toast-provider";
import UserLoader from "@/components/shared/user-loader";
import { QueryProvider } from "@/provider/QueryProvider";
import Script from "next/script";
import { Suspense } from "react";
import { beVietnamPro, lora } from "./fonts";
import "./globals.css";

const preHydrationCleanupScript = `
(function () {
  if (typeof window === "undefined" || typeof MutationObserver === "undefined") return;
  var ATTRS = ["bis_skin_checked", "bis_register"];
  function cleanNode(el) {
    if (!el || el.nodeType !== 1) return;
    for (var i = 0; i < ATTRS.length; i++) {
      if (el.hasAttribute(ATTRS[i])) el.removeAttribute(ATTRS[i]);
    }
    var attrs = el.attributes;
    if (attrs) {
      for (var j = attrs.length - 1; j >= 0; j--) {
        if (attrs[j].name.indexOf("__processed_") === 0) {
          el.removeAttribute(attrs[j].name);
        }
      }
    }
  }
  function cleanSubtree(root) {
    cleanNode(root);
    if (!root || root.nodeType !== 1 || !root.childElementCount || !root.querySelectorAll) return;
    var nodes = root.querySelectorAll("[bis_skin_checked],[bis_register]");
    for (var i = 0; i < nodes.length; i++) cleanNode(nodes[i]);
  }
  try {
    cleanSubtree(document.documentElement);
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === "attributes") {
          cleanNode(m.target);
        } else if (m.type === "childList") {
          for (var j = 0; j < m.addedNodes.length; j++) {
            cleanSubtree(m.addedNodes[j]);
          }
        }
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ATTRS,
      childList: true,
      subtree: true
    });
    var stopped = false;
    var stopObserver = function () {
      if (stopped) return;
      stopped = true;
      cleanSubtree(document.documentElement);
      observer.disconnect();
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        cleanSubtree(document.documentElement);
      }, { once: true });
    }
    if (document.readyState === "complete") {
      setTimeout(stopObserver, 1500);
    } else {
      window.addEventListener("load", function () {
        setTimeout(stopObserver, 1500);
      }, { once: true });
      setTimeout(stopObserver, 6000);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      data-scroll-behavior="smooth"
      className={`${beVietnamPro.variable} ${lora.variable}`}
      suppressHydrationWarning
    >
      <body
        className="font-sans bg-background text-foreground antialiased selection:bg-primary-pastel/60 selection:text-foreground"
        suppressHydrationWarning
      >
        <Script
          id="strip-extension-attrs"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: preHydrationCleanupScript }}
        />
        <Suspense fallback={null}>
          <RouteProgressBar />
        </Suspense>
        <HydrationFix />
        <QueryProvider>
          <ToastProvider />
          <NotificationToastListener />
          <UserLoader>{children}</UserLoader>
        </QueryProvider>
      </body>
    </html>
  );
}
