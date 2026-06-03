import React from "react";
import { hydrateRoot } from "react-dom/client";

type PageContext = {
  Page: React.ComponentType<{ pageContext: PageContext }>;
};

export function onRenderClient(pageContext: PageContext) {
  const { Page } = pageContext;
  const container = document.getElementById("root");

  if (!container) {
    throw new Error("Missing #root element for client hydration.");
  }

  hydrateRoot(
    container,
    <React.StrictMode>
      <Page pageContext={pageContext} />
    </React.StrictMode>,
  );
}
