// Firestore CRUD operations
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  increment,
  serverTimestamp,
  addDoc,
  Timestamp,
  type Firestore,
  type DocumentReference,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { getFirebaseApp } from './client';
import type { PostStats, Like, Comment } from './types';

let db: Firestore | undefined;

export function getFirestoreDb(): Firestore {
  if (!db) {
    const app = getFirebaseApp();
    db = getFirestore(app);
  }
  return db;
}

// Helper to generate visitor ID
export function getVisitorId(): string {
  const key = 'blog_visitor_id';
  let visitorId = localStorage.getItem(key);
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem(key, visitorId);
  }
  return visitorId;
}

// ==================== POST STATS ====================

export async function getPostStats(slug: string): Promise<PostStats | null> {
  const db = getFirestoreDb();
  const docRef = doc(db, 'posts', slug);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      views: data.views || 0,
      likes: data.likes || 0,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }
  return null;
}

export function subscribeToPostStats(
  slug: string,
  callback: (stats: PostStats) => void,
  onError?: (error: Error) => void
): () => void {
  const db = getFirestoreDb();
  const docRef = doc(db, 'posts', slug);

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        callback({
          views: data.views || 0,
          likes: data.likes || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      } else {
        callback({
          views: 0,
          likes: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    },
    (error) => {
      console.error('Error subscribing to post stats:', error);
      if (onError) {
        onError(error);
      }
    }
  );
}

export async function incrementViews(slug: string): Promise<void> {
  const db = getFirestoreDb();
  const docRef = doc(db, 'posts', slug);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    await updateDoc(docRef, {
      views: increment(1),
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(docRef, {
      views: 1,
      likes: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

// ==================== LIKES ====================

export async function hasUserLiked(slug: string): Promise<boolean> {
  const visitorId = getVisitorId();
  const db = getFirestoreDb();
  const likeId = `${slug}_${visitorId}`;
  const docRef = doc(db, 'likes', likeId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists();
}

export async function toggleLike(slug: string): Promise<boolean> {
  const visitorId = getVisitorId();
  const db = getFirestoreDb();
  const likeId = `${slug}_${visitorId}`;
  const likeRef = doc(db, 'likes', likeId);
  const postRef = doc(db, 'posts', slug);

  const likeSnap = await getDoc(likeRef);

  if (likeSnap.exists()) {
    // Unlike
    await deleteDoc(likeRef);
    const postSnap = await getDoc(postRef);
    if (postSnap.exists()) {
      await updateDoc(postRef, {
        likes: increment(-1),
        updatedAt: serverTimestamp(),
      });
    }
    return false;
  } else {
    // Like
    await setDoc(likeRef, {
      postSlug: slug,
      visitorId,
      createdAt: serverTimestamp(),
    });

    const postSnap = await getDoc(postRef);
    if (postSnap.exists()) {
      await updateDoc(postRef, {
        likes: increment(1),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(postRef, {
        views: 0,
        likes: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return true;
  }
}

// ==================== COMMENTS ====================

export function subscribeToComments(
  slug: string,
  callback: (comments: Comment[]) => void,
  onError?: (error: Error) => void
): () => void {
  const db = getFirestoreDb();
  const commentsRef = collection(db, 'comments');
  // Simple query without orderBy to avoid requiring composite index
  // We'll sort client-side instead
  const q = query(
    commentsRef,
    where('postSlug', '==', slug)
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const comments: Comment[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        comments.push({
          id: doc.id,
          postSlug: data.postSlug,
          parentId: data.parentId,
          userId: data.userId,
          userName: data.userName,
          userPhoto: data.userPhoto,
          content: data.content,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || null,
          isEdited: data.isEdited || false,
          replyCount: data.replyCount || 0,
        });
      });
      // Sort by createdAt client-side
      comments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      callback(buildCommentTree(comments));
    },
    (error) => {
      console.error('Error subscribing to comments:', error);
      if (onError) {
        onError(error);
      } else {
        callback([]);
      }
    }
  );
}

function buildCommentTree(comments: Comment[]): Comment[] {
  const commentMap = new Map<string, Comment>();
  const rootComments: Comment[] = [];

  // First pass: create map
  comments.forEach((comment) => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  // Second pass: build tree
  comments.forEach((comment) => {
    const mapped = commentMap.get(comment.id)!;
    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(mapped);
      } else {
        // Parent not found, treat as root
        rootComments.push(mapped);
      }
    } else {
      rootComments.push(mapped);
    }
  });

  return rootComments;
}

export async function addComment(
  slug: string,
  userId: string,
  userName: string,
  userPhoto: string | null,
  content: string,
  parentId: string | null = null
): Promise<string> {
  const db = getFirestoreDb();
  const commentsRef = collection(db, 'comments');

  const docRef = await addDoc(commentsRef, {
    postSlug: slug,
    parentId,
    userId,
    userName,
    userPhoto,
    content,
    createdAt: serverTimestamp(),
    updatedAt: null,
    isEdited: false,
    replyCount: 0,
  });

  // Update parent's reply count if this is a reply
  if (parentId) {
    const parentRef = doc(db, 'comments', parentId);
    await updateDoc(parentRef, {
      replyCount: increment(1),
    });
  }

  return docRef.id;
}

export async function updateComment(
  commentId: string,
  content: string
): Promise<void> {
  const db = getFirestoreDb();
  const docRef = doc(db, 'comments', commentId);
  await updateDoc(docRef, {
    content,
    updatedAt: serverTimestamp(),
    isEdited: true,
  });
}

export async function deleteComment(
  commentId: string,
  parentId: string | null
): Promise<void> {
  const db = getFirestoreDb();
  const docRef = doc(db, 'comments', commentId);
  await deleteDoc(docRef);

  // Update parent's reply count if this was a reply
  if (parentId) {
    const parentRef = doc(db, 'comments', parentId);
    const parentSnap = await getDoc(parentRef);
    if (parentSnap.exists()) {
      await updateDoc(parentRef, {
        replyCount: increment(-1),
      });
    }
  }
}
