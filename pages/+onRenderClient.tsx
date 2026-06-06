import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import type { RendererPageContext } from "@/renderer/pageContext";
import { preloadBusinessPageChunk } from "@/pages/BusinessPagePrefetch";

function shouldPreloadBusinessPage(urlOriginal?: string) {
  const pathname = new URL(urlOriginal || "/", window.location.origin).pathname;
  return (
    pathname.startsWith("/preview/negocio/") ||
    pathname.startsWith("/go/") ||
    /^\/[a-z]{2}\/[^/]+$/i.test(pathname) ||
    /^\/[a-z]{2}\/[a-z]{2}\/[^/]+\/[^/]+$/i.test(pathname)
  );
}

export async function onRenderClient(pageContext: RendererPageContext & { Page: React.ComponentType<{ pageContext: RendererPageContext }> }) {
  const { Page } = pageContext;
  const container = document.getElementById("root");

  if (!container) {
    throw new Error("Missing #root element for client hydration.");
  }

  if (shouldPreloadBusinessPage(pageContext.urlOriginal)) {
    await preloadBusinessPageChunk();
  }

  if (pageContext.isBusinessPage) {
    createRoot(container).render(<React.StrictMode><Page pageContext={pageContext} /></React.StrictMode>);
    return;
  }

  hydrateRoot(container, <React.StrictMode><Page pageContext={pageContext} /></React.StrictMode>);
}
