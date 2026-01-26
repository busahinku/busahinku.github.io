// Firebase data models

export interface PostStats {
  views: number;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Like {
  postSlug: string;
  visitorId: string;
  createdAt: Date;
}

export interface Comment {
  id: string;
  postSlug: string;
  parentId: string | null;
  userId: string;
  userName: string;
  userPhoto: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date | null;
  isEdited: boolean;
  replyCount: number;
  replies?: Comment[];
}

export interface User {
  uid: string;
  displayName: string;
  photoURL: string | null;
  email: string;
}
