"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

interface UserProfile {
  id: string;
  full_name?: string;
  email?: string;
  phone_number?: string;
  location?: string;
  interests?: string[];
  is_admin: boolean;
  onboarded: boolean; // Virtual field for UI state
  created_at?: string;
}

interface UserContextType {
  user: any;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isSupabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://offline.supabase.co';

    if (!isSupabaseConfigured) {
      // Inject Mock Admin Session for Preview Mode
      const mockUser = {
        id: 'mock-admin-id',
        email: 'autoslachai@gmail.com',
        user_metadata: { full_name: 'Sentinel Admin' }
      };
      setUser(mockUser);
      setProfile({
        id: 'mock-admin-id',
        full_name: 'Sentinel Admin',
        email: 'autoslachai@gmail.com',
        is_admin: true,
        onboarded: true
      });
      setLoading(false);
      return;
    }

    // Check active sessions
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
    } else if (data) {
      setProfile({
        ...data,
        onboarded: !!(data.phone_number && data.location && (data.interests?.length ?? 0) > 0)
      });
    } else {
      // Create default profile if not exists
      const defaultProfile: UserProfile = { 
        id: userId, 
        is_admin: false, 
        interests: [], 
        onboarded: false 
      };
      setProfile(defaultProfile);
    }
    setLoading(false);
  };

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    
    // Remote 'onboarded' as it's a virtual field
    const { onboarded: _, ...dbUpdates } = updates as any;
    
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...dbUpdates });
    
    if (!error) {
      const newProfile = { ...(profile as UserProfile), ...updates };
      setProfile({
        ...newProfile,
        onboarded: !!(newProfile.phone_number && newProfile.location && (newProfile.interests?.length ?? 0) > 0)
      });
    }
    else console.error('Update profile error:', error);
  };

  return (
    <UserContext.Provider value={{ user, profile, loading, signIn, signOut, updateProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
};
