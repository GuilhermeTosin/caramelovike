const SCRIPT_UNSAFE_CHARACTERS: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

export function serializeJsonForHtmlScript(value: unknown): string {
  return (JSON.stringify(value) ?? "null").replace(
    /[<>&\u2028\u2029]/g,
    (character) => SCRIPT_UNSAFE_CHARACTERS[character],
  );
}
