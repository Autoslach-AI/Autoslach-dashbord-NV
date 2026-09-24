"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Sparkles, MessageCircleCode, Terminal, Bell, Target, ArrowRight } from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { useConfig } from "@/lib/contexts/config-context";
import { useUser } from "@/lib/contexts/user-context";

export default function AIChat() {
  const { config } = useConfig();
  const { profile } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [suggestionViewed, setSuggestionViewed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // RELEVANCE ENGINE: Identify matches between interests and inventory
  const personalSuggestion = useMemo(() => {
    if (!profile?.interests || profile.interests.length === 0 || !config.assets.inventory) return null;
    
    // Simple relevance check: Category match or keyword match
    const match = config.assets.inventory.find((item: any) => 
      profile.interests!.some(interest => 
        item.category.toLowerCase().includes(interest.toLowerCase()) ||
        item.title.toLowerCase().includes(interest.toLowerCase())
      )
    );

    // Check frequency rule (Placeholder: simple session-based check for now)
    return match;
  }, [profile, config.assets.inventory]);

  const hasNotification = useMemo(() => personalSuggestion && !suggestionViewed && !isOpen, [personalSuggestion, suggestionViewed, isOpen]);

  // DYNAMIC WELCOME SYNC
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        { 
          role: "ai", 
          content: `Vitals stabilize. Interface initialized. Welcome to the ${config.identity.name} digital node. How can I assist with your directives today?` 
        }
      ]);
    }
  }, [config.identity.name, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsTyping(true);

    try {
      const apiKey = config.ai.support.settings.apiKey || config.ai.orchestrator.settings.apiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error("API_KEY_MISSING");

      const ai = new GoogleGenAI({ apiKey: apiKey as string });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...messages.map(m => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.content }] })),
          { role: "user", parts: [{ text: userMessage }] }
        ],
        config: {
          temperature: parseFloat(config.ai.support.settings.temperature.toString()) || 0.8,
          maxOutputTokens: config.ai.support.settings.tokenLimit || 2048,
          systemInstruction: `
## SUPPORT_AGENT_VAULT (Identity & Knowledge)
${config.ai.support.instructions}

## KNOWLEDGE_ENGINE (Business Intelligence)
${config.ai.support.knowledgeBase}

## OPERATIONAL_CONTEXT
Designation: ${config.ai.support.name}
Organization: ${config.identity.name}
Protocol: Public_Assistance_V2_Secure
`,
        },
      });

      const aiText = response.text || "I am processing your request with elite precision.";
      setMessages((prev) => [...prev, { role: "ai", content: aiText }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages((prev) => [...prev, { role: "ai", content: "Signal interference detected. System remains operational but recalibrating." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Trigger */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-[24px] right-[24px] z-[9999] w-[56px] h-[56px] bg-white border border-black/5 rounded-full flex items-center justify-center shadow-[0_10px_20px_rgba(0,0,0,0.1)] group overflow-hidden"
      >
        <div 
          className="absolute inset-0 rounded-full animate-pulse opacity-10 pointer-events-none" 
          style={{ backgroundColor: config.identity.accentColor }}
        />
        {hasNotification && (
          <div className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-bounce z-10 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
        )}
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ opacity: 0, rotate: -45 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 45 }}
            >
              <X className="w-6 h-6 text-slate-800" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <MessageCircleCode 
                className="w-6 h-6 transition-transform group-hover:rotate-6" 
                style={{ color: config.identity.accentColor || '#000' }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed bottom-[80px] right-[24px] z-[9999] w-[300px] h-[420px] bg-white/80 border border-black/10 rounded-[20px] overflow-hidden flex flex-col shadow-[0_15px_35px_rgba(0,0,0,0.1)] backdrop-blur-xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-black/5 flex items-center justify-between bg-white/40">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-black/5 flex items-center justify-center border border-black/5">
                  <Sparkles 
                    className="w-3 h-3" 
                    style={{ color: config.identity.accentColor }}
                  />
                </div>
                <div>
                  <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-900">{config.identity.name} HUB</h3>
                  <p className="text-[7px] font-bold uppercase tracking-[0.1em] text-green-600 flex items-center gap-1">
                    <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                    LIVE
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1 hover:bg-black/5 rounded-full transition-colors text-slate-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gradient-to-b from-transparent to-black/[0.01]">
              
              {/* SMART-PULSE SUGGESTION CARD */}
              {personalSuggestion && !suggestionViewed && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-black/[0.02] border border-black/5 rounded-2xl space-y-4 relative overflow-hidden"
                >
                  <div className="absolute -top-4 -right-4 p-6 opacity-5 grayscale">
                    <Target className="w-12 h-12" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="w-3 h-3 text-red-500" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-red-500/60">Personal Suggestion</span>
                  </div>
                  <div className="flex gap-3">
                     <div className="w-12 h-12 rounded-lg bg-white border border-black/5 flex-shrink-0">
                        <img src={personalSuggestion.img} className="w-full h-full object-contain grayscale" />
                     </div>
                     <div className="space-y-1">
                        <p className="text-[10px] font-black italic tracking-tighter uppercase">{personalSuggestion.title}</p>
                        <p className="text-[8px] font-bold text-black/30 leading-tight">Matched based on your interest in {personalSuggestion.category}.</p>
                     </div>
                  </div>
                  <button 
                    onClick={() => setSuggestionViewed(true)}
                    className="w-full py-2 bg-black text-white rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black/80 transition-all shadow-md"
                  >
                    View Node <ArrowRight className="w-3 h-3" />
                  </button>
                </motion.div>
              )}

              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-10 grayscale scale-75">
                  <Terminal className="w-10 h-10 text-slate-900" />
                  <p className="text-[9px] font-black uppercase tracking-[0.4em] leading-relaxed max-w-[150px] text-slate-900">Waiting for directive</p>
                </div>
              )}
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div 
                    className={`max-w-[85%] p-3.5 rounded-xl text-[12px] leading-relaxed shadow-sm ${
                      msg.role === "user" 
                        ? "bg-slate-900 text-white font-bold rounded-tr-none" 
                        : "bg-white border border-black/5 text-slate-700 font-medium rounded-tl-none italic"
                    }`}
                    style={msg.role === "ai" ? { borderLeft: `2px solid ${config.identity.accentColor}` } : {}}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-white border border-black/5 p-3.5 rounded-xl rounded-tl-none flex gap-1 shadow-sm">
                    <span className="w-1 h-1 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1 h-1 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1 h-1 bg-slate-300 rounded-full animate-bounce" />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-black/5 bg-white/40">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Transmit..."
                  className="w-full bg-white border border-black/10 py-3.5 pl-4 pr-12 rounded-xl focus:border-black/30 focus:outline-none transition-all text-[11px] font-bold tracking-tight text-slate-900 placeholder:text-slate-300 shadow-sm"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white rounded-lg hover:scale-105 transition-all disabled:opacity-20 shadow-lg"
                  style={{ backgroundColor: config.identity.accentColor || '#000' }}
                >
                  <Send className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
