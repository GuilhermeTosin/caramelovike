import { supabase } from "@/lib/supabase";

const FEATURED_BUSINESSES_VISIBILITY_KEY = "home_featured_businesses_visible";

export async function isHomeFeaturedBusinessesVisible(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("search_settings")
      .select("value")
      .eq("key", FEATURED_BUSINESSES_VISIBILITY_KEY)
      .maybeSingle();

    if (error || !data) return true;
    return data.value !== false && data.value !== "false";
  } catch {
    return true;
  }
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
    return true;
  } catch (error) {
    console.error("[homeSettings] Failed to save featured businesses visibility:", error);
    return false;
  }
}
