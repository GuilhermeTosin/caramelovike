import React from "react";
import { createRoot } from "react-dom/client";
import type { RendererPageContext } from "@/renderer/pageContext";
import { preloadBusinessPageChunk } from "@/pages/BusinessPagePrefetch";

function getPathname(urlOriginal?: string) {
  return new URL(urlOriginal || "/", window.location.origin).pathname;
}

function isBusinessRoute(pathname: string) {
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

  const pathname = getPathname(pageContext.urlOriginal);

  if (isBusinessRoute(pathname)) {
    await preloadBusinessPageChunk();
  }

  createRoot(container).render(<React.StrictMode><Page pageContext={pageContext} /></React.StrictMode>);
}
