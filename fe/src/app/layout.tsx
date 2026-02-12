import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";
import "@h001/ui/dist/index.css";
import { AuthProvider } from "@/providers/AuthProvider";


const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"]
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"]
});

export const metadata: Metadata = {
	title: "OpenCSP::console",
	description: "OpenCSP",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html>
			{/* font, theme, globalcss, provider */}
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-100`}
			>
				<AuthProvider>
					{children}
				</AuthProvider>
			</body>
		</html>
	);
}
