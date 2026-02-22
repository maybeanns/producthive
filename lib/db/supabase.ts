/**
 * Supabase Client — Server-side singleton
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

/**
 * Get the server-side Supabase client (uses service role key)
 */
export function getSupabaseClient(): SupabaseClient {
    if (!supabaseClient) {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!url || !key) {
            throw new Error(
                'Supabase configuration missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
            );
        }

        supabaseClient = createClient(url, key, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }
    return supabaseClient;
}
