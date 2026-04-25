import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_KR, IBM_Plex_Mono } from "next/font/google";
import "@/app/globals.css";
import "@h001/ui/dist/index.css";
import { AuthProvider } from "@/providers/AuthProvider";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexSansKR = IBM_Plex_Sans_KR({
  variable: "--font-plex-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OpenCSP Console",
  description: "OpenCSP Console",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body className={`${plexSans.variable} ${plexSansKR.variable} ${plexMono.variable}`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
