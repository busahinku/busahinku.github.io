import type { ImageMetadata } from 'astro';

// PLACEHOLDERS. These are the repo's stock landscapes standing in so the page
// has something to lay out. Drop your own files into src/assets/photos, import
// them here and delete these. Nothing else needs to change: the wall reads each
// image's real dimensions and keeps its aspect ratio, so any shape works.
import p1 from '../assets/photos/8thDorm.jpg';


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
  }
];
