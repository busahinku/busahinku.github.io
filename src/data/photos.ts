import type { ImageMetadata } from 'astro';

// Add a photo with `npm run photo -- <original.jpg>`: it uploads the full-quality
// original to R2 and writes the wall's working copy to src/assets/photos, then
// prints the entry to paste below. The wall keeps each image's real shape.
import p1 from '../assets/photos/8thDorm.jpg';


export interface Photo {
  /** The wall's 2400px working copy, written by `npm run photo`. */
  src: ImageMetadata;
  /** R2 key of the full-quality original, shown when the photo is opened. */
  original?: string;
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
    original: 'photos/8thDorm.jpg',
    alt: 'Night view of the 8th dormitory building at METU, with a tree in the foreground.',
    caption: { en: 'The window of the 406', tr: '406\'nın penceresi' },
    place: 'Ankara',
    taken: '2026-08',
  }
];
