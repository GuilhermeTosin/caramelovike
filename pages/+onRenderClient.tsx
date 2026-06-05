import React from "react";
import { hydrateRoot } from "react-dom/client";
import { PageContextProvider, type RendererPageContext } from "@/renderer/pageContext";

export function onRenderClient(pageContext: RendererPageContext & { Page: React.ComponentType<{ pageContext: RendererPageContext }> }) {
  const { Page } = pageContext;
  const container = document.getElementById("root");

  if (!container) {
    throw new Error("Missing #root element for client hydration.");
  }

  hydrateRoot(
    container,
    <React.StrictMode>
      <PageContextProvider pageContext={pageContext}>
        <Page pageContext={pageContext} />
      </PageContextProvider>
    </React.StrictMode>,
  );
}
