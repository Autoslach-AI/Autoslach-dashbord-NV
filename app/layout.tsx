import type { Metadata } from "next";
import { Inter, Outfit, Lora } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-display" });
const lora = Lora({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "AUTOSLASH DASHBOARD",
  description: "Multi-tenant control center for pilotage, monitoring, and management of distributed AI agent fleets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} ${lora.variable}`}>
      <body className="font-sans antialiased bg-black text-white">
        <Providers>
          <main>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
