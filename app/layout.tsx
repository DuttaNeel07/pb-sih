import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/context/AuthContext";
import { Analytics } from "@vercel/analytics/react";
import ToastProvider from "@/components/ToastProvider";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({ 
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SIH Registration Portal",
  description: "Smart India Hackathon Registration Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} font-sans`}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <ToastProvider />
        <Analytics />
      </body>
    </html>
  );
}
