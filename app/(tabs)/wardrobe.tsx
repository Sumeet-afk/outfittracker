/**
 * Wardrobe Screen — Grid view of all clothing items
 *
 * Filterable by category and status with search.
 * Shows wear progress indicators and laundry badges.
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { supabase } from '../../lib/supabase';
import { washItem, calculateWearProgress } from '../../services/laundryEngine';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '../../styles/theme';
import type { Item, ItemStatus } from '../../lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = Spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.xl * 2 - CARD_GAP) / 2;

type FilterStatus = ItemStatus | 'all';

export default function WardrobeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch items
  const { data: items = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*, category:categories(*)')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Item[];
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Wash mutation
  const washMutation = useMutation({
    mutationFn: (itemId: string) => washItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = !search ||
        item.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesCategory = !selectedCategory ||
        item.category_id === selectedCategory;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [items, search, statusFilter, selectedCategory]);

  const renderItem = useCallback(({ item }: { item: Item }) => {
    const progress = calculateWearProgress(item.wear_count, item.wash_threshold);
    const isDirty = item.status === 'dirty';

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => router.push(`/item/${item.id}`)}
        activeOpacity={0.7}
        accessibilityLabel={`${item.name}, ${item.status}`}
      >
        {/* Image */}
        <View style={styles.itemImageContainer}>
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={styles.itemImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.itemImagePlaceholder}>
              <Text style={styles.itemEmoji}>
                {(item.category as any)?.icon ?? '👕'}
              </Text>
            </View>
          )}

          {/* Status badge */}
          {isDirty && (
            <View style={styles.dirtyBadge}>
              <Ionicons name="water" size={12} color={Colors.textInverse} />
            </View>
          )}

          {/* AI badge */}
          {item.is_ai_generated && (
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={10} color={Colors.textInverse} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.itemCategory} numberOfLines={1}>
            {(item.category as any)?.name ?? 'Uncategorized'}
          </Text>
        </View>

        {/* Wear progress bar */}
        <View style={styles.wearProgressContainer}>
          <View
            style={[
              styles.wearProgress,
              {
                width: `${progress * 100}%`,
                backgroundColor: isDirty
                  ? Colors.dirty
                  : progress >= 0.8
                    ? Colors.warning
                    : Colors.clean,
              },
            ]}
          />
        </View>

        {/* Wear count */}
        <View style={styles.wearCountRow}>
          <Text style={styles.wearCountText}>
            {item.wear_count}/{item.wash_threshold}
          </Text>
          {isDirty && (
            <TouchableOpacity
              style={styles.miniWashButton}
              onPress={(e) => {
                e.stopPropagation();
                washMutation.mutate(item.id);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.miniWashText}>Wash</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [router, washMutation]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          placeholderTextColor={Colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Search wardrobe items"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filter */}
      <View style={styles.filterRow}>
        {(['all', 'clean', 'dirty'] as FilterStatus[]).map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              statusFilter === status && styles.filterChipActive,
            ]}
            onPress={() => setStatusFilter(status)}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === status && styles.filterChipTextActive,
              ]}
            >
              {status === 'all' ? 'All' : status === 'clean' ? '✓ Clean' : '⬡ Dirty'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category Filter */}
      <FlatList
        horizontal
        data={[{ id: null, name: 'All', icon: '📁' }, ...categories]}
        renderItem={({ item: cat }) => (
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === cat.id && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text style={styles.categoryChipIcon}>{cat.icon ?? '📁'}</Text>
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === cat.id && styles.categoryChipTextActive,
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id ?? 'all'}
        style={styles.categoryList}
        contentContainerStyle={styles.categoryListContent}
        showsHorizontalScrollIndicator={false}
      />

      {/* Items Grid */}
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyGrid}>
            <Ionicons name="shirt-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyGridText}>
              {search || statusFilter !== 'all' || selectedCategory
                ? 'No items match your filters'
                : 'No items yet. Add your first piece!'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.md,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  filterChipTextActive: {
    color: Colors.textInverse,
  },
  categoryList: {
    maxHeight: 44,
    marginTop: Spacing.md,
  },
  categoryListContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  categoryChipActive: {
    backgroundColor: Colors.primaryAccent + '15',
    borderColor: Colors.primaryAccent,
  },
  categoryChipIcon: {
    fontSize: 14,
  },
  categoryChipText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  categoryChipTextActive: {
    color: Colors.primaryAccent,
  },
  gridContent: {
    padding: Spacing.xl,
    paddingTop: Spacing.md,
  },
  gridRow: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  itemCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  itemImageContainer: {
    width: '100%',
    height: CARD_WIDTH * 1.1,
    backgroundColor: Colors.surfaceElevated,
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemEmoji: {
    fontSize: 48,
  },
  dirtyBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.dirty,
    borderRadius: BorderRadius.full,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.primaryAccent,
    borderRadius: BorderRadius.full,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  itemName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  itemCategory: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  wearProgressContainer: {
    height: 3,
    backgroundColor: Colors.borderLight,
    marginHorizontal: Spacing.md,
    borderRadius: 2,
  },
  wearProgress: {
    height: '100%',
    borderRadius: 2,
  },
  wearCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  wearCountText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },
  miniWashButton: {
    backgroundColor: Colors.dirtyBg,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  miniWashText: {
    fontSize: 10,
    color: Colors.dirty,
    fontWeight: FontWeight.semibold,
  },
  emptyGrid: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.huge,
    gap: Spacing.md,
  },
  emptyGridText: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
});
