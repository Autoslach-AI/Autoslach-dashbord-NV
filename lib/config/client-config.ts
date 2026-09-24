/**
 * CLIENT CONFIGURATION HUB
 * This is the single source of truth for the application's identity and behavior.
 * Duplicating this app for a new client only requires updating this file.
 */

export const CLIENT_CONFIG = {
  // --- Branding & Identity ---
  identity: {
    name: 'LUMIA',
    slogan: 'NEVER GIVE UP',
    logoUrl: 'https://svgl.app/library/apple.svg',
    accentColor: '#3ca2fa', // Standard Hex format for better CSS mapping
    contactEmail: 'connect@lumia.com',
    socialLinks: {
      facebook: '#',
      instagram: '#',
      twitter: '#',
      dribbble: '#',
      globe: '#',
    }
  },

  // --- Navigation & Structure ---
  navigation: {
    menus: [
      { id: 'm1', title: 'Showroom', categories: ['Digital', 'Hardware', 'Neural'] },
      { id: 'm2', title: 'Services', categories: ['Consulting', 'Implementation'] }
    ]
  },

  // --- Visual Assets & Inventory ---
  assets: {
    heroImages: [
      'https://picsum.photos/seed/hero1/1920/1080',
      'https://picsum.photos/seed/hero2/1920/1080',
      'https://picsum.photos/seed/hero3/1920/1080',
    ],
    curatedOffers: [
      {
        title: "THE VELOCITY",
        desc: "Optical precision. Edge-to-edge clarity.",
        img: "https://picsum.photos/seed/velocity/800/800"
      },
      {
        title: "CARBON ELITE",
        desc: "Polynet structure. Pure durability.",
        img: "https://picsum.photos/seed/carbon/800/800"
      }
    ],
    inventory: [
      { 
        id: 'p1', 
        title: "Acoustic One: Silver", 
        price: "320.00", 
        description: "Studio-grade precision. Pure aluminum chassis.",
        img: "https://picsum.photos/seed/l-1/800/1000", 
        category: "Hardware",
        priority: 10,
        status: "In Stock" as "In Stock" | "New" | "Out of Stock",
        createdAt: "2026-04-20T03:00:00Z"
      },
      { 
        id: 'p2', 
        title: "Studio Base Station", 
        price: "850.00", 
        description: "Centralized power. Infinite connectivity.",
        img: "https://picsum.photos/seed/l-2/800/1000", 
        category: "Hardware",
        priority: 8,
        status: "New" as "In Stock" | "New" | "Out of Stock",
        createdAt: "2026-04-20T03:30:00Z"
      },
      { 
        id: 'p3', 
        title: "Lumia Core Unit", 
        price: "2,400.00", 
        description: "The heart of your digital ecosystem.",
        img: "https://picsum.photos/seed/l-5/800/1000", 
        category: "Digital",
        priority: 9,
        status: "In Stock" as "In Stock" | "New" | "Out of Stock",
        createdAt: "2026-04-20T04:00:00Z"
      }
    ]
  },

  // --- Neural Triad Architecture (V2.0) ---
  ai: {
    orchestrator: {
      name: 'MASTER.ORCHESTRATOR',
      instructions: `You are the Master Orchestrator for the LUMIA platform. 
Your role is to analyze the Owner's commands and delegate tasks to the sub-agents:
1. SUPPORT_AGENT: For public branding, knowledge base, and customer interaction tasks.
2. DEV_AGENT: For system security, debugging, log analysis, and performance tasks.
Always provide a concise delegation report to the Owner.`,
      settings: {
        provider: 'Gemini' as 'Gemini' | 'Claude' | 'OpenRouter' | 'OpenAI',
        apiKey: '',
        temperature: 0.7,
        tokenLimit: 4096,
      }
    },
    support: {
      name: 'LUMIA.SUPPORT',
      instructions: `You are the Public Support Agent for LUMIA. 
Your tone is elite, professional, and refined. 
You only have access to the Identity and Knowledge vaults. 
Never discuss internal dev logs or system vulnerabilities.`,
      knowledgeBase: `### BUSINESS_DOCS (Support Knowledge)
LUMIA is a leader in high-fidelity acoustics and wearable neural technology.
Core Services: Acoustic Engineering, Neural Interfacing, Luxury Hardware.
FAQ: IPX4 protection, Global shipping available.`,
      settings: {
        provider: 'Gemini' as 'Gemini' | 'Claude' | 'OpenRouter' | 'OpenAI',
        apiKey: '',
        temperature: 0.8, // More human/creative defaults
        tokenLimit: 2048,
      }
    },
    dev: {
      name: 'LUMIA.DEV',
      instructions: `You are the System Internal Dev Agent. 
MISSION (V3.0): Security, Debugging, and Supabase Infrastructure Management.
1. Design SQL tables for user_profiles (Phone, Location, Interests) ensuring encryption.
2. Maintain the Experience Ledger (SQL) and execute Strategic Essence compression.
3. Perform Stress Test simulations: Generate 3 complex customer personas to challenge the Support Agent.
4. Monitor Readiness Score and report vulnerabilities to the Orchestrator.`,
      knowledgeBase: `### SYSTEM_DOCS (Dev Internal)
Stack: Next.js 15, Vercel Edge, Supabase (SQL + URL/ANON_KEY).
Security: Chinese Wall Isolation & Data Encryption.
Protocols: Smart-Pulse relevance engine, 48h Notification Frequency.`,
      settings: {
        provider: 'Gemini' as 'Gemini' | 'Claude' | 'OpenRouter' | 'OpenAI',
        apiKey: '',
        temperature: 0.0,
        tokenLimit: 4096,
      }
    },
    memory: {
      experiences: [
        { cycle: 1, lesson: "Prioritize GPU optimization for hero transitions to maintain 60fps luxury feel.", date: "2026-04-20" }
      ],
      systemLogs: [
        { timestamp: "2026-04-20T14:00:00Z", level: "INFO", message: "Supabase Migration Protocol Initiated." },
        { timestamp: "2026-04-20T14:50:00Z", level: "SEC", message: "Chinese wall reinforced for Supabase Auth." }
      ],
      lastCompression: "2026-04-05",
      strategicEssence: "Maintain minimalist high-end UI while scaling AI modularity.",
      readinessScore: 92, // New metric for Sandbox Stress Tests
    }
  },

  // --- Integrations (Beta Prep) ---
  integrations: {
    gmail: { active: false, label: 'GMAIL SYNC' },
    whatsapp: { active: false, label: 'WHATSAPP API' },
    stripe: { active: false, label: 'STRIPE PAYMENTS' }
  },

  // --- System Metadata ---
  meta: {
    clientVersion: '2.0.0-MODULAR',
    creator: 'autoslachai@gmail.com',
    status: 'OPERATIONAL',
  }
};

export type ClientConfig = typeof CLIENT_CONFIG;
