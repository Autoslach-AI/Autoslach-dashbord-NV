import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { type NextRequest, type NextResponse } from "next/server";

let browserClient: any = null;

export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !url.startsWith('http')) {
    if (browserClient && browserClient.__isMock) return browserClient;

    const isLocked = typeof window !== 'undefined' ? localStorage.getItem('lumia_hub_locked') === 'true' : false;
    const mockUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('lumia_mock_user') || 'null') : null;
    
    const mockResponse = { data: [], error: null };
    const mockSingleResponse = { data: null, error: null };
    const mockAuthResponse = { data: { user: mockUser, session: mockUser ? { user: mockUser } : null }, error: null };
    
    const createMockQuery = (isSingle = false) => {
      const query: any = {
        then: (onfulfilled: any) => Promise.resolve(isSingle ? mockSingleResponse : mockResponse).then(onfulfilled),
        select: () => createMockQuery(false),
        eq: () => createMockQuery(false),
        order: () => createMockQuery(false),
        single: () => createMockQuery(true),
        insert: () => createMockQuery(true),
        update: () => createMockQuery(true),
        upsert: () => createMockQuery(true),
        delete: () => createMockQuery(true),
        limit: () => createMockQuery(false)
      };
      return query;
    };

    browserClient = {
      __isMock: true,
      from: (table: string) => {
        if (table === 'company_profile' || table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: { is_admin: true, name: 'Maître' }, error: null })
              }),
              single: () => Promise.resolve({ data: { is_admin: true, name: 'Maître' }, error: null })
            })
          };
        }
        return createMockQuery();
      },
      auth: {
        getSession: () => Promise.resolve(mockAuthResponse),
        getSessionFromServer: () => Promise.resolve(mockAuthResponse),
        getUser: () => Promise.resolve({ data: { user: mockUser }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: () => {
          if (typeof window !== 'undefined') localStorage.removeItem('lumia_mock_user');
          return Promise.resolve({ error: null });
        },
        signInWithPassword: ({ email }: { email: string }) => {
          const user = { email, id: 'mock-uid' };
          if (typeof window !== 'undefined') localStorage.setItem('lumia_mock_user', JSON.stringify(user));
          return Promise.resolve({ data: { user, session: { user } }, error: null });
        },
        signUp: ({ email }: { email: string }) => {
          const user = { email, id: 'mock-uid' };
          if (typeof window !== 'undefined') localStorage.setItem('lumia_mock_user', JSON.stringify(user));
          return Promise.resolve({ data: { user, session: { user } }, error: null });
        },
        resetPasswordForEmail: () => Promise.resolve({ error: null }),
        updateUser: () => Promise.resolve(mockAuthResponse),
      },
      storage: {
        from: () => ({
          upload: () => Promise.resolve(mockResponse),
          getPublicUrl: () => ({ data: { publicUrl: '' } }),
        })
      }
    } as any;
    
    return browserClient;
  }

  if (!browserClient || browserClient.__isMock) {
    browserClient = createBrowserClient(url, key!);
  }
  
  return browserClient;
};

export function createServerSupabase(request: NextRequest, response: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !url.startsWith('http')) {
    return null as any;
  }

  return createServerClient(
    url,
    key!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  );
}
