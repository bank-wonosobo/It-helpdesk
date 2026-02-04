import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/index.css"
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IT HelpDesk Portal",
  description: "Sistem Pelaporan Kendala IT Internal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}