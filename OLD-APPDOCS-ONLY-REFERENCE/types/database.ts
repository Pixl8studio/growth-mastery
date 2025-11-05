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
            [_ in never]: never;
        };
    };
}
