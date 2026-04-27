import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "כּתב — כתב כמויות מבוסס AI",
  description: "מערכת ישראלית לחילוץ כתב כמויות אוטומטי מתכניות בנייה",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full antialiased">
      <body className={`${geist.className} min-h-full`}>{children}</body>
    </html>
  );
}
