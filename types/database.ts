/**
 * Database Types
 * Auto-generated types from Supabase
 * Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
 */

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export interface Database {
    public: {
        Tables: {
            referral_codes: {
                Row: {
                    id: string;
                    code: string;
                    description: string | null;
                    is_active: boolean;
                    max_uses: number | null;
                    current_uses: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    code: string;
                    description?: string | null;
                    is_active?: boolean;
                    max_uses?: number | null;
                    current_uses?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    code?: string;
                    description?: string | null;
                    is_active?: boolean;
                    max_uses?: number | null;
                    current_uses?: number;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            funnel_projects: {
                Row: {
                    id: string;
                    user_id: string;
                    user_email: string;
                    name: string;
                    slug: string;
                    description: string | null;
                    target_audience: string | null;
                    business_niche: string | null;
                    status: string;
                    current_step: number;
                    settings: Json;
                    metadata: Json;
                    created_at: string;
                    updated_at: string;
                    deleted_at: string | null;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    user_email: string;
                    name: string;
                    slug: string;
                    description?: string | null;
                    target_audience?: string | null;
                    business_niche?: string | null;
                    status?: string;
                    current_step?: number;
                    settings?: Json;
                    metadata?: Json;
                    created_at?: string;
                    updated_at?: string;
                    deleted_at?: string | null;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    user_email?: string;
                    name?: string;
                    slug?: string;
                    description?: string | null;
                    target_audience?: string | null;
                    business_niche?: string | null;
                    status?: string;
                    current_step?: number;
                    settings?: Json;
                    metadata?: Json;
                    created_at?: string;
                    updated_at?: string;
                    deleted_at?: string | null;
                };
            };
            page_media: {
                Row: {
                    id: string;
                    funnel_project_id: string;
                    page_id: string | null;
                    user_id: string;
                    media_type: "uploaded_image" | "ai_generated_image" | "pitch_video";
                    storage_path: string;
                    public_url: string;
                    prompt: string | null;
                    metadata: Json;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    funnel_project_id: string;
                    page_id?: string | null;
                    user_id: string;
                    media_type: "uploaded_image" | "ai_generated_image" | "pitch_video";
                    storage_path: string;
                    public_url: string;
                    prompt?: string | null;
                    metadata?: Json;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    funnel_project_id?: string;
                    page_id?: string | null;
                    user_id?: string;
                    media_type?:
                        | "uploaded_image"
                        | "ai_generated_image"
                        | "pitch_video";
                    storage_path?: string;
                    public_url?: string;
                    prompt?: string | null;
                    metadata?: Json;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            // Add your tables here as you create them in Supabase
            // Example:
            // users: {
            //   Row: {
            //     id: string
            //     email: string
            //     created_at: string
            //   }
            //   Insert: {
            //     id?: string
            //     email: string
            //     created_at?: string
            //   }
            //   Update: {
            //     id?: string
            //     email?: string
            //     created_at?: string
            //   }
            // }
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            [_ in never]: never;
        };
        Enums: {
            page_media_type: "uploaded_image" | "ai_generated_image" | "pitch_video";
        };
    };
}
