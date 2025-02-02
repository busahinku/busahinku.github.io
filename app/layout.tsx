import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./context/ThemeContext";
import { Inter } from 'next/font/google';
import Footer from './components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: "Burak Sahin Kucuk",
    template: "%s | Burak Sahin Kucuk"
  },
  description: "My story about diverse topics.",
  keywords: ["Burak Sahin Kucuk", "Statistics", "Life", "Technology", "Computer Science", "Computing Stuff", "Blog", "Portfolio"],
  authors: [{ name: "Burak Sahin Kucuk" }],
  creator: "Burak Sahin Kucuk",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://busahinku.github.io",
    title: "Burak Sahin Kucuk",
    description: "Statistics, Life, Technology, Computer Science, Computing Stuff",
    siteName: "Burak Sahin Kucuk",
    images: [
      {
        url: "/og-image.png", // Bu resmi public klasörüne eklemeniz gerekecek
        width: 1200,
        height: 630,
        alt: "Burak Sahin Kucuk"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Burak Sahin Kucuk",
    description: "Burak's story about diverse topics.",
    images: ["/og-image.png"],
    creator: "@busahinku" // Twitter kullanıcı adınızı ekleyin
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" }
    ],
    apple: [
      { url: "/apple-icon.png" }
    ]
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <ThemeProvider>
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
