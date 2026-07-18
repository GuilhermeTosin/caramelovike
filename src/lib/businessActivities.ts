export type PrimaryActivityOption = { id: string; label: string };

export const OTHER_PRIMARY_ACTIVITY_ID = "other";

type ActivityDefinition = readonly [id: string, label: string];

const DEFINITIONS: Record<string, readonly ActivityDefinition[]> = {
  food: [["restaurant", "Restaurante"], ["pizzeria", "Pizzaria"], ["churrascaria", "Churrascaria"], ["bakery", "Padaria"], ["confectionery", "Confeitaria"], ["bar", "Bar"], ["snack_bar", "Lanchonete"], ["food_truck", "Food Truck"], ["buffet", "Buffet"], ["cafe", "Caf" + String.fromCharCode(0xE9) + ""]],
  auto: [["mechanic", "Oficina mec\u00e2nica"], ["body_shop", "Funilaria e pintura"], ["tires", "Borracharia"], ["auto_electric", "Autoel\u00e9trica"], ["car_wash", "Lava Car"], ["towing", "Guincho"], ["dealership", "Concession\u00e1ria"], ["car_dealership", "Revenda de carros"], ["automotive_center", "Centro automotivo"], ["paintless_dent_repair", "Martelinho de ouro"]],
  health_beauty: [["medical_clinic", "Cl\u00ednica"], ["doctor", "M\u00e9dico"], ["doctor_female", "M\u00e9dica"], ["pediatrician", "Pediatra"], ["dentist", "Dentista"], ["depilation", "Depila\u00e7\u00e3o"], ["manicure", "Manicure"], ["physiotherapy", "Fisioterapeuta"], ["psychology", "Psic\u00f3logo"], ["psychologist_female", "Psic\u00f3loga"], ["nutrition", "Nutricionista"], ["hairdresser", "Cabeleireiro"], ["hairdresser_female", "Cabeleireira"], ["beauty_salon", "Sal\u00e3o de beleza"], ["barbershop", "Barbearia"], ["aesthetics", "Est\u00e9tica"], ["personal_trainer", "Personal trainer"]],
  construction: [["construction_company", "Construtora"], ["general_contractor", "Empreiteiro"], ["electrician", "Eletricista"], ["plumber", "Encanador"], ["painter", "Pintor"], ["carpenter", "Marceneiro"], ["engineer", "Engenheiro"], ["architect", "Arquiteto"], ["gardener", "Jardineiro"]],
  legal_consulting: [["lawyer", "Advogado"], ["lawyer_female", "Advogada"], ["translator", "Tradutor"], ["translator_female", "Tradutora"], ["notary", "Not\u00e1rio"], ["notary_female", "Not\u00e1ria"], ["immigration_consultant", "Consultoria de imigra\u00e7\u00e3o"]],
  accounting_finance: [["accountant", "Contador"], ["accountant_female", "Contadora"], ["financial_advisor", "Consultor Financeiro"], ["financial_advisor_female", "Consultora Financeira"], ["insurance_broker", "Corretor de seguros"], ["insurance_broker_female", "Corretora de seguros"], ["remittance", "C" + String.fromCharCode(0xE2) + "mbio e remessas"], ["tax_preparation", "Imposto de renda"]],
  education: [["teacher", "Professor"], ["teacher_female", "Professora"], ["english_teacher", "Professor de ingl" + String.fromCharCode(0xEA) + "s"], ["english_teacher_female", "Professora de ingl" + String.fromCharCode(0xEA) + "s"], ["driving_school", "Autoescola"], ["school", "Escola"]],
  retail: [["supermarket", "Supermercado"], ["retail_market", "Mercado"], ["brazilian_store", "Produtos Brasileiros"], ["fashion", "Moda"], ["clothing_store", "Loja de roupas"], ["beauty_store", "Produtos de beleza"], ["lingerie", "Roupa " + String.fromCharCode(0xED) + "ntima"], ["furniture_store", "Decora" + String.fromCharCode(0xE7) + String.fromCharCode(0xE3) + "o"], ["gift_shop", "Lembran" + String.fromCharCode(0xE7) + "as"]],
  transport_moving: [["moving_company", "Empresa de mudan" + String.fromCharCode(0xE7) + "a"], ["freight_logistics", "Frete"], ["passenger_transport", "Transporte de passageiros"], ["van_service", "Servi" + String.fromCharCode(0xE7) + "o de van"]],
  pets: [["cat_boarding", "Hospedagem para gatos"], ["dog_boarding", "Hospedagem para c" + String.fromCharCode(0xE3) + "es"], ["grooming", "Banho e tosa"], ["veterinary", "Cl" + String.fromCharCode(0xED) + "nica veterin" + String.fromCharCode(0xE1) + "ria"], ["veterinarian", "Veterin" + String.fromCharCode(0xE1) + "rio"], ["pet_training", "Adestramento"], ["dog_walker", "Passeador de c" + String.fromCharCode(0xE3) + "es"], ["pet_shop", "Pet Shop"]],
  child_elder_care: [["daycare", "Creche infantil"], ["babysitter", "Bab" + String.fromCharCode(0xE1)], ["elderly_caregiver", "Cuidador de idosos"], ["elderly_caregiver_female", "Cuidadora de idosos"], ["nurse", "Enfermeiro"], ["nurse_female", "Enfermeira"], ["home_care", "Assist" + String.fromCharCode(0xEA) + "ncia Domiciliar"]],
  cleaning: [["diarist", "Diarista"], ["home_cleaning", "Servi" + String.fromCharCode(0xE7) + "o de Limpeza Residencial"], ["commercial_cleaning", "Servi" + String.fromCharCode(0xE7) + "o de Limpeza Comercial"]],
  real_estate: [["real_estate_agency", "Imobili" + String.fromCharCode(0xE1) + "ria"], ["realtor", "Corretor de im" + String.fromCharCode(0xF3) + "veis"], ["realtor_female", "Corretora de im" + String.fromCharCode(0xF3) + "veis"], ["property_management", "Administra" + String.fromCharCode(0xE7) + String.fromCharCode(0xE3) + "o de im" + String.fromCharCode(0xF3) + "veis"], ["mortgage_broker", "Consultoria de financiamento de im" + String.fromCharCode(0xF3) + "veis"], ["property_inspection", "Vistoria de im" + String.fromCharCode(0xF3) + "veis"]],
  tourism: [["travel_agency", "Ag" + String.fromCharCode(0xEA) + "ncia de turismo"], ["tour_guide", "Guia de turismo"], ["tours", "Passeios e excurs" + String.fromCharCode(0xF5) + "es"], ["travel_insurance", "Seguro viagem"], ["accommodation", "Hospedagem"], ["hotel", "Hotel"]],
  artists: [["rock_band", "Banda de Rock"], ["forro_band", "Banda de Forr" + String.fromCharCode(0xF3)], ["chorinho", "Chorinho"], ["samba", "Samba"], ["funk", "Funk"], ["pagode_group", "Grupo de pagode"], ["sertanejo", "Sertanejo"], ["choir", "Coro"], ["musician", "M" + String.fromCharCode(0xFA) + "sico"], ["music", "M" + String.fromCharCode(0xFA) + "sica"], ["musicista", "Musicista"], ["dj", "DJ"], ["photographer", "Fot" + String.fromCharCode(0xF3) + "grafo"], ["painter", "Pintor"], ["performer", "Artista para eventos"]],
  other: [["community_organization", "Organiza\u00e7\u00e3o comunit\u00e1ria"], ["religious_organization", "Organiza\u00e7\u00e3o religiosa"], ["technology_services", "Servi\u00e7os de tecnologia"], ["nonprofit", "Institui\u00e7\u00e3o sem fins lucrativos"], ["local_services", "Servi\u00e7os locais"]],
};

const OTHER: PrimaryActivityOption = { id: OTHER_PRIMARY_ACTIVITY_ID, label: "Outro tipo" };
const PRIMARY_ACTIVITY_CUSTOM_PLACEHOLDERS: Record<string, string> = {
  food: "Ex: Restaurante vegano",
  auto: "Ex: Guincho para caminh" + String.fromCharCode(0xF5) + "es",
  health_beauty: "Ex: Terapia ocupacional",
  construction: "Ex: Instala" + String.fromCharCode(0xE7) + String.fromCharCode(0xE3) + "o de pisos",
  legal_consulting: "Ex: Consultoria jur" + String.fromCharCode(0xED) + "dica",
  accounting_finance: "Ex: Planejamento financeiro",
  education: "Ex: Escola de portugu" + String.fromCharCode(0xEA) + "s",
  retail: "Ex: Loja de produtos naturais",
  transport_moving: "Ex: Transporte escolar",
  pets: "Ex: Fisioterapia para pets",
  child_elder_care: "Ex: Cuidados para pessoas com defici" + String.fromCharCode(0xEA) + "ncia",
  cleaning: "Ex: Limpeza p" + String.fromCharCode(0xF3) + "s-obra",
  real_estate: "Ex: Administra" + String.fromCharCode(0xE7) + String.fromCharCode(0xE3) + "o de condom" + String.fromCharCode(0xED) + "nios",
  tourism: "Ex: Turismo receptivo",
  artists: "Ex: Banda para eventos",
  other: "Ex: Servi" + String.fromCharCode(0xE7) + "o local especializado",
};
const LEGACY_PRIMARY_ACTIVITY_LABELS: Record<string, string> = { catering: "Catering", detailing: "Est" + String.fromCharCode(0xE9) + "tica automotiva", architect_engineer: "Arquitetura ou engenharia", renovation: "Reformas", document_services: "Serv" + String.fromCharCode(0xE7) + "os de documentos", business_consultant: "Consultoria empresarial", bookkeeping: "Escrit" + "ura" + String.fromCharCode(0xE7) + String.fromCharCode(0xE3) + "o cont" + String.fromCharCode(0xE1) + "bil", language_school: "Escola de idiomas", private_tutor: "Aulas particulares", professional_courses: "Cursos profissionalizantes", music_school: "Escola de m" + String.fromCharCode(0xFA) + "sica", brazilian_store: "Loja de produtos brasileiros", online_store: "Loja online", courier: "Entregas e courier", car_rental: "Aluguel de carros", storage: "Guarda-volumes", pet_hotel: "Hotel para c" + String.fromCharCode(0xE3) + "es e gatos", pet_daycare: "Creche para pets", special_needs_support: "Apoio a necessidades especiais", post_construction: "Limpeza p" + String.fromCharCode(0xF3) + "s-obra", airbnb_cleaning: "Limpeza para Airbnb", upholstery_cleaning: "Limpeza de carpetes e estofados", organizing: "Organiza" + String.fromCharCode(0xE7) + String.fromCharCode(0xE3) + "o residencial", property_rental: "Aluguel de im" + String.fromCharCode(0xF3) + "veis", videographer: "Videomaker", illustrator: "Ilustrador", designer: "Designer" };
type SeoDescriptorLocale = "pt-BR" | "en";

type SeoDescriptorOverride = Record<SeoDescriptorLocale, string>;

const SEO_DESCRIPTOR_OVERRIDES: Record<string, SeoDescriptorOverride> = {
  restaurant: { "pt-BR": "Restaurante brasileiro", en: "Brazilian restaurant" },
  pizzeria: { "pt-BR": "Pizzaria brasileira", en: "Brazilian pizzeria" },
  churrascaria: { "pt-BR": "Churrascaria brasileira", en: "Brazilian steakhouse" },
  bakery: { "pt-BR": "Padaria brasileira", en: "Brazilian bakery" },
  cafe: { "pt-BR": "Caf\u00e9 brasileiro", en: "Brazilian cafe" },
  confectionery: { "pt-BR": "Confeitaria brasileira", en: "Brazilian confectionery" },
  market: { "pt-BR": "Mercado brasileiro", en: "Brazilian market" },
  buffet: { "pt-BR": "Buffet brasileiro", en: "Brazilian buffet" },
  bar: { "pt-BR": "Bar brasileiro", en: "Brazilian bar" },
  snack_bar: { "pt-BR": "Lanchonete brasileira", en: "Brazilian snack bar" },
  food_truck: { "pt-BR": "Food Truck brasileiro", en: "Brazilian food truck" },
  catering: { "pt-BR": "Catering brasileiro", en: "Brazilian catering" },
  medical_clinic: { "pt-BR": "Cl\u00ednica brasileira", en: "Brazilian clinic" },
  doctor: { "pt-BR": "M\u00e9dico brasileiro", en: "Brazilian doctor" },
  doctor_female: { "pt-BR": "M\u00e9dica brasileira", en: "Brazilian doctor" },
  pediatrician: { "pt-BR": "Pediatra brasileiro", en: "Brazilian pediatrician" },
  dentist: { "pt-BR": "Dentista brasileiro", en: "Brazilian dentist" },
  depilation: { "pt-BR": "Depila\u00e7\u00e3o brasileira", en: "Brazilian depilation service" },
  manicure: { "pt-BR": "Manicure brasileira", en: "Brazilian manicure" },
  physiotherapy: { "pt-BR": "Fisioterapeuta brasileiro", en: "Brazilian physiotherapist" },
  psychology: { "pt-BR": "Psic\u00f3logo brasileiro", en: "Brazilian psychologist" },
  psychologist_female: { "pt-BR": "Psic\u00f3loga brasileira", en: "Brazilian psychologist" },
  nutrition: { "pt-BR": "Nutricionista brasileiro", en: "Brazilian nutritionist" },
  hairdresser: { "pt-BR": "Cabeleireiro brasileiro", en: "Brazilian hairdresser" },
  hairdresser_female: { "pt-BR": "Cabeleireira brasileira", en: "Brazilian hairdresser" },
  beauty_salon: { "pt-BR": "Sal\u00e3o de beleza brasileiro", en: "Brazilian beauty salon" },
  barbershop: { "pt-BR": "Barbearia brasileira", en: "Brazilian barbershop" },
  aesthetics: { "pt-BR": "Est\u00e9tica brasileira", en: "Brazilian aesthetics" },
  personal_trainer: { "pt-BR": "Personal trainer brasileiro", en: "Brazilian personal trainer" },
  mechanic: { "pt-BR": "Oficina mec\u00e2nica brasileira", en: "Brazilian mechanic" },
  body_shop: { "pt-BR": "Funilaria e pintura brasileira", en: "Brazilian body shop and paint" },
  tires: { "pt-BR": "Borracharia brasileira", en: "Brazilian tire service" },
  auto_electric: { "pt-BR": "Autoel\u00e9trica brasileira", en: "Brazilian auto electrician" },
  car_wash: { "pt-BR": "Lava Car brasileiro", en: "Brazilian car wash" },
  towing: { "pt-BR": "Guincho brasileiro", en: "Brazilian towing service" },
  dealership: { "pt-BR": "Concession\u00e1ria brasileira", en: "Brazilian dealership" },
  car_dealership: { "pt-BR": "Revenda de carros brasileira", en: "Brazilian car dealership" },
  automotive_center: { "pt-BR": "Centro automotivo brasileiro", en: "Brazilian automotive center" },
  paintless_dent_repair: { "pt-BR": "Martelinho de ouro brasileiro", en: "Brazilian paintless dent repair" },
  detailing: { "pt-BR": "Est\u00e9tica automotiva brasileira", en: "Brazilian auto detailing" },
  construction_company: { "pt-BR": "Construtora brasileira", en: "Brazilian construction company" },
  general_contractor: { "pt-BR": "Empreiteiro brasileiro", en: "Brazilian general contractor" },
  electrician: { "pt-BR": "Eletricista brasileiro", en: "Brazilian electrician" },
  plumber: { "pt-BR": "Encanador brasileiro", en: "Brazilian plumber" },
  painter: { "pt-BR": "Pintor brasileiro", en: "Brazilian painter" },
  carpenter: { "pt-BR": "Marceneiro brasileiro", en: "Brazilian carpenter" },
  engineer: { "pt-BR": "Engenheiro brasileiro", en: "Brazilian engineer" },
  architect: { "pt-BR": "Arquiteto brasileiro", en: "Brazilian architect" },
  gardener: { "pt-BR": "Jardineiro brasileiro", en: "Brazilian gardener" },
  lawyer: { "pt-BR": "Advogado brasileiro", en: "Brazilian lawyer" },
  lawyer_female: { "pt-BR": "Advogada brasileira", en: "Brazilian lawyer" },
  translator: { "pt-BR": "Tradutor brasileiro", en: "Brazilian translator" },
  translator_female: { "pt-BR": "Tradutora brasileira", en: "Brazilian translator" },
  notary: { "pt-BR": "Not\u00e1rio brasileiro", en: "Brazilian notary" },
  notary_female: { "pt-BR": "Not\u00e1ria brasileira", en: "Brazilian notary" },
  brazilian_store: { "pt-BR": "Produtos brasileiros", en: "Brazilian products" },
  immigration_consultant: { "pt-BR": "Consultoria de imigra\u00e7\u00e3o", en: "Immigration consultant" },
  accountant: { "pt-BR": "Contador brasileiro", en: "Brazilian accountant" },
  accountant_female: { "pt-BR": "Contadora brasileira", en: "Brazilian accountant" },
  financial_advisor: { "pt-BR": "Consultor financeiro brasileiro", en: "Brazilian financial advisor" },
  financial_advisor_female: { "pt-BR": "Consultora financeira brasileira", en: "Brazilian financial advisor" },
  insurance_broker: { "pt-BR": "Corretor de seguros brasileiro", en: "Brazilian insurance broker" },
  insurance_broker_female: { "pt-BR": "Corretora de seguros brasileira", en: "Brazilian insurance broker" },
  remittance: { "pt-BR": "C" + String.fromCharCode(0xE2) + "mbio e remessas", en: "Currency exchange and remittances" },
  tax_preparation: { "pt-BR": "Imposto de renda", en: "Tax preparation" },
  teacher: { "pt-BR": "Professor brasileiro", en: "Brazilian teacher" },
  teacher_female: { "pt-BR": "Professora brasileira", en: "Brazilian teacher" },
  english_teacher: { "pt-BR": "Professor de ingl" + String.fromCharCode(0xEA) + "s brasileiro", en: "Brazilian English teacher" },
  english_teacher_female: { "pt-BR": "Professora de ingl" + String.fromCharCode(0xEA) + "s brasileira", en: "Brazilian English teacher" },
  driving_school: { "pt-BR": "Autoescola brasileira", en: "Brazilian driving school" },
  school: { "pt-BR": "Escola brasileira", en: "Brazilian school" },
  supermarket: { "pt-BR": "Supermercado brasileiro", en: "Brazilian supermarket" },
  retail_market: { "pt-BR": "Mercado brasileiro", en: "Brazilian market" },
  fashion: { "pt-BR": "Moda brasileira", en: "Brazilian fashion" },
  clothing_store: { "pt-BR": "Loja de roupas brasileira", en: "Brazilian clothing store" },
  beauty_store: { "pt-BR": "Produtos de beleza brasileiros", en: "Brazilian beauty products" },
  lingerie: { "pt-BR": "Roupa " + String.fromCharCode(0xED) + "ntima brasileira", en: "Brazilian lingerie" },
  furniture_store: { "pt-BR": "Decora" + String.fromCharCode(0xE7) + String.fromCharCode(0xE3) + "o brasileira", en: "Brazilian home decor" },
  gift_shop: { "pt-BR": "Lembran" + String.fromCharCode(0xE7) + "as brasileiras", en: "Brazilian gifts" },
  moving_company: { "pt-BR": "Empresa de mudan" + String.fromCharCode(0xE7) + "a brasileira", en: "Brazilian moving company" },
  freight_logistics: { "pt-BR": "Frete brasileiro", en: "Brazilian freight service" },
  passenger_transport: { "pt-BR": "Transporte de passageiros", en: "Passenger transportation" },
  van_service: { "pt-BR": "Servi" + String.fromCharCode(0xE7) + "o de van brasileiro", en: "Brazilian van service" },
  cat_boarding: { "pt-BR": "Hospedagem para gatos", en: "Cat boarding" },
  dog_boarding: { "pt-BR": "Hospedagem para c" + String.fromCharCode(0xE3) + "es", en: "Dog boarding" },
  grooming: { "pt-BR": "Banho e tosa brasileiro", en: "Brazilian pet grooming" },
  veterinary: { "pt-BR": "Cl" + String.fromCharCode(0xED) + "nica veterin" + String.fromCharCode(0xE1) + "ria brasileira", en: "Brazilian veterinary clinic" },
  veterinarian: { "pt-BR": "Veterin" + String.fromCharCode(0xE1) + "rio brasileiro", en: "Brazilian veterinarian" },
  pet_training: { "pt-BR": "Adestramento brasileiro", en: "Brazilian pet training" },
  dog_walker: { "pt-BR": "Passeador de c" + String.fromCharCode(0xE3) + "es brasileiro", en: "Brazilian dog walker" },
  pet_shop: { "pt-BR": "Pet Shop brasileiro", en: "Brazilian pet shop" },
  daycare: { "pt-BR": "Creche infantil brasileira", en: "Brazilian daycare" },
  babysitter: { "pt-BR": "Bab" + String.fromCharCode(0xE1) + " brasileira", en: "Brazilian babysitter" },
  elderly_caregiver: { "pt-BR": "Cuidador de idosos brasileiro", en: "Brazilian elderly caregiver" },
  elderly_caregiver_female: { "pt-BR": "Cuidadora de idosos brasileira", en: "Brazilian elderly caregiver" },
  nurse: { "pt-BR": "Enfermeiro brasileiro", en: "Brazilian nurse" },
  nurse_female: { "pt-BR": "Enfermeira brasileira", en: "Brazilian nurse" },
  home_care: { "pt-BR": "Assist" + String.fromCharCode(0xEA) + "ncia domiciliar brasileira", en: "Brazilian home care" },
  diarist: { "pt-BR": "Diarista brasileira", en: "Brazilian cleaner" },
  home_cleaning: { "pt-BR": "Servi" + String.fromCharCode(0xE7) + "o de limpeza residencial brasileiro", en: "Brazilian residential cleaning service" },
  commercial_cleaning: { "pt-BR": "Servi" + String.fromCharCode(0xE7) + "o de limpeza comercial brasileiro", en: "Brazilian commercial cleaning service" },
  real_estate_agency: { "pt-BR": "Imobili" + String.fromCharCode(0xE1) + "ria brasileira", en: "Brazilian real estate agency" },
  realtor: { "pt-BR": "Corretor de im" + String.fromCharCode(0xF3) + "veis brasileiro", en: "Brazilian real estate agent" },
  realtor_female: { "pt-BR": "Corretora de im" + String.fromCharCode(0xF3) + "veis brasileira", en: "Brazilian real estate agent" },
  property_management: { "pt-BR": "Administra" + String.fromCharCode(0xE7) + String.fromCharCode(0xE3) + "o de im" + String.fromCharCode(0xF3) + "veis", en: "Property management" },
  mortgage_broker: { "pt-BR": "Consultoria de financiamento de im" + String.fromCharCode(0xF3) + "veis", en: "Real estate financing consultancy" },
  property_inspection: { "pt-BR": "Vistoria de im" + String.fromCharCode(0xF3) + "veis", en: "Property inspection" },
  sertanejo: { "pt-BR": "Sertanejo brasileiro", en: "Brazilian sertanejo music" },
  rock_band: { "pt-BR": "Banda de Rock brasileira", en: "Brazilian rock band" },
  forro_band: { "pt-BR": "Banda de Forr" + String.fromCharCode(0xF3) + " brasileira", en: "Brazilian forró band" },
  chorinho: { "pt-BR": "Chorinho brasileiro", en: "Brazilian chorinho" },
  samba: { "pt-BR": "Samba brasileiro", en: "Brazilian samba" },
  funk: { "pt-BR": "Funk brasileiro", en: "Brazilian funk" },
  pagode_group: { "pt-BR": "Grupo de pagode brasileiro", en: "Brazilian pagode group" },
  choir: { "pt-BR": "Coro brasileiro", en: "Brazilian choir" },
  photographer: { "pt-BR": "Fot" + String.fromCharCode(0xF3) + "grafo brasileiro", en: "Brazilian photographer" },
  musician: { "pt-BR": "M" + String.fromCharCode(0xFA) + "sico brasileiro", en: "Brazilian musician" },
  music: { "pt-BR": "M" + String.fromCharCode(0xFA) + "sica brasileira", en: "Brazilian music" },
  musicista: { "pt-BR": "Musicista brasileiro", en: "Brazilian music artist" },
  dj: { "pt-BR": "DJ brasileiro", en: "Brazilian DJ" },
  designer: { "pt-BR": "Designer brasileiro", en: "Brazilian designer" },
  performer: { "pt-BR": "Artista para eventos brasileiro", en: "Brazilian event artist" },
  travel_agency: { "pt-BR": "Ag" + String.fromCharCode(0xEA) + "ncia de turismo brasileira", en: "Brazilian tourism agency" },
  tour_guide: { "pt-BR": "Guia de turismo brasileiro", en: "Brazilian tour guide" },
  tours: { "pt-BR": "Passeios e excurs" + String.fromCharCode(0xF5) + "es", en: "Tours and excursions" },
  travel_insurance: { "pt-BR": "Seguro viagem", en: "Travel insurance" },
  accommodation: { "pt-BR": "Hospedagem brasileira", en: "Brazilian accommodation" },
  hotel: { "pt-BR": "Hotel brasileiro", en: "Brazilian hotel" },
};

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function getPrimaryActivityOptions(categoryId: string): readonly PrimaryActivityOption[] {
  const definitions = DEFINITIONS[categoryId] || DEFINITIONS.other;
  const options = definitions.map(([id, label]) => ({ id, label }));
  return [...options, OTHER];
}

export function getPrimaryActivityCustomPlaceholder(categoryId: string): string {
  return PRIMARY_ACTIVITY_CUSTOM_PLACEHOLDERS[categoryId] || PRIMARY_ACTIVITY_CUSTOM_PLACEHOLDERS.other;
}

export function normalizePrimaryActivityCustom(value: unknown): string {
  return normalizeText(value).slice(0, 80);
}

export function isPrimaryActivityValid(categoryId: string, activityId: string, customValue?: string): boolean {
  if (!activityId) return true;
  if (activityId === OTHER_PRIMARY_ACTIVITY_ID) return normalizePrimaryActivityCustom(customValue).length >= 2;
  return getPrimaryActivityOptions(categoryId).some((option) => option.id === activityId) || Object.prototype.hasOwnProperty.call(LEGACY_PRIMARY_ACTIVITY_LABELS, activityId);
}

export function getPrimaryActivityLabel(categoryId: string, activityId?: string, customValue?: string): string {
  if (!activityId) return "";
  if (activityId === OTHER_PRIMARY_ACTIVITY_ID) return normalizePrimaryActivityCustom(customValue);
  return getPrimaryActivityOptions(categoryId).find((option) => option.id === activityId)?.label || LEGACY_PRIMARY_ACTIVITY_LABELS[activityId] || "";
}

export function getPrimaryActivitySeoLabel(
  categoryId: string,
  activityId?: string,
  customValue?: string,
  locale: SeoDescriptorLocale = "pt-BR",
): string {
  const activityLabel = getPrimaryActivityLabel(categoryId, activityId, customValue);
  if (!activityId || !activityLabel) return "";
  return SEO_DESCRIPTOR_OVERRIDES[activityId]?.[locale] || activityLabel;
}
