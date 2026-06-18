// Supabase client — loaded only at runtime, safe to tree-shake if missing
let _supabase: import("@supabase/supabase-js").SupabaseClient | null = null;

const SUPABASE_URL = "https://sikensiujqlgbbqgesqy.supabase.co";
const SUPABASE_KEY = "sb_publishable_H8JdapG_nvaEkY_gPSboOA_tRHEXX00";

async function getClient() {
  if (_supabase) return _supabase;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch {
    console.warn("Supabase not available — running offline");
  }
  return _supabase;
}

export type AnimalType = "cat" | "dog" | "bird" | "frog" | "rabbit" | "hamster";

export interface Pet {
  id:          string;
  name:        string;
  animal_type: AnimalType;
  owner_name:  string;
  drawing_url: string | null;
  melody_json: unknown | null;
  created_at:  string;
}

export async function uploadDrawing(dataUrl: string, petName: string): Promise<string | null> {
  try {
    const sb = await getClient();
    if (!sb) return null;
    const blob = await (await fetch(dataUrl)).blob();
    const filename = `${Date.now()}-${petName.replace(/\s+/g, "-").toLowerCase()}.png`;
    const { error } = await sb.storage
      .from("drawings")
      .upload(filename, blob, { contentType: "image/png", upsert: true });
    if (error) { console.error("Storage upload error:", error); return null; }
    const { data } = sb.storage.from("drawings").getPublicUrl(filename);
    return data.publicUrl;
  } catch (e) {
    console.error("uploadDrawing failed:", e);
    return null;
  }
}

export async function savePet(pet: {
  name:        string;
  animal_type: AnimalType;
  owner_name:  string;
  drawing_url: string | null;
  melody_json: unknown | null;
}): Promise<Pet | null> {
  try {
    const sb = await getClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from("pets")
      .insert([pet])
      .select()
      .single();
    if (error) { console.error("savePet error:", error); return null; }
    return data as Pet;
  } catch (e) {
    console.error("savePet failed:", e);
    return null;
  }
}

export async function fetchPets(): Promise<Pet[]> {
  try {
    const sb = await getClient();
    if (!sb) return [];
    const { data, error } = await sb
      .from("pets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) { console.error("fetchPets error:", error); return []; }
    return (data ?? []) as Pet[];
  } catch {
    return [];
  }
}
