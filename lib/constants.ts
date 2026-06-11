/**
 * App Constants
 */

// Default categories seeded for new users
export const DEFAULT_CATEGORIES = [
  { name: 'T-Shirt', icon: '👕', sort_order: 0 },
  { name: 'Shirt', icon: '👔', sort_order: 1 },
  { name: 'Pants', icon: '👖', sort_order: 2 },
  { name: 'Jeans', icon: '🩷', sort_order: 3 },
  { name: 'Shorts', icon: '🩳', sort_order: 4 },
  { name: 'Jacket', icon: '🧥', sort_order: 5 },
  { name: 'Outerwear', icon: '🧥', sort_order: 6 },
  { name: 'Dress', icon: '👗', sort_order: 7 },
  { name: 'Skirt', icon: '🩱', sort_order: 8 },
  { name: 'Shoes', icon: '👟', sort_order: 9 },
  { name: 'Accessories', icon: '⌚', sort_order: 10 },
  { name: 'Activewear', icon: '🏃', sort_order: 11 },
  { name: 'Sleepwear', icon: '🛏️', sort_order: 12 },
] as const;

// Default wash threshold for new items
export const DEFAULT_WASH_THRESHOLD = 3;

// Laundry engine constants
export const APPROACHING_WASH_RATIO = 0.8; // 80% of threshold = warning

// Max image upload size in bytes (10MB)
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

// Allowed image MIME types
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

// Storage bucket name
export const STORAGE_BUCKET = 'clothing-images';

// Colors available for item tagging
export const ITEM_COLORS = [
  { name: 'Black', value: '#1A1A2E' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Gray', value: '#868E96' },
  { name: 'Navy', value: '#1864AB' },
  { name: 'Blue', value: '#339AF0' },
  { name: 'Light Blue', value: '#74C0FC' },
  { name: 'Red', value: '#E03131' },
  { name: 'Pink', value: '#F06595' },
  { name: 'Purple', value: '#845EF7' },
  { name: 'Green', value: '#2F9E44' },
  { name: 'Olive', value: '#5C940D' },
  { name: 'Yellow', value: '#FCC419' },
  { name: 'Orange', value: '#FF922B' },
  { name: 'Brown', value: '#A0522D' },
  { name: 'Beige', value: '#F5F0E1' },
  { name: 'Cream', value: '#FFFDD0' },
] as const;

// Suggestion engine
export const SUGGESTION_COUNT = 3;
export const RECENT_WEAR_LOOKBACK_DAYS = 3;

// Required outfit category slots (for suggestion engine)
export const REQUIRED_OUTFIT_SLOTS = ['T-Shirt', 'Shirt', 'Pants', 'Jeans', 'Shorts', 'Shoes'] as const;
