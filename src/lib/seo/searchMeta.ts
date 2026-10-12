export type SearchSeoInput = {
  categoryLabel?: string;
  city?: string;
  query?: string;
};

const CATEGORY_SEO_TEXT: Record<string, string> = {
  "Restaurantes e Alimentação": "restaurantes, padarias e cafés",
  "Alimentação (Restaurantes, Padarias, Cafés)": "restaurantes, padarias e cafés",
  "Serviços Automotivos": "oficinas e serviços automotivos",
  "Saúde & Beleza": "serviços de saúde e beleza",
  "Construção & Reformas": "serviços de construção e reformas",
  "Advocacia & Consultoria": "advocacia, traduções e consultoria de imigração",
  "Contabilidade & Finanças": "contabilidade e finanças",
  "Educação & Idiomas": "educação e idiomas",
  "Tecnologia & TI": "tecnologia e TI",
  "Comércio & Varejo": "comércio e varejo",
  "Transporte & Mudança": "transporte e mudança",
  "Serviços para Pets": "serviços para pets",
  "Cuidados Infantis e de Idosos": "cuidados infantis e de idosos",
  Diaristas: "diaristas e serviços de limpeza",
  Imobiliária: "imobiliárias e corretores",
  "Turismo & Viagens": "turismo e viagens",
  Outros: "serviços diversos",
};

export function buildSearchSeoMeta({ categoryLabel = "", city = "", query = "" }: SearchSeoInput) {
  const cityText = city ? ` em ${city}` : "";
  const categoryText = categoryLabel
    ? CATEGORY_SEO_TEXT[categoryLabel] || categoryLabel.toLowerCase()
    : "negócios e serviços";
  const queryPart = query ? ` para ${query}` : "";

  return {
    title: `Buscar negócios brasileiros${cityText} | Caramelinho.com`,
    description: `Encontre ${categoryText}${cityText}${queryPart}. Compare opções perto de você e fale direto com os negócios.`,
  };
}
