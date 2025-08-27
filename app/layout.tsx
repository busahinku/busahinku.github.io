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
  metadataBase: new URL('https://busahinku.github.io'),
  title: {
    default: "Burak Sahin Kucuk - Statistics, Technology & Life",
    template: "%s | Burak Sahin Kucuk"
  },
  description: "Personal blog about statistics, data science, technology, and life experiences. Sharing insights, tutorials, and thoughts on computing, research, and personal growth.",
  keywords: [
    "Burak Sahin Kucuk", 
    "Statistics", 
    "Data Science",
    "Machine Learning",
    "Technology", 
    "Computer Science", 
    "Programming",
    "Blog", 
    "Portfolio",
    "Research",
    "Analytics",
    "Life Experiences"
  ],
  authors: [{ name: "Burak Sahin Kucuk", url: "https://busahinku.github.io" }],
  creator: "Burak Sahin Kucuk",
  publisher: "Burak Sahin Kucuk",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://busahinku.github.io",
    title: "Burak Sahin Kucuk - Statistics, Technology & Life",
    description: "Personal blog about statistics, data science, technology, and life experiences. Sharing insights, tutorials, and thoughts on computing, research, and personal growth.",
    siteName: "Burak Sahin Kucuk",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Burak Sahin Kucuk - Personal Blog"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Burak Sahin Kucuk - Statistics, Technology & Life",
    description: "Personal blog about statistics, data science, technology, and life experiences.",
    images: ["/og-image.png"],
    creator: "@busahinku"
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
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Burak Sahin Kucuk',
    url: 'https://busahinku.github.io',
    image: 'https://busahinku.github.io/images/profile.jpg',
    sameAs: [
      'https://github.com/busahinku',
      'https://linkedin.com/in/burak-sahin-kucuk',
      'https://twitter.com/busahinku'
    ],
    jobTitle: 'Stat and CS Student',
    knowsAbout: [
      'Statistics',
      'Data Science', 
      'Machine Learning',
      'Computer Science',
      'Programming'
    ],
    description: 'Data scientist and researcher passionate about statistics, technology, and sharing knowledge.'
  };

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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
