import fs from "node:fs";

const files = [
  "src/pages/UserProfile.tsx",
  "src/pages/BusinessPage.tsx",
  "src/pages/SearchResults.tsx",
  "src/pages/Home.tsx",
  "src/components/AddressAutocomplete.tsx",
];

const replacements = [
  ["?", "á"], ["?", "à"], ["?", "â"], ["?", "ã"], ["?", "ä"],
  ["?", "é"], ["?", "è"], ["?", "ê"], ["?", "ë"],
  ["?", "í"], ["?", "ì"], ["?", "î"], ["?", "ï"],
  ["?", "ó"], ["?", "ò"], ["?", "ô"], ["?", "õ"], ["?", "ö"],
  ["?", "ú"], ["?", "ù"], ["?", "û"], ["?", "ü"],
  ["?", "Á"], ["Ã€", "À"], ["Ã‚", "Â"], ["Ãƒ", "Ã"], ["Ã„", "Ä"],
  ["Ã‰", "É"], ["Ãˆ", "È"], ["ÃŠ", "Ê"], ["Ã‹", "Ë"],
  ["?", "Í"], ["ÃŒ", "Ì"], ["ÃŽ", "Î"], ["Ã", "Ï"],
  ["Ã“", "Ó"], ["Ã’", "Ò"], ["Ã”", "Ô"], ["Ã•", "Õ"], ["Ã–", "Ö"],
  ["Ãš", "Ú"], ["Ã™", "Ù"], ["Ã›", "Û"], ["Ãœ", "Ü"],
  ["?", "ç"], ["Ã‡", "Ç"],
  ["Âº", "º"], ["Âª", "ª"], ["Â·", "·"], ["Â", ""],
  ["?", "\""], ["?", "\""], ["?", "'"], ["?", "'"], ["?", "-"], ["?", "-"], ["â€¦", "..."],
  ["ðŸ½ï¸", "🍽️"], ["ðŸ› ï¸", "🛠️"],
  ["Sin?nimos", "Sinônimos"], ["v?rgula", "vírgula"], ["jur?dico", "jurídico"], ["imigra??o", "imigração"], ["tradu??o", "tradução"],
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, "utf8");
  let next = content;
  for (const [from, to] of replacements) {
    next = next.split(from).join(to);
  }
  if (next !== content) {
    fs.writeFileSync(file, next, "utf8");
    console.log(`fixed: ${file}`);
  }
}
