import { stripRichTextHtml } from "@/lib/richText";
import type { BusinessFrontend, MenuItem, Review } from "@/types/database";

type StructuredDataObject = Record<string, unknown>;

const WEEKDAY_SCHEMA_MAP: Record<string, string> = {
  domingo: "Sunday",
  segunda: "Monday",
  "segunda-feira": "Monday",
  terca: "Tuesday",
  "terca-feira": "Tuesday",
  quarta: "Wednesday",
  "quarta-feira": "Wednesday",
  quinta: "Thursday",
  "quinta-feira": "Thursday",
  sexta: "Friday",
  "sexta-feira": "Friday",
  sabado: "Saturday",
};

const PRIMARY_ACTIVITY_SCHEMA_TYPES: Record<string, string> = {
  restaurant: "Restaurant",
  pizzeria: "Restaurant",
  churrascaria: "Restaurant",
  bakery: "Bakery",
  confectionery: "Bakery",
  bar: "BarOrPub",
  snack_bar: "FastFoodRestaurant",
  food_truck: "FastFoodRestaurant",
  cafe: "CafeOrCoffeeShop",
  medical_clinic: "MedicalClinic",
  doctor: "MedicalClinic",
  doctor_female: "MedicalClinic",
  pediatrician: "MedicalClinic",
  dentist: "Dentist",
  hairdresser: "HairSalon",
  hairdresser_female: "HairSalon",
  beauty_salon: "BeautySalon",
  barbershop: "Barbershop",
  mechanic: "AutoRepair",
  body_shop: "AutoRepair",
  tires: "AutoRepair",
  auto_electric: "AutoRepair",
  car_wash: "AutoWash",
  dealership: "AutoDealer",
  car_dealership: "AutoDealer",
  lawyer: "Attorney",
  lawyer_female: "Attorney",
  accountant: "AccountingService",
  accountant_female: "AccountingService",
  real_estate_agency: "RealEstateAgent",
  travel_agency: "TravelAgency",
  hotel: "Hotel",
  veterinarian: "VeterinaryCare",
  veterinary: "VeterinaryCare",
  pet_shop: "PetStore",
};

const CATEGORY_SCHEMA_TYPES: Record<string, string> = {
  food: "FoodEstablishment",
  auto: "AutomotiveBusiness",
  health_beauty: "HealthAndBeautyBusiness",
  legal_consulting: "ProfessionalService",
  accounting_finance: "FinancialService",
  retail: "Store",
  transport_moving: "MovingCompany",
  pets: "ProfessionalService",
  child_elder_care: "ProfessionalService",
  cleaning: "ProfessionalService",
  real_estate: "RealEstateAgent",
  tourism: "TravelAgency",
  artists: "ProfessionalService",
};

function normalizeWeekday(value: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getNamedItems(items: MenuItem[]): MenuItem[] {
  return items.filter((item) => String(item?.name || "").trim());
}

export function getBusinessStructuredDescription(description: string): string | undefined {
  return stripRichTextHtml(description || "") || undefined;
}

export function getBusinessStructuredDataType(
  business: Pick<BusinessFrontend, "categoryId" | "primaryActivity">,
): string {
  return (
    PRIMARY_ACTIVITY_SCHEMA_TYPES[String(business.primaryActivity || "")] ||
    CATEGORY_SCHEMA_TYPES[String(business.categoryId || "")] ||
    "LocalBusiness"
  );
}

export function buildOpeningHoursSpecification(hours: string[]): StructuredDataObject[] {
  return (hours || []).flatMap((line) => {
    const text = String(line || "").trim();
    const separatorIndex = text.indexOf(":");
    if (!text || /fechado/i.test(text) || separatorIndex < 1) return [];

    const day = WEEKDAY_SCHEMA_MAP[normalizeWeekday(text.slice(0, separatorIndex))];
    const rangeMatch = text.slice(separatorIndex + 1).match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (!day || !rangeMatch) return [];

    return [{
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${day}`,
      opens: rangeMatch[1].padStart(5, "0"),
      closes: rangeMatch[2].padStart(5, "0"),
    }];
  });
}

export function buildBusinessOfferCatalog(
  business: Pick<BusinessFrontend, "categoryId" | "name" | "services" | "serviceItems" | "menu">,
): StructuredDataObject | undefined {
  const isFoodBusiness = business.categoryId === "food";
  const items = isFoodBusiness
    ? getNamedItems(business.menu || [])
    : getNamedItems(
        business.serviceItems?.length
          ? business.serviceItems
          : (business.services || []).map((name) => ({ name, description: "", price: "" })),
      );
  if (!items.length) return undefined;

  const itemType = isFoodBusiness ? "MenuItem" : "Service";
  return {
    "@type": "OfferCatalog",
    name: business.name,
    itemListElement: items.slice(0, 40).map((item) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": itemType,
        name: String(item.name).trim(),
        description: String(item.description || "").trim() || undefined,
      },
    })),
  };
}

export function getBusinessMenuUrl(menuPdfUrl?: string): string | undefined {
  const value = String(menuPdfUrl || "").trim();
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function buildReviewStructuredData(reviews: Review[]): StructuredDataObject[] {
  return (reviews || []).flatMap((review) => {
    const rating = Number(review.rating);
    const authorName = String(review.user_name || "").trim();
    if (!authorName || rating < 1 || rating > 5) return [];

    return [{
      "@type": "Review",
      author: { "@type": "Person", name: authorName },
      reviewRating: { "@type": "Rating", ratingValue: rating, bestRating: 5, worstRating: 1 },
      reviewBody: String(review.comment || "").trim() || undefined,
      datePublished: review.created_at || undefined,
    }];
  }).slice(0, 10);
}
