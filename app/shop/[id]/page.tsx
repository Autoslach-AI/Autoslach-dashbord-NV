"use client";

import { useEffect, useState, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { 
  ArrowLeft, 
  ShoppingBag, 
  Plus, 
  ChevronRight,
  Cpu,
  Monitor,
  Zap,
  ShieldCheck,
  Expand
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Product {
  id: string;
  name: string;
  price: string;
  description: string;
  tagline: string;
  brand: string;
  images: string[];
  specs: {
    label: string;
    value: string;
    icon: string;
  }[];
  story: string;
}

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchProduct() {
      try {
        // Fetch from Supabase
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.warn("Supabase fetch error, using fallback data:", error);
          // Fallback data if table doesn't exist yet
          const fallback = {
            id: id,
            name: id === '1' ? "Titan Mouse" : "Lumia Collective",
            price: id === '1' ? "180" : "549",
            description: "The peak of performance-grade engineering. Sculpted for the elite human interface.",
            tagline: "Ultra-Light Performance / 8k Polling",
            brand: "Lumia Studio",
            images: [
              `https://picsum.photos/seed/prod1-${id}/1200/1500`,
              `https://picsum.photos/seed/prod2-${id}/1200/1500`,
              `https://picsum.photos/seed/prod3-${id}/1200/1500`
            ],
            specs: [
              { label: "Latency", value: "0.1ms", icon: "zap" },
              { label: "Polling", value: "8,000Hz", icon: "cpu" },
              { label: "Build", value: "Magnesium", icon: "shield" }
            ],
            story: "Driven by the pursuit of absolute zero latency, the Titan Mouse was developed over 24 months of specialized laboratory testing. Every micro-gram of material has been analyzed to ensure that no frictional force interrupts the dialogue between mind and movement."
          };
          setProduct(fallback as Product);
        } else {
          setProduct(data);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id, supabase]);

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <h1 className="text-4xl font-black tracking-tighter mb-8 italic text-white/20 uppercase">Product Not Found.</h1>
      <Link href="/" className="px-8 py-4 bg-white text-black text-[10px] uppercase font-black tracking-widest rounded-full">Return to Studio</Link>
    </div>
  );

  return (
    <div className="bg-black text-white selection:bg-white selection:text-black min-h-screen pt-20">

      {/* 
          SECTION 1: GALLERY (Vertical Scroll)
      */}
      <section className="flex flex-col lg:flex-row h-auto lg:h-screen overflow-hidden">
        {/* Scroll Content - Gallery */}
        <div className="w-full lg:w-[65%] h-auto lg:h-screen overflow-y-auto custom-scrollbar pt-32 lg:pt-0 snap-y snap-mandatory">
          {product.images.map((img, i) => (
            <div key={i} className="h-screen w-full relative snap-start">
              <Image 
                src={img} 
                alt={`${product.name} View ${i + 1}`} 
                fill 
                className="object-cover"
                priority={i === 0}
              />
            </div>
          ))}
        </div>

        {/* Sidebar - Purchase UI */}
        <div className="w-full lg:w-[35%] p-8 sm:p-12 lg:p-24 flex flex-col justify-end lg:justify-center border-l border-white/5 bg-[#050505] relative z-10">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <p className="text-[10px] uppercase tracking-[0.5em] text-white/30 font-black mb-4">Lumia Studio // {product.brand}</p>
            <h1 className="text-6xl sm:text-7xl font-black tracking-tighter leading-none mb-8 uppercase">{product.name}</h1>
            <p className="text-xl text-white/60 mb-12 max-w-sm font-medium tracking-tight">
              {product.description}
            </p>
            
            <div className="flex justify-between items-center mb-12 border-y border-white/5 py-8">
              <span className="text-3xl font-black tracking-tighter">${product.price}</span>
              <div className="flex gap-2">
                <span className="w-4 h-4 rounded-full bg-white"></span>
                <span className="w-4 h-4 rounded-full bg-white/20"></span>
              </div>
            </div>

            <button className="w-full py-6 bg-white text-black text-[12px] font-black uppercase tracking-[0.3em] rounded-full hover:bg-neutral-200 transition-all flex items-center justify-center gap-4">
              Add to studio order <Plus className="w-4 h-4" />
            </button>
            <p className="text-center text-[9px] uppercase tracking-[0.2em] text-white/20 font-bold mt-8">Limited Edition Production Cycle. Ships Q3 2026.</p>
          </motion.div>
        </div>
      </section>

      {/* 
          SECTION 2: STORY (Deep Technical Narrative)
      */}
      <section className="py-40 sm:py-60 px-6 sm:px-12 bg-[#050505] text-white min-h-screen flex items-center border-y border-white/5">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 sm:gap-40 items-center">
          <div>
            <span className="micro-label mb-12 block italic">The Architecture.</span>
            <h2 className="text-5xl sm:text-7xl font-black tracking-tighter leading-[0.9] mb-12 uppercase">
               SCULPTING <br /> THE INVISIBLE<span className="text-white/5">.</span>
            </h2>
            <div className="w-32 h-[1px] bg-white/20 mb-12" />
          </div>
          
          <div className="space-y-12">
            <p className="text-2xl sm:text-3xl font-medium tracking-tight leading-relaxed text-white/80">
              {product.story}
            </p>
            <p className="text-lg text-white/30 leading-relaxed font-sans font-medium">
              Our engineering team spent 14,000 hours perfecting the weight distribution and geometric balance. The result is an object that feels less like a tool and more like an extension of the biological nervous system.
            </p>
            <Link href="/" className="group flex items-center gap-4 text-[10px] uppercase tracking-[0.3em] font-black hover:text-white transition-colors">
              View Vision Archive <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* 
          SECTION 3: TECHNICAL BENTO (Individual Specs)
      */}
      <section className="py-40 px-6 sm:px-12 max-w-[1600px] mx-auto min-h-screen flex flex-col justify-center">
        <h2 className="text-[15vw] font-black tracking-tighter text-white/[0.03] leading-none mb-[-4vw] select-none pointer-events-none uppercase">SPECIFICATION.</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          {product.specs.map((spec, i) => (
            <motion.div 
              key={i}
              whileHover={{ scale: 1.02 }}
              className="bg-[#0A0A0A] border border-white/5 p-12 flex flex-col justify-between aspect-square group transition-colors hover:border-white/20"
            >
              <div className="w-12 h-12 border border-white/10 rounded-full flex items-center justify-center text-white/20 group-hover:text-white group-hover:bg-white/5 transition-all">
                {spec.icon === 'zap' && <Zap className="w-5 h-5" />}
                {spec.icon === 'cpu' && <Cpu className="w-5 h-5" />}
                {spec.icon === 'shield' && <ShieldCheck className="w-5 h-5" />}
              </div>
              <div>
                 <p className="text-[10px] uppercase tracking-[0.4em] font-black text-white/30 mb-2">{spec.label}</p>
                 <h3 className="text-6xl font-black tracking-tighter italic">{spec.value}</h3>
              </div>
            </motion.div>
          ))}
          
          <div className="md:col-span-3 bg-[#0A0A0A] border border-white/5 p-12 flex flex-col sm:flex-row justify-between items-center group overflow-hidden relative min-h-[400px]">
            <div className="max-w-md relative z-10">
              <h4 className="text-3xl font-black tracking-tighter mb-6 uppercase">Independent Laboratory Certified</h4>
              <p className="text-sm text-white/40 uppercase tracking-widest font-medium leading-relaxed">
                Tested against the most rigorous standards in global acoustics and structural engineering. Performance metrics verified at 24°C / 50% Humidity.
              </p>
            </div>
            <Expand className="w-24 h-24 text-white/[0.03] absolute -right-4 -bottom-4 rotate-12 group-hover:scale-150 transition-transform duration-1000" />
            <div className="mt-8 sm:mt-0 flex gap-12">
              <div className="text-center">
                 <p className="text-3xl font-black tracking-tighter">99.9%</p>
                 <p className="text-[8px] uppercase tracking-widest font-black text-white/20">Uptime Rate</p>
              </div>
              <div className="text-center text-white/10 italic">
                 <p className="text-3xl font-black tracking-tighter">CERTified</p>
                 <p className="text-[8px] uppercase tracking-widest font-black">Ref: LX-049</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER - Minimal Signature */}
      <footer className="py-20 border-t border-white/5 flex flex-col items-center gap-12">
        <div className="flex gap-24 text-[10px] uppercase tracking-[0.8em] font-black text-white/10">
          <span>Design</span>
          <span>Material</span>
          <span>Performance</span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] font-black">
          Lumia Studio / © 2026
        </div>
      </footer>
    </div>
  );
}
