'use client';

import { useState, useEffect } from 'react';
import { db } from '@/app/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

interface LikeButtonProps {
  slug: string;
  theme: 'dark' | 'light';
}

declare global {
  interface Window {
    grecaptcha: ReCaptcha;
    onRecaptchaVerified: (token: string) => void;
  }
}

interface ReCaptcha {
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
}

export default function LikeButton({ slug, theme }: LikeButtonProps) {
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkLikeStatus = async () => {
      // Local storage'dan beğeni durumunu kontrol et
      const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '{}');
      setHasLiked(!!likedPosts[slug]);

      // Firestore'dan beğeni sayısını al
      const docRef = doc(db, 'posts', slug);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setLikes(docSnap.data().likes || 0);
      } else {
        // Döküman yoksa oluştur
        await setDoc(docRef, { likes: 0 });
      }
      setIsLoading(false);
    };

    checkLikeStatus();
  }, [slug]);

  const handleLike = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // reCAPTCHA doğrulaması
      const token = await new Promise<string>((resolve, reject) => {
        window.onRecaptchaVerified = resolve;
        const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
        if (!siteKey) {
          reject(new Error('reCAPTCHA site key is not defined'));
          return;
        }
        window.grecaptcha.execute(siteKey, { action: 'like' });
      });

      if (!token) {
        console.error('reCAPTCHA verification failed');
        return;
      }

      const newLikeCount = hasLiked ? likes - 1 : likes + 1;
      const docRef = doc(db, 'posts', slug);

      // Firestore'u güncelle
      await updateDoc(docRef, {
        likes: newLikeCount
      });

      // Local storage'ı güncelle
      const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '{}');
      if (hasLiked) {
        delete likedPosts[slug];
      } else {
        likedPosts[slug] = true;
      }
      localStorage.setItem('likedPosts', JSON.stringify(likedPosts));

      // State'i güncelle
      setLikes(newLikeCount);
      setHasLiked(!hasLiked);
    } catch (error) {
      console.error('Error handling like:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={isLoading}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
        theme === 'dark'
          ? hasLiked
            ? 'bg-pink-500/20 text-pink-400 hover:bg-pink-500/30'
            : 'bg-[#1A1A1E] hover:bg-[#2B2B2B] text-white'
          : hasLiked
            ? 'bg-pink-100 text-pink-700 hover:bg-pink-200'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
      }`}
    >
      <svg
        className={`w-5 h-5 transition-transform ${hasLiked ? 'scale-110' : ''}`}
        fill={hasLiked ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={hasLiked ? "0" : "2"}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
        />
      </svg>
      {likes} {likes === 1 ? 'Like' : 'Likes'}
    </button>
  );
} 