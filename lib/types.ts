/**
 * TypeScript interfaces for the Wardrobe & Laundry Tracker
 */

// ============================================================
// Database Enums
// ============================================================

export type ItemStatus = 'clean' | 'dirty';

// ============================================================
// Core Models (mirror DB schema)
// ============================================================

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface UserPreferences {
  id: string; // same as user ID
  privacy_local_mode: boolean;
  default_wash_threshold: number;
  theme: 'light' | 'dark';
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string | null; // null = system default
  name: string;
  parent_id: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export interface Item {
  id: string;
  user_id: string;
  category_id: string | null;
  name: string;
  color: string | null;
  image_url: string | null;
  is_ai_generated: boolean;
  wear_count: number;
  wash_threshold: number;
  status: ItemStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields (optional)
  category?: Category;
}

export interface Outfit {
  id: string;
  user_id: string;
  name: string;
  item_ids: string[];
  created_at: string;
  // Joined fields (optional)
  items?: Item[];
}

export interface WearLog {
  id: string;
  user_id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  item_id: string | null;
  outfit_id: string | null;
  created_at: string;
  // Joined fields (optional)
  item?: Item;
  outfit?: Outfit;
}

// ============================================================
// Form / Input Types
// ============================================================

export interface CreateItemInput {
  name: string;
  category_id: string | null;
  color: string | null;
  image_url: string | null;
  is_ai_generated: boolean;
  wash_threshold: number;
  notes: string | null;
}

export interface UpdateItemInput {
  id: string;
  name?: string;
  category_id?: string | null;
  color?: string | null;
  image_url?: string | null;
  wash_threshold?: number;
  notes?: string | null;
}

export interface CreateOutfitInput {
  name: string;
  item_ids: string[];
}

export interface LogWearInput {
  date: string;
  item_id?: string;
  outfit_id?: string;
}

// ============================================================
// UI / Display Types
// ============================================================

export interface ItemWithProgress extends Item {
  /** 0 to 1 — how close to needing a wash */
  wearProgress: number;
  /** true if wearProgress >= 0.8 (approaching threshold) */
  isApproachingWash: boolean;
}

export interface DayOutfit {
  date: string;
  items: Item[];
  outfit: Outfit | null;
}

export interface OutfitSuggestion {
  id: string;
  name: string;
  items: Item[];
  score: number; // 0-100 compatibility score
  reason: string;
}

export interface DashboardStats {
  totalItems: number;
  cleanItems: number;
  dirtyItems: number;
  approachingWash: number;
  todayOutfit: DayOutfit | null;
}

// ============================================================
// Navigation Types
// ============================================================

export type TabName = 'index' | 'wardrobe' | 'calendar' | 'add';

export interface FilterState {
  categories: string[];
  status: ItemStatus | 'all';
  searchQuery: string;
  sortBy: 'name' | 'wear_count' | 'created_at' | 'status';
  sortDirection: 'asc' | 'desc';
}

// ============================================================
// Auth Types
// ============================================================

export interface AuthState {
  user: User | null;
  session: import('@supabase/supabase-js').Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}
