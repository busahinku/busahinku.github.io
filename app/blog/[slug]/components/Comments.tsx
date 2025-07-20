'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { db, auth } from '@/app/lib/firebase';
import { collection, addDoc, query, where, onSnapshot, Timestamp, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import Image from 'next/image';

interface Comment {
  id: string;
  text: string;
  createdAt: Timestamp;
  author: {
    name: string;
    photoURL: string | null;
    uid: string;
  };
  parentId?: string | null; // Yanıt verilen yorumun ID'si
  replies?: Comment[]; // Alt yorumlar
}

interface CommentsProps {
  slug: string;
  theme: 'dark' | 'light';
}

// Avatar bileşeni - Fixed version without DOM manipulation
const Avatar = ({ src, name }: { src: string | null, name: string }) => {
  const [imageError, setImageError] = useState(false);
  
  if (!src || imageError) {
    return (
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium bg-blue-100 text-blue-600">
        {name
          .split(' ')
          .map(word => word[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)}
      </div>
    );
  }

  return (
    <div className="w-10 h-10 relative">
      <Image
        src={src}
        alt={name}
        width={40}
        height={40}
        className="rounded-full"
        onError={() => setImageError(true)}
      />
    </div>
  );
};

// Yorumları düzenleyen yardımcı fonksiyon
const organizeComments = (comments: Comment[]): Comment[] => {
  const commentMap = new Map<string, Comment>();
  const rootComments: Comment[] = [];

  // Önce tüm yorumları map'e ekle
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  // Sonra parent-child ilişkilerini kur
  comments.forEach(comment => {
    const processedComment = commentMap.get(comment.id)!;
    if (comment.parentId && commentMap.has(comment.parentId)) {
      // Eğer parent yorum varsa, onun altına ekle
      const parent = commentMap.get(comment.parentId)!;
      if (!parent.replies) parent.replies = [];
      parent.replies.push(processedComment);
    } else {
      // Parent yoksa veya bulunamadıysa ana yorum olarak ekle
      if (!comment.parentId) {
        rootComments.push(processedComment);
      }
    }
  });

  // Yorumları ve yanıtları tarihe göre sırala
  const sortByDate = (a: Comment, b: Comment) => 
    b.createdAt.toMillis() - a.createdAt.toMillis();

  rootComments.sort(sortByDate);
  rootComments.forEach(comment => {
    if (comment.replies) {
      comment.replies.sort(sortByDate);
    }
  });

  return rootComments;
};

// CommentItem component - moved outside to prevent recreation
const CommentItem = ({ 
  comment, 
  level = 0, 
  theme, 
  onReply, 
  onDelete,
  currentUserId 
}: { 
  comment: Comment; 
  level?: number; 
  theme: 'dark' | 'light';
  onReply: (id: string, authorName: string) => void;
  onDelete: (id: string) => void;
  currentUserId: string | null;
}) => {
  if (level > 3) return null; // Maximum 3 seviye iç içe yanıt sınırı

  const marginClass = level === 0 
    ? '' 
    : level === 1 
      ? 'ml-4 sm:ml-8' 
      : level === 2 
        ? 'ml-6 sm:ml-12' 
        : 'ml-8 sm:ml-16';

  return (
    <div className={`flex gap-2 sm:gap-3 ${marginClass} ${level > 0 ? 'mt-4' : ''}`}>
      <div className="flex-shrink-0">
        <Avatar 
          src={comment.author.photoURL} 
          name={comment.author.name} 
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium truncate">{comment.author.name}</span>
            <span className={`text-xs sm:text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {comment.createdAt.toDate().toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {currentUserId && level < 3 && (
              <button
                onClick={() => onReply(comment.id, comment.author.name)}
                className={`text-xs sm:text-sm transition-colors px-2 py-1 rounded-full ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-400/10'
                    : 'text-gray-500 hover:text-blue-500 hover:bg-blue-50'
                }`}
              >
                Reply
              </button>
            )}
            {currentUserId === comment.author.uid && (
              <button
                onClick={() => onDelete(comment.id)}
                className={`text-xs sm:text-sm transition-colors px-2 py-1 rounded-full ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-red-400 hover:bg-red-400/10'
                    : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
                }`}
              >
                Delete
              </button>
            )}
          </div>
        </div>
        <div className={`mt-1 text-sm break-words ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
        }`}>
          {comment.text}
        </div>
        {comment.replies?.map((reply) => (
          <CommentItem 
            key={reply.id} 
            comment={reply} 
            level={level + 1} 
            theme={theme}
            onReply={onReply}
            onDelete={onDelete}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
};

export default function Comments({ slug, theme }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [replyTo, setReplyTo] = useState<{ id: string; authorName: string } | null>(null);

  useEffect(() => {
    // Auth durumunu dinle
    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log('Auth state changed:', user);
      setIsAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  // Memoize the comments listener to prevent unnecessary re-renders
  useEffect(() => {
    console.log('Setting up comments listener for slug:', slug);
    
    const q = query(
      collection(db, 'comments'),
      where('slug', '==', slug),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData: Comment[] = [];
      snapshot.forEach((doc) => {
        commentsData.push({ id: doc.id, ...doc.data() } as Comment);
      });

      setComments(organizeComments(commentsData));
    }, (error) => {
      console.error('Error listening to comments:', error);
    });

    return () => unsubscribe();
  }, [slug]);

  // Memoize callback functions to prevent unnecessary re-renders
  const handleReply = useCallback((id: string, authorName: string) => {
    setReplyTo({ id, authorName });
  }, []);

  const handleDelete = useCallback(async (commentId: string) => {
    if (!auth.currentUser) return;
    
    try {
      const commentRef = doc(db, 'comments', commentId);
      await deleteDoc(commentRef);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  }, []);

  const handleSignIn = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      console.log('Sign in successful:', result.user);
    } catch (error) {
      console.error('Error signing in:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Memoize current user ID to prevent unnecessary re-renders
  const currentUserId = useMemo(() => auth.currentUser?.uid || null, [auth.currentUser]);

  if (isAuthChecking) {
    return (
      <div className="mt-8">
        <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Comments
        </h3>
        <div className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
          Loading...
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !auth.currentUser) return;

    setIsLoading(true);
    try {
      console.log('Adding new comment for slug:', slug);
      const commentData = {
        text: newComment.trim(),
        slug,
        createdAt: Timestamp.now(),
        author: {
          name: auth.currentUser.displayName,
          photoURL: auth.currentUser.photoURL,
          uid: auth.currentUser.uid
        },
        parentId: replyTo?.id || null
      };

      const docRef = await addDoc(collection(db, 'comments'), commentData);
      console.log('Comment added with ID:', docRef.id);
      setNewComment('');
      setReplyTo(null); // Yanıt verme modunu kapat
    } catch (error) {
      console.error('Error adding comment:', error);
    }
    setIsLoading(false);
  };

  return (
    <div className="mt-8">
      <h3 className={`text-lg font-semibold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        Comments
      </h3>

      {/* Yorum Formu */}
      {auth.currentUser ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex items-start gap-3">
            <Avatar 
              src={auth.currentUser.photoURL} 
              name={auth.currentUser.displayName || 'User'} 
            />
            <div className="flex-1">
              {replyTo && (
                <div className={`mb-2 text-sm flex items-center gap-2 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 10h10a5 5 0 0 1 5 5v6M3 10l6 6m-6-6l6-6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Replying to {replyTo.authorName}
                  </span>
                  <button
                    onClick={() => setReplyTo(null)}
                    className="text-red-500 hover:text-red-600"
                  >
                    ×
                  </button>
                </div>
              )}
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyTo ? `Write a reply...` : "Write a comment..."}
                className={`w-full p-3 rounded-lg border resize-none focus:outline-none focus:ring-2 ${
                  theme === 'dark'
                    ? 'bg-[#1A1A1E] border-gray-800 text-white focus:ring-blue-500/50'
                    : 'bg-white border-gray-200 text-gray-900 focus:ring-blue-500'
                }`}
                rows={3}
              />
              <div className="mt-2 flex justify-end gap-2">
                {replyTo && (
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      theme === 'dark'
                        ? 'bg-gray-800 hover:bg-gray-700 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isLoading || !newComment.trim()}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-600/50'
                      : 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-blue-500/50'
                  }`}
                >
                  {isLoading ? 'Posting...' : replyTo ? 'Post Reply' : 'Post Comment'}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className={`w-full py-3 rounded-lg text-sm font-medium mb-8 transition-colors ${
            theme === 'dark'
              ? 'bg-[#1A1A1E] hover:bg-[#2B2B2B] text-white border border-gray-800'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
          }`}
        >
          {isLoading ? 'Signing in...' : 'Sign in with Google to comment'}
        </button>
      )}

      {/* Yorumlar Listesi */}
      <div className="space-y-8">
        {comments.map((comment) => (
          <CommentItem 
            key={comment.id} 
            comment={comment} 
            theme={theme}
            onReply={handleReply}
            onDelete={handleDelete}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
} 