import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://sikensiujqlgbbqgesqy.supabase.co";
const SUPABASE_KEY = "sb_publishable_H8JdapG_nvaEkY_gPSboOA_tRHEXX00";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

/** Upload a canvas dataURL to Supabase Storage and return public URL */
export async function uploadDrawing(dataUrl: string, petName: string): Promise<string | null> {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const filename = `${Date.now()}-${petName.replace(/\s+/g, "-").toLowerCase()}.png`;
    const { error } = await supabase.storage
      .from("drawings")
      .upload(filename, blob, { contentType: "image/png", upsert: true });
    if (error) { console.error("Storage upload error:", error); return null; }
    const { data } = supabase.storage.from("drawings").getPublicUrl(filename);
    return data.publicUrl;
  } catch (e) {
    console.error("uploadDrawing failed:", e);
    return null;
  }
}

/** Insert a pet profile and return the created row */
export async function savePet(pet: {
  name:        string;
  animal_type: AnimalType;
  owner_name:  string;
  drawing_url: string | null;
  melody_json: unknown | null;
}): Promise<Pet | null> {
  try {
    const { data, error } = await supabase
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

/** Fetch all pets, newest first */
export async function fetchPets(): Promise<Pet[]> {
  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) { console.error("fetchPets error:", error); return []; }
  return (data ?? []) as Pet[];
}
