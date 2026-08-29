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

const ENGLISH_PRIMARY_ACTIVITY_LABELS: Record<string, string> = {
  restaurant: "Restaurant", pizzeria: "Pizzeria", churrascaria: "Steakhouse", bakery: "Bakery", confectionery: "Confectionery", bar: "Bar", snack_bar: "Snack bar", food_truck: "Food truck", buffet: "Buffet", cafe: "Cafe",
  mechanic: "Auto repair shop", body_shop: "Auto body and paint shop", tires: "Tire shop", auto_electric: "Auto electrical service", car_wash: "Car wash", towing: "Towing service", dealership: "Car dealership", car_dealership: "Used car dealer", automotive_center: "Automotive center", paintless_dent_repair: "Paintless dent repair",
  medical_clinic: "Medical clinic", doctor: "Doctor", doctor_female: "Doctor", pediatrician: "Pediatrician", dentist: "Dentist", depilation: "Hair removal", manicure: "Manicurist", physiotherapy: "Physiotherapist", psychology: "Psychologist", psychologist_female: "Psychologist", nutrition: "Nutritionist", hairdresser: "Hairdresser", hairdresser_female: "Hairdresser", beauty_salon: "Beauty salon", barbershop: "Barbershop", aesthetics: "Aesthetics", personal_trainer: "Personal trainer",
  construction_company: "Construction company", general_contractor: "General contractor", electrician: "Electrician", plumber: "Plumber", painter: "Painter", carpenter: "Carpenter", engineer: "Engineer", architect: "Architect", gardener: "Gardener",
  lawyer: "Lawyer", lawyer_female: "Lawyer", translator: "Translator", translator_female: "Translator", notary: "Notary", notary_female: "Notary", immigration_consultant: "Immigration consulting",
  accountant: "Accountant", accountant_female: "Accountant", financial_advisor: "Financial advisor", financial_advisor_female: "Financial advisor", insurance_broker: "Insurance broker", insurance_broker_female: "Insurance broker", remittance: "Currency exchange and remittances", tax_preparation: "Income tax services",
  teacher: "Teacher", teacher_female: "Teacher", english_teacher: "English teacher", english_teacher_female: "English teacher", driving_school: "Driving school", school: "School",
  supermarket: "Supermarket", retail_market: "Grocery store", brazilian_store: "Brazilian products store", fashion: "Fashion store", clothing_store: "Clothing store", beauty_store: "Beauty products store", lingerie: "Lingerie store", furniture_store: "Home decor store", gift_shop: "Gift shop",
  moving_company: "Moving company", freight_logistics: "Freight service", passenger_transport: "Passenger transport", van_service: "Van service",
  cat_boarding: "Cat boarding", dog_boarding: "Dog boarding", grooming: "Pet grooming", veterinary: "Veterinary clinic", veterinarian: "Veterinarian", pet_training: "Pet training", dog_walker: "Dog walker", pet_shop: "Pet shop",
  daycare: "Daycare", babysitter: "Babysitter", elderly_caregiver: "Elderly caregiver", elderly_caregiver_female: "Elderly caregiver", nurse: "Nurse", nurse_female: "Nurse", home_care: "Home care",
  diarist: "House cleaner", home_cleaning: "Residential cleaning", commercial_cleaning: "Commercial cleaning",
  real_estate_agency: "Real estate agency", realtor: "Real estate agent", realtor_female: "Real estate agent", property_management: "Property management", mortgage_broker: "Mortgage consulting", property_inspection: "Property inspection",
  travel_agency: "Travel agency", tour_guide: "Tour guide", tours: "Tours and excursions", travel_insurance: "Travel insurance", accommodation: "Accommodation", hotel: "Hotel",
  rock_band: "Rock band", forro_band: "Forro band", chorinho: "Choro music", samba: "Samba", funk: "Funk", pagode_group: "Pagode group", sertanejo: "Sertanejo", choir: "Choir", musician: "Musician", music: "Music", musicista: "Musician", dj: "DJ", photographer: "Photographer", painter: "Painter", performer: "Event performer",
  community_organization: "Community organization", religious_organization: "Religious organization", technology_services: "Technology services", nonprofit: "Nonprofit organization", local_services: "Local services",
  catering: "Catering", detailing: "Auto detailing", architect_engineer: "Architecture and engineering", renovation: "Renovations", document_services: "Document services", business_consultant: "Business consulting", bookkeeping: "Bookkeeping", language_school: "Language school", private_tutor: "Private tutoring", professional_courses: "Professional courses", music_school: "Music school", online_store: "Online store", courier: "Courier service", car_rental: "Car rental", storage: "Storage", pet_hotel: "Pet hotel", pet_daycare: "Pet daycare", special_needs_support: "Special needs support", post_construction: "Post-construction cleaning", airbnb_cleaning: "Airbnb cleaning", upholstery_cleaning: "Upholstery cleaning", organizing: "Home organizing", property_rental: "Property rental", videographer: "Videographer", illustrator: "Illustrator", designer: "Designer",
};

const ENGLISH_SEO_DESCRIPTOR_EXCEPTIONS = new Set([
  "churrascaria", "brazilian_store", "immigration_consultant", "remittance", "tax_preparation", "passenger_transport", "cat_boarding", "dog_boarding", "property_management", "mortgage_broker", "property_inspection", "tours", "travel_insurance",
]);

type SeoDescriptorOverride = Partial<Record<SeoDescriptorLocale, string>>;

const SEO_DESCRIPTOR_OVERRIDES: Record<string, SeoDescriptorOverride> = {
  restaurant: { "pt-BR": "Restaurante brasileiro" },
  pizzeria: { "pt-BR": "Pizzaria brasileira" },
  churrascaria: { "pt-BR": "Churrascaria brasileira" },
  bakery: { "pt-BR": "Padaria brasileira" },
  cafe: { "pt-BR": "Caf\u00e9 brasileiro" },
  confectionery: { "pt-BR": "Confeitaria brasileira" },
  market: { "pt-BR": "Mercado brasileiro" },
  buffet: { "pt-BR": "Buffet brasileiro" },
  bar: { "pt-BR": "Bar brasileiro" },
  snack_bar: { "pt-BR": "Lanchonete brasileira" },
  food_truck: { "pt-BR": "Food Truck brasileiro" },
  catering: { "pt-BR": "Catering brasileiro" },
  medical_clinic: { "pt-BR": "Cl\u00ednica brasileira" },
  doctor: { "pt-BR": "M\u00e9dico brasileiro" },
  doctor_female: { "pt-BR": "M\u00e9dica brasileira" },
  pediatrician: { "pt-BR": "Pediatra brasileiro" },
  dentist: { "pt-BR": "Dentista brasileiro" },
  depilation: { "pt-BR": "Depila\u00e7\u00e3o brasileira" },
  manicure: { "pt-BR": "Manicure brasileira" },
  physiotherapy: { "pt-BR": "Fisioterapeuta brasileiro" },
  psychology: { "pt-BR": "Psic\u00f3logo brasileiro" },
  psychologist_female: { "pt-BR": "Psic\u00f3loga brasileira" },
  nutrition: { "pt-BR": "Nutricionista brasileiro" },
  hairdresser: { "pt-BR": "Cabeleireiro brasileiro" },
  hairdresser_female: { "pt-BR": "Cabeleireira brasileira" },
  beauty_salon: { "pt-BR": "Sal\u00e3o de beleza brasileiro" },
  barbershop: { "pt-BR": "Barbearia brasileira" },
  aesthetics: { "pt-BR": "Est\u00e9tica brasileira" },
  personal_trainer: { "pt-BR": "Personal trainer brasileiro" },
  mechanic: { "pt-BR": "Oficina mec\u00e2nica brasileira" },
  body_shop: { "pt-BR": "Funilaria e pintura brasileira" },
  tires: { "pt-BR": "Borracharia brasileira" },
  auto_electric: { "pt-BR": "Autoel\u00e9trica brasileira" },
  car_wash: { "pt-BR": "Lava Car brasileiro" },
  towing: { "pt-BR": "Guincho brasileiro" },
  dealership: { "pt-BR": "Concession\u00e1ria brasileira" },
  car_dealership: { "pt-BR": "Revenda de carros brasileira" },
  automotive_center: { "pt-BR": "Centro automotivo brasileiro" },
  paintless_dent_repair: { "pt-BR": "Martelinho de ouro brasileiro" },
  detailing: { "pt-BR": "Est\u00e9tica automotiva brasileira" },
  construction_company: { "pt-BR": "Construtora brasileira" },
  general_contractor: { "pt-BR": "Empreiteiro brasileiro" },
  electrician: { "pt-BR": "Eletricista brasileiro" },
  plumber: { "pt-BR": "Encanador brasileiro" },
  painter: { "pt-BR": "Pintor brasileiro" },
  carpenter: { "pt-BR": "Marceneiro brasileiro" },
  engineer: { "pt-BR": "Engenheiro brasileiro" },
  architect: { "pt-BR": "Arquiteto brasileiro" },
  gardener: { "pt-BR": "Jardineiro brasileiro" },
  lawyer: { "pt-BR": "Advogado brasileiro" },
  lawyer_female: { "pt-BR": "Advogada brasileira" },
  translator: { "pt-BR": "Tradutor brasileiro" },
  translator_female: { "pt-BR": "Tradutora brasileira" },
  notary: { "pt-BR": "Not\u00e1rio brasileiro" },
  notary_female: { "pt-BR": "Not\u00e1ria brasileira" },
  brazilian_store: { "pt-BR": "Produtos brasileiros" },
  immigration_consultant: { "pt-BR": "Consultoria de imigra\u00e7\u00e3o" },
  accountant: { "pt-BR": "Contador brasileiro" },
  accountant_female: { "pt-BR": "Contadora brasileira" },
  financial_advisor: { "pt-BR": "Consultor financeiro brasileiro" },
  financial_advisor_female: { "pt-BR": "Consultora financeira brasileira" },
  insurance_broker: { "pt-BR": "Corretor de seguros brasileiro" },
  insurance_broker_female: { "pt-BR": "Corretora de seguros brasileira" },
  remittance: { "pt-BR": "C" + String.fromCharCode(0xE2) + "mbio e remessas" },
  tax_preparation: { "pt-BR": "Imposto de renda" },
  teacher: { "pt-BR": "Professor brasileiro" },
  teacher_female: { "pt-BR": "Professora brasileira" },
  english_teacher: { "pt-BR": "Professor de ingl" + String.fromCharCode(0xEA) + "s brasileiro" },
  english_teacher_female: { "pt-BR": "Professora de ingl" + String.fromCharCode(0xEA) + "s brasileira" },
  driving_school: { "pt-BR": "Autoescola brasileira" },
  school: { "pt-BR": "Escola brasileira" },
  supermarket: { "pt-BR": "Supermercado brasileiro" },
  retail_market: { "pt-BR": "Mercado brasileiro" },
  fashion: { "pt-BR": "Moda brasileira" },
  clothing_store: { "pt-BR": "Loja de roupas brasileira" },
  beauty_store: { "pt-BR": "Produtos de beleza brasileiros" },
  lingerie: { "pt-BR": "Roupa " + String.fromCharCode(0xED) + "ntima brasileira" },
  furniture_store: { "pt-BR": "Decora" + String.fromCharCode(0xE7) + String.fromCharCode(0xE3) + "o brasileira" },
  gift_shop: { "pt-BR": "Lembran" + String.fromCharCode(0xE7) + "as brasileiras" },
  moving_company: { "pt-BR": "Empresa de mudan" + String.fromCharCode(0xE7) + "a brasileira" },
  freight_logistics: { "pt-BR": "Frete brasileiro" },
  passenger_transport: { "pt-BR": "Transporte de passageiros" },
  van_service: { "pt-BR": "Servi" + String.fromCharCode(0xE7) + "o de van brasileiro" },
  cat_boarding: { "pt-BR": "Hospedagem para gatos" },
  dog_boarding: { "pt-BR": "Hospedagem para c" + String.fromCharCode(0xE3) + "es" },
  grooming: { "pt-BR": "Banho e tosa brasileiro" },
  veterinary: { "pt-BR": "Cl" + String.fromCharCode(0xED) + "nica veterin" + String.fromCharCode(0xE1) + "ria brasileira" },
  veterinarian: { "pt-BR": "Veterin" + String.fromCharCode(0xE1) + "rio brasileiro" },
  pet_training: { "pt-BR": "Adestramento brasileiro" },
  dog_walker: { "pt-BR": "Passeador de c" + String.fromCharCode(0xE3) + "es brasileiro" },
  pet_shop: { "pt-BR": "Pet Shop brasileiro" },
  daycare: { "pt-BR": "Creche infantil brasileira" },
  babysitter: { "pt-BR": "Bab" + String.fromCharCode(0xE1) + " brasileira" },
  elderly_caregiver: { "pt-BR": "Cuidador de idosos brasileiro" },
  elderly_caregiver_female: { "pt-BR": "Cuidadora de idosos brasileira" },
  nurse: { "pt-BR": "Enfermeiro brasileiro" },
  nurse_female: { "pt-BR": "Enfermeira brasileira" },
  home_care: { "pt-BR": "Assist" + String.fromCharCode(0xEA) + "ncia domiciliar brasileira" },
  diarist: { "pt-BR": "Diarista brasileira" },
  home_cleaning: { "pt-BR": "Servi" + String.fromCharCode(0xE7) + "o de limpeza residencial brasileiro" },
  commercial_cleaning: { "pt-BR": "Servi" + String.fromCharCode(0xE7) + "o de limpeza comercial brasileiro" },
  real_estate_agency: { "pt-BR": "Imobili" + String.fromCharCode(0xE1) + "ria brasileira" },
  realtor: { "pt-BR": "Corretor de im" + String.fromCharCode(0xF3) + "veis brasileiro" },
  realtor_female: { "pt-BR": "Corretora de im" + String.fromCharCode(0xF3) + "veis brasileira" },
  property_management: { "pt-BR": "Administra" + String.fromCharCode(0xE7) + String.fromCharCode(0xE3) + "o de im" + String.fromCharCode(0xF3) + "veis" },
  mortgage_broker: { "pt-BR": "Consultoria de financiamento de im" + String.fromCharCode(0xF3) + "veis" },
  property_inspection: { "pt-BR": "Vistoria de im" + String.fromCharCode(0xF3) + "veis" },
  sertanejo: { "pt-BR": "Sertanejo brasileiro" },
  rock_band: { "pt-BR": "Banda de Rock brasileira" },
  forro_band: { "pt-BR": "Banda de Forr" + String.fromCharCode(0xF3) + " brasileira" },
  chorinho: { "pt-BR": "Chorinho brasileiro" },
  samba: { "pt-BR": "Samba brasileiro" },
  funk: { "pt-BR": "Funk brasileiro" },
  pagode_group: { "pt-BR": "Grupo de pagode brasileiro" },
  choir: { "pt-BR": "Coro brasileiro" },
  photographer: { "pt-BR": "Fot" + String.fromCharCode(0xF3) + "grafo brasileiro" },
  musician: { "pt-BR": "M" + String.fromCharCode(0xFA) + "sico brasileiro" },
  music: { "pt-BR": "M" + String.fromCharCode(0xFA) + "sica brasileira" },
  musicista: { "pt-BR": "Musicista brasileiro" },
  dj: { "pt-BR": "DJ brasileiro" },
  designer: { "pt-BR": "Designer brasileiro" },
  performer: { "pt-BR": "Artista para eventos brasileiro" },
  travel_agency: { "pt-BR": "Ag" + String.fromCharCode(0xEA) + "ncia de turismo brasileira" },
  tour_guide: { "pt-BR": "Guia de turismo brasileiro" },
  tours: { "pt-BR": "Passeios e excurs" + String.fromCharCode(0xF5) + "es" },
  travel_insurance: { "pt-BR": "Seguro viagem" },
  accommodation: { "pt-BR": "Hospedagem brasileira" },
  hotel: { "pt-BR": "Hotel brasileiro" },
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

export function getPrimaryActivityLabel(
  categoryId: string,
  activityId?: string,
  customValue?: string,
  locale: SeoDescriptorLocale = "pt-BR",
): string {
  if (!activityId) return "";
  if (activityId === OTHER_PRIMARY_ACTIVITY_ID) {
    return locale === "en" ? "" : normalizePrimaryActivityCustom(customValue);
  }
  if (locale === "en") {
    return ENGLISH_PRIMARY_ACTIVITY_LABELS[activityId] || activityId.replace(/_/g, " ");
  }
  return getPrimaryActivityOptions(categoryId).find((option) => option.id === activityId)?.label || LEGACY_PRIMARY_ACTIVITY_LABELS[activityId] || "";
}

export function getPrimaryActivitySeoLabel(
  categoryId: string,
  activityId?: string,
  customValue?: string,
  locale: SeoDescriptorLocale = "pt-BR",
): string {
  const activityLabel = getPrimaryActivityLabel(categoryId, activityId, customValue, locale);
  if (!activityId || !activityLabel) return "";
  if (locale === "en") {
    return ENGLISH_SEO_DESCRIPTOR_EXCEPTIONS.has(activityId) ? activityLabel : `Brazilian ${activityLabel.toLowerCase()}`;
  }
  return SEO_DESCRIPTOR_OVERRIDES[activityId]?.[locale] || activityLabel;
}
