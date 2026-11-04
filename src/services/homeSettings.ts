import { supabase } from "@/lib/supabase";

const FEATURED_BUSINESSES_VISIBILITY_KEY = "home_featured_businesses_visible";
const HOME_SETTINGS_CACHE_TTL_MS = 60 * 1000;
let visibilityCache: { value: boolean; expiresAt: number } | null = null;
let visibilityRequest: Promise<boolean> | null = null;

export async function isHomeFeaturedBusinessesVisible(): Promise<boolean> {
  if (visibilityCache && visibilityCache.expiresAt > Date.now()) return visibilityCache.value;
  if (visibilityRequest) return visibilityRequest;

  visibilityRequest = (async () => {
    try {
      const { data, error } = await supabase
        .from("search_settings")
        .select("value")
        .eq("key", FEATURED_BUSINESSES_VISIBILITY_KEY)
        .maybeSingle();

      const value = error || !data ? true : data.value !== false && data.value !== "false";
      if (!error) visibilityCache = { value, expiresAt: Date.now() + HOME_SETTINGS_CACHE_TTL_MS };
      return value;
    } catch {
      return true;
    }
  })().finally(() => {
    visibilityRequest = null;
  });
  return visibilityRequest;
}

export async function saveHomeFeaturedBusinessesVisibility(visible: boolean): Promise<boolean> {
  try {
    const { error } = await supabase.from("search_settings").upsert(
      {
        key: FEATURED_BUSINESSES_VISIBILITY_KEY,
        value: visible,
      },
      { onConflict: "key" },
    );

    if (error) {
      console.error("[homeSettings] Failed to save featured businesses visibility:", error.message);
      return false;
    }
    visibilityCache = { value: visible, expiresAt: Date.now() + HOME_SETTINGS_CACHE_TTL_MS };
    return true;
  } catch (error) {
    console.error("[homeSettings] Failed to save featured businesses visibility:", error);
    return false;
  }
}
