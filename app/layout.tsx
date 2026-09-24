'use client';

import { Inter, Outfit, Lora } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-display" });
const lora = Lora({ subsets: ["latin"], variable: "--font-serif" });

import { ConfigProvider } from "@/lib/contexts/config-context";
import { UserProvider } from "@/lib/contexts/user-context";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} ${lora.variable}`}>
      <body className="font-sans antialiased bg-black text-white">
        <ConfigProvider>
          <UserProvider>
            <main>
              {children}
            </main>
          </UserProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
