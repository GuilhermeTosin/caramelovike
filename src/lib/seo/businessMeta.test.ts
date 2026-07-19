import { getPrimaryActivityCustomPlaceholder, getPrimaryActivityOptions } from "@/lib/businessActivities";
import { getCanonicalCitySlug, getCityDisplayName } from "@/lib/locationDisplay";
import { buildBusinessUrl } from "@/services/businesses";
import { describe, expect, it } from "vitest";
import {
  buildBusinessSeoTitle,
  getBusinessSeoDescriptor,
} from "./businessMeta";

const baseBusiness = {
  name: "Sabor Carioca",
  categoryId: "food",
  category: "Restaurantes e Alimentacao",
  primaryActivity: "restaurant",
  primaryActivityCustom: "",
  description: "",
  attendanceType: "presencial",
  address: {
    city: "Toronto",
    state: "Ontario",
    stateCode: "ON",
    country: "Canada",
    countryCode: "CA",
  },
};

describe("business SEO metadata", () => {
  it("keeps the persisted city slug when rendering an existing business URL", () => {
    const existingBusiness = {
      ...baseBusiness,
      slug: "sabor-carioca",
      address: {
        ...baseBusiness.address,
        city: "Londres",
        citySlug: "london",
        stateCode: "ENG",
        countryCode: "GB",
      },
    };

    expect(buildBusinessUrl(existingBusiness)).toBe("/gb/eng/london/sabor-carioca");
  });
  it("uses category-specific placeholders for Other", () => {
    expect(getPrimaryActivityCustomPlaceholder("food")).toBe("Ex: Restaurante vegano");
    expect(getPrimaryActivityCustomPlaceholder("artists")).toBe("Ex: Banda para eventos");
    expect(getPrimaryActivityCustomPlaceholder("unknown")).toBe(getPrimaryActivityCustomPlaceholder("other"));
  });

  it("uses the city for online businesses when a base city exists", () => {
    const onlineBusiness = {
      ...baseBusiness,
      attendanceType: "online" as const,
      address: {
        ...baseBusiness.address,
        city: "Montreal",
        state: "Quebec",
        stateCode: "QC",
      },
    };

    expect(buildBusinessSeoTitle(onlineBusiness, "pt-BR")).toContain("em Montreal, Quebec");
  });
  it("uses Portuguese display names for known city exonyms without changing unknown cities", () => {
    expect(getCityDisplayName("London", "gb")).toBe("Londres");
    expect(getCityDisplayName("Berlin", "de")).toBe("Berlim");
    expect(getCityDisplayName("M\u00FCnchen", "de")).toBe("Munique");
    expect(getCityDisplayName("F\u00FCrth", "de")).toBe("F\u00FCrth");
    expect(getCanonicalCitySlug("London", "gb")).toBe("london");
    expect(getCanonicalCitySlug("Londres", "gb")).toBe("london");
    expect(getCanonicalCitySlug("Munique", "de")).toBe("munich");

    const londonBusiness = {
      ...baseBusiness,
      address: {
        ...baseBusiness.address,
        city: "London",
        state: "England",
        stateCode: "ENG",
        countryCode: "GB",
      },
    };

    expect(buildBusinessSeoTitle(londonBusiness, "pt-BR")).toContain("em Londres, Inglaterra");
  });
  it("exposes exactly the curated food activities", () => {
    expect(getPrimaryActivityOptions("food").map((activity) => activity.id)).toEqual([
      "restaurant",
      "pizzeria",
      "churrascaria",
      "bakery",
      "confectionery",
      "bar",
      "snack_bar",
      "food_truck",
      "buffet",
      "cafe",
      "other",
    ]);
  });

  it("exposes exactly the curated automotive activities", () => {
    expect(getPrimaryActivityOptions("auto").map((activity) => activity.id)).toEqual([
      "mechanic",
      "body_shop",
      "tires",
      "auto_electric",
      "car_wash",
      "towing",
      "dealership",
      "car_dealership",
      "automotive_center",
      "paintless_dent_repair",
    ]);
  });
  it("exposes the complete construction activity list plus Other", () => {
    expect(getPrimaryActivityOptions("construction").map((activity) => activity.id)).toEqual([
      "construction_company",
      "general_contractor",
      "electrician",
      "plumber",
      "painter",
      "carpenter",
      "engineer",
      "architect",
      "gardener",
      "other",
    ]);
  });
  it("exposes the complete legal and consulting activity list plus Other", () => {
    expect(getPrimaryActivityOptions("legal_consulting").map((activity) => activity.id)).toEqual([
      "lawyer",
      "lawyer_female",
      "translator",
      "translator_female",
      "notary",
      "notary_female",
      "immigration_consultant",
      "other",
    ]);
  });
  it("exposes the complete accounting and finance activity list plus Other", () => {
    expect(getPrimaryActivityOptions("accounting_finance").map((activity) => activity.id)).toEqual([
      "accountant",
      "accountant_female",
      "financial_advisor",
      "financial_advisor_female",
      "insurance_broker",
      "insurance_broker_female",
      "remittance",
      "tax_preparation",
      "other",
    ]);
  });
  it("exposes the complete education activity list plus Other", () => {
    expect(getPrimaryActivityOptions("education").map((activity) => activity.id)).toEqual([
      "teacher",
      "teacher_female",
      "english_teacher",
      "english_teacher_female",
      "driving_school",
      "school",
      "other",
    ]);
  });
  it("exposes the complete retail activity list plus Other", () => {
    expect(getPrimaryActivityOptions("retail").map((activity) => activity.id)).toEqual([
      "supermarket",
      "retail_market",
      "brazilian_store",
      "fashion",
      "clothing_store",
      "beauty_store",
      "lingerie",
      "furniture_store",
      "gift_shop",
      "other",
    ]);
  });
  it("exposes the complete transport and moving activity list plus Other", () => {
    expect(getPrimaryActivityOptions("transport_moving").map((activity) => activity.id)).toEqual([
      "moving_company",
      "freight_logistics",
      "passenger_transport",
      "van_service",
      "other",
    ]);
  });
  it("exposes the complete pet services activity list plus Other", () => {
    expect(getPrimaryActivityOptions("pets").map((activity) => activity.id)).toEqual([
      "cat_boarding",
      "dog_boarding",
      "grooming",
      "veterinary",
      "veterinarian",
      "pet_training",
      "dog_walker",
      "pet_shop",
      "other",
    ]);
  });
  it("exposes the complete child and elderly care activity list plus Other", () => {
    expect(getPrimaryActivityOptions("child_elder_care").map((activity) => activity.id)).toEqual([
      "daycare",
      "babysitter",
      "elderly_caregiver",
      "elderly_caregiver_female",
      "nurse",
      "nurse_female",
      "home_care",
      "other",
    ]);
  });
  it("exposes the complete cleaning activity list plus Other", () => {
    expect(getPrimaryActivityOptions("cleaning").map((activity) => activity.id)).toEqual([
      "diarist",
      "home_cleaning",
      "commercial_cleaning",
      "other",
    ]);
  });
  it("exposes the complete real estate activity list plus Other", () => {
    expect(getPrimaryActivityOptions("real_estate").map((activity) => activity.id)).toEqual([
      "real_estate_agency",
      "realtor",
      "realtor_female",
      "property_management",
      "mortgage_broker",
      "property_inspection",
      "other",
    ]);
  });
  it("exposes the complete tourism and travel activity list plus Other", () => {
    expect(getPrimaryActivityOptions("tourism").map((activity) => activity.id)).toEqual([
      "travel_agency",
      "tour_guide",
      "tours",
      "travel_insurance",
      "accommodation",
      "hotel",
      "other",
    ]);
  });
  it("exposes the complete artists activity list plus Other", () => {
    expect(getPrimaryActivityOptions("artists").map((activity) => activity.id)).toEqual([
      "rock_band",
      "forro_band",
      "chorinho",
      "samba",
      "funk",
      "pagode_group",
      "sertanejo",
      "choir",
      "musician",
      "music",
      "musicista",
      "dj",
      "photographer",
      "painter",
      "performer",
      "other",
    ]);
  });
  it("exposes the complete health and beauty activity list plus Other", () => {
    expect(getPrimaryActivityOptions("health_beauty").map((activity) => activity.id)).toEqual([
      "medical_clinic",
      "doctor",
      "doctor_female",
      "pediatrician",
      "dentist",
      "depilation",
      "manicure",
      "physiotherapy",
      "psychology",
      "psychologist_female",
      "nutrition",
      "hairdresser",
      "hairdresser_female",
      "beauty_salon",
      "barbershop",
      "aesthetics",
      "personal_trainer",
      "other",
    ]);
  });
  it("uses Brazilian descriptors only in titles for selected activities", () => {
    expect(getBusinessSeoDescriptor(baseBusiness, "pt-BR")).toBe("Restaurante");
    expect(buildBusinessSeoTitle(baseBusiness, "pt-BR")).toBe(
      "Sabor Carioca | Restaurante brasileiro em Toronto, Ontario",
    );

    const dentistBusiness = {
      ...baseBusiness,
      categoryId: "health_beauty",
      category: "Saude e Beleza",
      primaryActivity: "dentist",
    };
    expect(buildBusinessSeoTitle(dentistBusiness, "pt-BR")).toBe(
      "Sabor Carioca | Dentista brasileiro em Toronto, Ontario",
    );
  });

  it("keeps the original descriptor for activities outside the curated list", () => {
    const petBusiness = {
      ...baseBusiness,
      categoryId: "pets",
      category: "Pets",
      primaryActivity: "pet_hotel",
    };

    expect(getBusinessSeoDescriptor(petBusiness, "pt-BR")).toBe("Hotel para c\u00e3es e gatos");
  });

  it("does not apply the override when no primary activity was selected", () => {
    const legacyBusiness = {
      ...baseBusiness,
      primaryActivity: "",
    };

    expect(getBusinessSeoDescriptor(legacyBusiness, "pt-BR")).toBe("Restaurantes e Alimentacao");
  });
});
