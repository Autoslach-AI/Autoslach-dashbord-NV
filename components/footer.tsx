"use client";
import React, { useEffect, useState } from "react";
import Link from 'next/link';
import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Instagram,
  Twitter,
  Dribbble,
  Globe,
} from "lucide-react";
import { useConfig } from "@/lib/contexts/config-context";
import { FooterLightBackgroundGradient, TextHoverEffect } from "@/components/ui/hover-footer";

export default function HoverFooter() {
  const { config, isReady } = useConfig();

  if (!isReady) return null;

  const companyName = config.identity.name;

  // Contact info data derived from config
  const contactInfo = [
    {
      icon: <Mail size={18} style={{ color: config.identity.accentColor }} />,
      text: config.identity.contactEmail,
      href: `mailto:${config.identity.contactEmail}`,
    },
    {
      icon: <Phone size={18} style={{ color: config.identity.accentColor }} />,
      text: "+1 (555) 400-1800",
      href: "tel:+15554001800",
    },
    {
      icon: <MapPin size={18} style={{ color: config.identity.accentColor }} />,
      text: "Global Studio Hub",
    },
  ];

  // Footer link sections (remaining logic stays the same)
  const footerLinks = [
    {
      title: "Navigation",
      links: [
        { label: "Home", href: "/" },
        { label: "Shop", href: "/shop" },
        { label: "Studio", href: "#studio" },
      ],
    },
    {
      title: "Helpful Links",
      links: [
        { label: "FAQs", href: "#" },
        { label: "Support", href: "#" },
        {
          label: "Live Chat",
          href: "#",
          pulse: true,
        },
      ],
    },
  ];

  // Social media icons from config
  const socialLinks = [
    { icon: <Facebook size={20} />, label: "Facebook", href: config.identity.socialLinks.facebook },
    { icon: <Instagram size={20} />, label: "Instagram", href: config.identity.socialLinks.instagram },
    { icon: <Twitter size={20} />, label: "Twitter", href: config.identity.socialLinks.twitter },
    { icon: <Dribbble size={20} />, label: "Dribbble", href: config.identity.socialLinks.dribbble },
    { icon: <Globe size={20} />, label: "Globe", href: config.identity.socialLinks.globe },
  ];

  return (
    <footer className="bg-[#050505] border-t border-white/5 relative h-fit rounded-[40px] overflow-hidden m-6 sm:m-12 text-white">
      <div className="max-w-7xl mx-auto p-10 md:p-20 z-40 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-8 lg:gap-16 pb-12">
          {/* Brand section */}
          <div className="flex flex-col space-y-6">
            <div className="flex flex-col text-white">
              <span className="text-3xl font-black tracking-tight leading-none uppercase">{companyName}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold">Luxury Studio</span>
            </div>
            <p className="text-sm leading-relaxed text-white/50 font-medium italic">
              "{config.identity.slogan}"
            </p>
          </div>

          {/* Footer link sections */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 className="text-white text-lg font-semibold mb-6">
                {section.title}
              </h4>
              <ul className="space-y-4">
                {section.links.map((link) => (
                  <li key={link.label} className="relative flex items-center">
                    <a
                      href={link.href}
                      className="text-white/50 transition-colors text-sm font-medium"
                      style={{ 
                        // We use a custom class for hover or dynamic transition
                        color: 'inherit' 
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = config.identity.accentColor)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '')}
                    >
                      {link.label}
                    </a>
                    {link.pulse && (
                      <span 
                        className="ml-2 w-2 h-2 rounded-full animate-pulse"
                        style={{ backgroundColor: config.identity.accentColor }}
                      ></span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact section */}
          <div>
            <h4 className="text-white text-lg font-semibold mb-6">
              Contact Us
            </h4>
            <ul className="space-y-4">
              {contactInfo.map((item, i) => (
                <li key={i} className="flex items-center space-x-3 text-sm text-white/50">
                  {item.icon}
                  {item.href ? (
                    <a
                      href={item.href}
                      className="transition-colors"
                      onMouseEnter={(e) => (e.currentTarget.style.color = config.identity.accentColor)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '')}
                    >
                      {item.text}
                    </a>
                  ) : (
                    <span 
                      className="transition-colors"
                      onMouseEnter={(e) => (e.currentTarget.style.color = config.identity.accentColor)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '')}
                    >
                      {item.text}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <hr className="border-t border-white/5 my-12" />

        {/* Footer bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center text-[11px] font-bold uppercase tracking-widest space-y-6 md:space-y-0 text-white/30">
          {/* Social icons */}
          <div className="flex space-x-8">
            {socialLinks.map(({ icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="hover:text-white transition-colors"
              >
                {icon}
              </a>
            ))}
          </div>

          {/* Copyright */}
          <div className="text-center md:text-left flex items-center justify-center md:justify-start gap-1">
            <span>&copy; {new Date().getFullYear()} {companyName}. All rights reserved.</span>
            {/* Stealth Creator Dot: The hidden door */}
            <Link 
              href="/admin/auth" 
              className="inline-block p-2.5 -m-2.5 cursor-default group"
              style={{ cursor: 'default' }}
              title=""
            >
              <span className="block w-1 h-1 bg-[#222222] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>
        </div>
      </div>

      {/* Text hover effect */}
      <div className="lg:flex hidden h-[40rem] -mt-64 -mb-48 pointer-events-none">
        <TextHoverEffect text={companyName} className="z-50" />
      </div>

      <FooterLightBackgroundGradient />
    </footer>
  );
}

