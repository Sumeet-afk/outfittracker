-- ============================================================
-- Wardrobe & Laundry Tracker — Initial Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- ENUMS
CREATE TYPE item_status AS ENUM ('clean', 'dirty');

-- ============================================================
-- TABLES
-- ============================================================

-- Categories (system-wide defaults + user-custom)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL = system default
  name TEXT NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  icon TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Clothing Items
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  color TEXT,
  image_url TEXT,
  is_ai_generated BOOLEAN DEFAULT false,
  wear_count INT DEFAULT 0 CHECK (wear_count >= 0),
  wash_threshold INT DEFAULT 3 CHECK (wash_threshold >= 0),
  status item_status DEFAULT 'clean',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Outfits (named combinations of items)
CREATE TABLE outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  item_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Wear Logs (calendar entries)
CREATE TABLE wear_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  outfit_id UUID REFERENCES outfits(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT wear_log_must_have_item_or_outfit
    CHECK (item_id IS NOT NULL OR outfit_id IS NOT NULL)
);

-- User Preferences
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  privacy_local_mode BOOLEAN DEFAULT false,
  default_wash_threshold INT DEFAULT 3,
  theme TEXT DEFAULT 'light',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_items_user_id ON items(user_id);
CREATE INDEX idx_items_status ON items(user_id, status);
CREATE INDEX idx_items_category ON items(user_id, category_id);
CREATE INDEX idx_wear_logs_user_date ON wear_logs(user_id, date);
CREATE INDEX idx_wear_logs_item ON wear_logs(item_id);
CREATE INDEX idx_outfits_user_id ON outfits(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Items
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items_select_own" ON items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "items_insert_own" ON items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "items_update_own" ON items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "items_delete_own" ON items FOR DELETE USING (auth.uid() = user_id);

-- Outfits
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outfits_select_own" ON outfits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "outfits_insert_own" ON outfits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "outfits_update_own" ON outfits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "outfits_delete_own" ON outfits FOR DELETE USING (auth.uid() = user_id);

-- Wear Logs
ALTER TABLE wear_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wear_logs_select_own" ON wear_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wear_logs_insert_own" ON wear_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wear_logs_update_own" ON wear_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "wear_logs_delete_own" ON wear_logs FOR DELETE USING (auth.uid() = user_id);

-- User Preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prefs_select_own" ON user_preferences FOR SELECT USING (auth.uid() = id);
CREATE POLICY "prefs_insert_own" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "prefs_update_own" ON user_preferences FOR UPDATE USING (auth.uid() = id);

-- Categories (system defaults readable by all, custom ones only by owner)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_select" ON categories FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "categories_insert_own" ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_update_own" ON categories FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "categories_delete_own" ON categories FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- SEED DEFAULT CATEGORIES (system-wide, user_id = NULL)
-- ============================================================
INSERT INTO categories (user_id, name, icon, sort_order) VALUES
  (NULL, 'T-Shirt', '👕', 0),
  (NULL, 'Shirt', '👔', 1),
  (NULL, 'Pants', '👖', 2),
  (NULL, 'Jeans', '👖', 3),
  (NULL, 'Shorts', '🩳', 4),
  (NULL, 'Jacket', '🧥', 5),
  (NULL, 'Outerwear', '🧥', 6),
  (NULL, 'Dress', '👗', 7),
  (NULL, 'Skirt', '👗', 8),
  (NULL, 'Shoes', '👟', 9),
  (NULL, 'Accessories', '⌚', 10),
  (NULL, 'Activewear', '🏃', 11),
  (NULL, 'Sleepwear', '😴', 12);

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
-- Create via Supabase Dashboard:
-- 1. Go to Storage > New Bucket
-- 2. Name: "clothing-images" (private bucket)
-- 3. Add policies:
--    - SELECT: (bucket_id = 'clothing-images') AND (auth.uid()::text = (storage.foldername(name))[1])
--    - INSERT: (bucket_id = 'clothing-images') AND (auth.uid()::text = (storage.foldername(name))[1])
--    - DELETE: (bucket_id = 'clothing-images') AND (auth.uid()::text = (storage.foldername(name))[1])
