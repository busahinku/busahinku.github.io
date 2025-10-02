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
  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': 'https://busahinku.github.io/#person',
    name: 'Burak Sahin Kucuk',
    alternateName: ['BSK', 'Burak S. Kucuk'],
    url: 'https://busahinku.github.io',
    image: {
      '@type': 'ImageObject',
      url: 'https://busahinku.github.io/images/profile.jpg',
      contentUrl: 'https://busahinku.github.io/images/profile.jpg',
      caption: 'Burak Sahin Kucuk - Profile Photo'
    },
    sameAs: [
      'https://github.com/busahinku',
      'https://linkedin.com/in/sahinkucuk',
      'https://twitter.com/busahinku',
      'https://instagram.com/busahinku',
      'mailto:sahin.kucuk@metu.edu.tr'
    ],
    jobTitle: 'Statistics and Computer Engineering Student',
    affiliation: {
      '@type': 'Organization',
      name: 'Middle East Technical University',
      alternateName: 'METU',
      url: 'https://www.metu.edu.tr/'
    },
    alumniOf: {
      '@type': 'Organization',
      name: 'Middle East Technical University',
      alternateName: 'METU'
    },
    knowsAbout: [
      'Statistics',
      'Data Science',
      'Machine Learning',
      'Computer Science',
      'Programming',
      'Python',
      'R',
      'C/C++',
      'Web Development',
      'Data Analysis'
    ],
    description: 'Statistics and Computer Engineering student at METU, passionate about data science, machine learning, and sharing knowledge through blogging.',
    email: 'sahin.kucuk@metu.edu.tr',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Ankara',
      addressCountry: 'Turkey'
    },
    owns: {
      '@type': 'Website',
      name: 'Burak Sahin Kucuk - Personal Blog',
      url: 'https://busahinku.github.io',
      description: 'Personal blog about statistics, data science, technology, and life experiences'
    }
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'Website',
    '@id': 'https://busahinku.github.io/#website',
    name: 'Burak Sahin Kucuk - Statistics, Technology & Life',
    url: 'https://busahinku.github.io',
    description: 'Personal blog about statistics, data science, technology, and life experiences. Sharing insights, tutorials, and thoughts on computing, research, and personal growth.',
    publisher: {
      '@id': 'https://busahinku.github.io/#person'
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://busahinku.github.io/blog?search={search_term_string}',
      'query-input': 'required name=search_term_string'
    },
    mainEntity: {
      '@id': 'https://busahinku.github.io/#person'
    }
  };

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://busahinku.github.io/#organization',
    name: 'Burak Sahin Kucuk Blog',
    url: 'https://busahinku.github.io',
    logo: {
      '@type': 'ImageObject',
      url: 'https://busahinku.github.io/og-image.png',
      width: 1200,
      height: 630
    },
    founder: {
      '@id': 'https://busahinku.github.io/#person'
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'sahin.kucuk@metu.edu.tr',
      contactType: 'customer support'
    }
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://busahinku.github.io'
      }
    ]
  };

  const combinedSchema = {
    '@context': 'https://schema.org',
    '@graph': [personSchema, websiteSchema, organizationSchema, breadcrumbSchema]
  };

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="alternate" type="application/rss+xml" title="RSS Feed for Burak Sahin Kucuk's Blog" href="/rss" />
        <link rel="alternate" type="application/atom+xml" title="Atom Feed for Burak Sahin Kucuk's Blog" href="/feed" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(combinedSchema) }}
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
