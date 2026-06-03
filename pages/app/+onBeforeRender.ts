import type { PageContextServer } from "vike/types";
import { getBusinessByCountryAndSlug, getBusinessBySlug } from "@/services/businesses";
import type { BusinessFrontend } from "@/types/database";

type PageContext = PageContextServer & {
  urlOriginal?: string;
  initialBusiness?: BusinessFrontend | null;
  isBusinessPage?: boolean;
};

function parseBusinessPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 4) {
    const [countryCode, stateCode, city, businessName] = parts;
    return { kind: "full" as const, countryCode, stateCode, city, businessName };
  }
  if (parts.length === 2) {
    const [countryCode, businessName] = parts;
    return { kind: "country" as const, countryCode, businessName };
  }
  return null;
}

export async function onBeforeRender(pageContext: PageContext) {
  const pathname = (() => {
    try {
      return new URL(pageContext.urlOriginal || "/", "http://localhost").pathname;
    } catch {
      return "/";
    }
  })();

  const businessRoute = parseBusinessPath(pathname);
  if (!businessRoute) {
    return {
      pageContext: {
        initialBusiness: null,
        isBusinessPage: false,
      },
    };
  }

  let business: BusinessFrontend | null = null;
  if (businessRoute.kind === "full") {
    business = await getBusinessBySlug(
      businessRoute.countryCode,
      businessRoute.stateCode,
      businessRoute.city,
      businessRoute.businessName,
    );
  } else if (businessRoute.kind === "country") {
    business = await getBusinessByCountryAndSlug(businessRoute.countryCode, businessRoute.businessName);
  }

  return {
    pageContext: {
      initialBusiness: business,
      isBusinessPage: !!businessRoute,
    },
  };
}
