import { createClient } from '@supabase/supabase-js';

// NEURAL UPLINK : SUPABASE CONNECTION NODE
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const getSupabase = () => {
  if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
    console.warn("NEURAL_UPLINK_OFFLINE: Missing NEXT_PUBLIC_SUPABASE_URL. Operating in Local Safeguard Mode.");
    
    // Return a Mock Client that doesn't trigger network requests
    return {
      from: () => ({
        select: () => ({
          limit: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
          eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
          order: () => Promise.resolve({ data: null, error: null }),
          single: () => Promise.resolve({ data: null, error: null }),
        }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        delete: () => ({ lt: () => Promise.resolve({ data: null, error: null }) }),
        upsert: () => Promise.resolve({ data: null, error: null }),
      }),
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithOAuth: () => Promise.resolve({ error: null }),
        signOut: () => Promise.resolve({ error: null }),
      }
    } as any;
  }
  return createClient(supabaseUrl, supabaseAnonKey!);
};

export const supabase = getSupabase();
