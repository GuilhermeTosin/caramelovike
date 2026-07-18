export type PrimaryActivityOption = { id: string; label: string };

export const OTHER_PRIMARY_ACTIVITY_ID = "other";

type ActivityDefinition = readonly [id: string, label: string];

const DEFINITIONS: Record<string, readonly ActivityDefinition[]> = {
  food: [["restaurant", "Restaurante"], ["bakery", "Padaria"], ["cafe", "Cafeteria"], ["confectionery", "Confeitaria"], ["market", "Mercado brasileiro"], ["buffet", "Buffet"], ["food_truck", "Food truck"], ["catering", "Catering"], ["bar", "Bar"]],
  auto: [["mechanic", "Oficina mec\u00e2nica"], ["body_shop", "Funilaria e pintura"], ["tires", "Pneus e alinhamento"], ["auto_electric", "Autoel\u00e9trica"], ["car_wash", "Lavagem automotiva"], ["detailing", "Est\u00e9tica automotiva"], ["towing", "Guincho"], ["dealership", "Concession\u00e1ria ou revenda"]],
  health_beauty: [["medical_clinic", "Cl\u00ednica de sa\u00fade"], ["dentist", "Dentista"], ["physiotherapy", "Fisioterapia"], ["psychology", "Psicologia"], ["nutrition", "Nutri\u00e7\u00e3o"], ["beauty_salon", "Sal\u00e3o de beleza"], ["barbershop", "Barbearia"], ["aesthetics", "Est\u00e9tica"], ["personal_trainer", "Personal trainer"]],
  construction: [["construction_company", "Empresa de constru\u00e7\u00e3o"], ["general_contractor", "Empreiteiro"], ["electrician", "Eletricista"], ["plumber", "Encanador"], ["painter", "Pintor"], ["carpenter", "Marceneiro"], ["architect_engineer", "Arquitetura ou engenharia"], ["renovation", "Reformas"]],
  legal_consulting: [["lawyer", "Advogado"], ["immigration_consultant", "Consultoria de imigra\u00e7\u00e3o"], ["translator", "Tradutor ou int\u00e9rprete"], ["notary", "Not\u00e1rio"], ["document_services", "Servi\u00e7os de documentos"], ["business_consultant", "Consultoria empresarial"]],
  accounting_finance: [["accountant", "Contador"], ["tax_preparation", "Imposto de renda"], ["bookkeeping", "Escritura\u00e7\u00e3o cont\u00e1bil"], ["financial_advisor", "Consultoria financeira"], ["insurance_broker", "Corretor de seguros"], ["remittance", "C\u00e2mbio e remessas"]],
  education: [["language_school", "Escola de idiomas"], ["private_tutor", "Aulas particulares"], ["professional_courses", "Cursos profissionalizantes"], ["driving_school", "Autoescola"], ["music_school", "Escola de m\u00fasica"], ["school", "Escola"]],
  retail: [["brazilian_store", "Loja de produtos brasileiros"], ["clothing_store", "Loja de roupas"], ["beauty_store", "Produtos de beleza"], ["furniture_store", "M\u00f3veis e decora\u00e7\u00e3o"], ["electronics_store", "Eletr\u00f4nicos"], ["gift_shop", "Presentes"], ["online_store", "Loja online"]],
  transport_moving: [["moving_company", "Empresa de mudan\u00e7a"], ["freight_logistics", "Frete e log\u00edstica"], ["passenger_transport", "Transporte de passageiros"], ["courier", "Entregas e courier"], ["car_rental", "Aluguel de carros"], ["storage", "Guarda-volumes"]],
  pets: [["pet_hotel", "Hotel para c\u00e3es e gatos"], ["pet_daycare", "Creche para pets"], ["grooming", "Banho e tosa"], ["veterinary", "Cl\u00ednica veterin\u00e1ria"], ["pet_training", "Adestramento"], ["dog_walker", "Passeador de c\u00e3es"], ["pet_shop", "Pet shop"]],
  child_elder_care: [["daycare", "Creche infantil"], ["babysitter", "Bab\u00e1"], ["elderly_caregiver", "Cuidador de idosos"], ["home_care", "Assist\u00eancia domiciliar"], ["special_needs_support", "Apoio a necessidades especiais"]],
  cleaning: [["home_cleaning", "Limpeza residencial"], ["commercial_cleaning", "Limpeza comercial"], ["post_construction", "Limpeza p\u00f3s-obra"], ["airbnb_cleaning", "Limpeza para Airbnb"], ["upholstery_cleaning", "Limpeza de carpetes e estofados"], ["organizing", "Organiza\u00e7\u00e3o residencial"]],
  real_estate: [["realtor", "Corretor de im\u00f3veis"], ["property_management", "Administra\u00e7\u00e3o de im\u00f3veis"], ["property_rental", "Aluguel de im\u00f3veis"], ["mortgage_broker", "Consultoria de financiamento"], ["property_inspection", "Vistoria de im\u00f3veis"]],
  tourism: [["travel_agency", "Ag\u00eancia de viagens"], ["tour_guide", "Guia de turismo"], ["accommodation", "Hospedagem"], ["tours", "Passeios e excurs\u00f5es"], ["travel_insurance", "Seguro viagem"]],
  artists: [["photographer", "Fot\u00f3grafo"], ["videographer", "Videomaker"], ["musician", "M\u00fasico"], ["dj", "DJ"], ["designer", "Designer"], ["illustrator", "Ilustrador"], ["performer", "Artista para eventos"]],
  other: [["community_organization", "Organiza\u00e7\u00e3o comunit\u00e1ria"], ["religious_organization", "Organiza\u00e7\u00e3o religiosa"], ["technology_services", "Servi\u00e7os de tecnologia"], ["nonprofit", "Institui\u00e7\u00e3o sem fins lucrativos"], ["local_services", "Servi\u00e7os locais"]],
};

const OTHER: PrimaryActivityOption = { id: OTHER_PRIMARY_ACTIVITY_ID, label: "Outro tipo" };

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function getPrimaryActivityOptions(categoryId: string): readonly PrimaryActivityOption[] {
  const definitions = DEFINITIONS[categoryId] || DEFINITIONS.other;
  return [...definitions.map(([id, label]) => ({ id, label })), OTHER];
}

export function normalizePrimaryActivityCustom(value: unknown): string {
  return normalizeText(value).slice(0, 80);
}

export function isPrimaryActivityValid(categoryId: string, activityId: string, customValue?: string): boolean {
  if (!activityId) return true;
  if (activityId === OTHER_PRIMARY_ACTIVITY_ID) return normalizePrimaryActivityCustom(customValue).length >= 2;
  return getPrimaryActivityOptions(categoryId).some((option) => option.id === activityId);
}

export function getPrimaryActivityLabel(categoryId: string, activityId?: string, customValue?: string): string {
  if (!activityId) return "";
  if (activityId === OTHER_PRIMARY_ACTIVITY_ID) return normalizePrimaryActivityCustom(customValue);
  return getPrimaryActivityOptions(categoryId).find((option) => option.id === activityId)?.label || "";
}