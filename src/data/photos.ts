import type { ImageMetadata } from 'astro';

// PLACEHOLDERS. These are the repo's stock landscapes standing in so the page
// has something to lay out. Drop your own files into src/assets/photos, import
// them here and delete these. Nothing else needs to change: the wall reads each
// image's real dimensions and keeps its aspect ratio, so any shape works.
import p1 from '../assets/photos/blog-placeholder-1.jpg';
import p2 from '../assets/photos/blog-placeholder-2.jpg';
import p3 from '../assets/photos/blog-placeholder-3.jpg';
import p4 from '../assets/photos/blog-placeholder-4.jpg';
import p5 from '../assets/photos/blog-placeholder-5.jpg';
import p6 from '../assets/projects/portfolio/cover.jpg';

export interface Photo {
  src: ImageMetadata;
  /** Describes the picture for anyone who cannot see it. Not the caption. */
  alt: string;
  caption?: { en: string; tr: string };
  place?: string;
  /** YYYY-MM or YYYY-MM-DD */
  taken?: string;
}

export const photos: Photo[] = [
  {
    src: p1,
    alt: 'Rolling hills fading into haze under a wide pale sky',
    caption: { en: 'The road out of town', tr: 'Şehirden çıkan yol' },
    place: 'Ankara',
    taken: '2026-04',
  },
  {
    src: p2,
    alt: 'A mountain ridge with low cloud caught on the peaks',
    caption: { en: 'Cloud sitting on the ridge', tr: 'Sırtta oturan bulut' },
    place: 'Bolu',
    taken: '2026-03',
  },
  {
    src: p3,
    alt: 'Late sunlight across calm water',
    caption: { en: 'Six in the evening', tr: 'Akşam altı' },
    place: 'Eğirdir',
    taken: '2025-09',
  },
  {
    src: p4,
    alt: 'A narrow path winding into a dense forest',
    caption: { en: 'Somewhere past the treeline', tr: 'Ağaç sınırının ardı' },
    place: 'Ilgaz',
    taken: '2025-07',
  },
  {
    src: p5,
    alt: 'Open field with a single tree near the horizon',
    caption: { en: 'One tree, a lot of field', tr: 'Bir ağaç, bolca tarla' },
    place: 'Afyonkarahisar',
    taken: '2025-06',
  },
  {
    src: p6,
    alt: 'Golden hour light over old town rooftops',
    caption: { en: 'Rooftops at golden hour', tr: 'Altın saatte çatılar' },
    place: 'Afyonkarahisar',
    taken: '2025-05',
  },
];
