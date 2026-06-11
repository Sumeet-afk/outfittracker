/**
 * Laundry Engine Service
 *
 * Core business logic for wear tracking and laundry management.
 * Every item tracks wear_count and wash_threshold.
 * Logging an item increments wear_count.
 * Meeting threshold moves item to "dirty" state.
 * "Wash" action resets count to 0 and status to "clean".
 */
import { supabase } from '../lib/supabase';
import type { Item, WearLog } from '../lib/types';

/**
 * Log a single item as worn on a given date.
 * Increments wear_count and auto-transitions to 'dirty' if threshold met.
 */
export async function logWear(
  itemId: string,
  date: string
): Promise<{ item: Item | null; wearLog: WearLog | null; error: string | null }> {
  try {
    // 1. Fetch current item state
    const { data: item, error: fetchError } = await supabase
      .from('items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (fetchError || !item) {
      return { item: null, wearLog: null, error: fetchError?.message ?? 'Item not found' };
    }

    // 2. Calculate new wear count and status
    const newWearCount = item.wear_count + 1;
    const shouldBeDirty =
      item.wash_threshold > 0 && newWearCount >= item.wash_threshold;

    // 3. Update item
    const { data: updatedItem, error: updateError } = await supabase
      .from('items')
      .update({
        wear_count: newWearCount,
        status: shouldBeDirty ? 'dirty' : item.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .select()
      .single();

    if (updateError) {
      return { item: null, wearLog: null, error: updateError.message };
    }

    // 4. Insert wear log
    const { data: wearLog, error: logError } = await supabase
      .from('wear_logs')
      .insert({ date, item_id: itemId })
      .select()
      .single();

    if (logError) {
      return { item: updatedItem, wearLog: null, error: logError.message };
    }

    return { item: updatedItem, wearLog, error: null };
  } catch (err) {
    return { item: null, wearLog: null, error: 'An unexpected error occurred' };
  }
}

/**
 * Log wearing an entire outfit on a given date.
 * Increments wear_count on ALL items in the outfit.
 */
export async function logOutfitWear(
  outfitId: string,
  itemIds: string[],
  date: string
): Promise<{ errors: string[] }> {
  const errors: string[] = [];

  // Log wear for each item in the outfit
  for (const itemId of itemIds) {
    const result = await logWear(itemId, date);
    if (result.error) {
      errors.push(`Item ${itemId}: ${result.error}`);
    }
  }

  // Also insert an outfit-level wear log
  const { error: outfitLogError } = await supabase
    .from('wear_logs')
    .insert({ date, outfit_id: outfitId });

  if (outfitLogError) {
    errors.push(`Outfit log: ${outfitLogError.message}`);
  }

  return { errors };
}

/**
 * Wash a single item — reset wear_count to 0, status to 'clean'.
 */
export async function washItem(
  itemId: string
): Promise<{ item: Item | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('items')
      .update({
        wear_count: 0,
        status: 'clean',
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      return { item: null, error: error.message };
    }

    return { item: data, error: null };
  } catch (err) {
    return { item: null, error: 'An unexpected error occurred' };
  }
}

/**
 * Wash ALL dirty items for the current user.
 */
export async function washAll(): Promise<{ count: number; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('items')
      .update({
        wear_count: 0,
        status: 'clean',
        updated_at: new Date().toISOString(),
      })
      .eq('status', 'dirty')
      .select();

    if (error) {
      return { count: 0, error: error.message };
    }

    return { count: data?.length ?? 0, error: null };
  } catch (err) {
    return { count: 0, error: 'An unexpected error occurred' };
  }
}

/**
 * Calculate wear progress for an item (0 to 1).
 * Returns 0 if wash_threshold is 0 (item never becomes dirty).
 */
export function calculateWearProgress(wearCount: number, washThreshold: number): number {
  if (washThreshold <= 0) return 0;
  return Math.min(wearCount / washThreshold, 1);
}

/**
 * Check if item is approaching wash threshold (>= 80%).
 */
export function isApproachingWash(wearCount: number, washThreshold: number): boolean {
  if (washThreshold <= 0) return false;
  return (wearCount / washThreshold) >= 0.8;
}
