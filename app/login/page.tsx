'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Lock, Mail, ShieldAlert, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      
      const profileResponse = await fetch(
        `/api/auth/profile?userId=${authData.user.id}`
      )
      const profileJson = await profileResponse.json()
      const profile = profileJson.data
      
      if (profileJson.error) {
        console.error('PROFILE_ERROR:', profileJson.error);
      }

      if (!profile?.is_admin) {
        await supabase.auth.signOut()
        throw new Error('ACCÈS REFUSÉ : Privilèges administrateur requis.')
      }

      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-sansSelection">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-[#111111] border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#4ade80]/5 blur-3xl rounded-full -mr-32 -mt-32" />
          
          <div className="relative z-10 text-center mb-8">
            <div className="w-16 h-16 bg-[#4ade80]/10 border border-[#4ade80]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-[#4ade80]" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-widest uppercase">The Oracle</h1>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">Neural Access Terminal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Email Identifier</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black border border-white/5 rounded-xl py-3 pl-12 pr-4 text-white font-mono text-sm focus:border-[#4ade80]/50 transition-all outline-none"
                  placeholder="admin@neural-system.ai"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Secure Protocol</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-white/5 rounded-xl py-3 pl-12 pr-4 text-white font-mono text-sm focus:border-[#4ade80]/50 transition-all outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3"
              >
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-red-400 font-bold uppercase leading-relaxed tracking-wider">
                  {error}
                </p>
              </motion.div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-black font-black uppercase tracking-widest py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(74,222,128,0.2)] disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Connect System
                  <motion.span
                    animate={{ x: [0, 4, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    →
                  </motion.span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center relative z-10">
            <p className="text-white/20 text-[8px] font-bold uppercase tracking-[0.4em]">
              Encrypted Uplink Established // v2.4.0
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
