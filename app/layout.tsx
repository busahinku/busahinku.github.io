import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./context/ThemeContext";
import { Sora } from 'next/font/google';
import Footer from './components/Footer';

const sora = Sora({ 
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800'],
  display: 'swap'
});

export const metadata: Metadata = {
  title: {
    default: "Burak Sahin Kucuk",
    template: "%s"
  },
  description: "Some stuff I've Learned or just want to share.",
  keywords: ["Burak Sahin Kucuk", "Statistics", "Life", "Technology", "Computer Science", "Computing Stuff", "Blog", "Portfolio"],
  authors: [{ name: "Burak Sahin Kucuk" }],
  creator: "Burak Sahin Kucuk",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://busahinku.github.io",
    title: "Burak Sahin Kucuk",
    description: "Some stuff I've Learned or just want to share.",
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
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${sora.className} flex flex-col min-h-screen overflow-x-hidden`}>
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
