import "@/index.css";
import App from "@/App";
import type { BusinessFrontend } from "@/types/database";

type PageContext = {
  urlOriginal?: string;
  initialBusiness?: BusinessFrontend | null;
  isBusinessPage?: boolean;
};

export function Page({ pageContext }: { pageContext?: PageContext }) {
  const isServer = typeof window === "undefined";
  const location = pageContext?.urlOriginal || "/";

  return (
    <App
      router={isServer ? "static" : "browser"}
      location={location}
      initialBusiness={pageContext?.initialBusiness || null}
      isBusinessPage={pageContext?.isBusinessPage || false}
    />
  );
}
