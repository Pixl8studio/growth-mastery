/**
 * Supabase Types
 * Helper types for Supabase client with database types
 */

import { type SupabaseClient } from "@supabase/supabase-js";
import { type Database } from "./database";

export type TypedSupabaseClient = SupabaseClient<Database>;

// Helper type to extract table row types
export type Tables<T extends keyof Database["public"]["Tables"]> =
    Database["public"]["Tables"][T]["Row"];

// Helper type to extract table insert types
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
    Database["public"]["Tables"][T]["Insert"];

// Helper type to extract table update types
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
    Database["public"]["Tables"][T]["Update"];
