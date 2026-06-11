/**
 * Dashboard Screen — Home tab
 *
 * Shows today's outfit, laundry alerts, stats,
 * and quick actions for the most common workflows.
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { washAll } from '../../services/laundryEngine';
import { calculateWearProgress, isApproachingWash } from '../../services/laundryEngine';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '../../styles/theme';
import type { Item } from '../../lib/types';

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch all items for stats
  const { data: items, isLoading, refetch, isRefetching } = useQuery({
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

  // Fetch today's wear logs
  const today = new Date().toISOString().split('T')[0];
  const { data: todayLogs } = useQuery({
    queryKey: ['wear_logs', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wear_logs')
        .select('*, item:items(*)')
        .eq('date', today);
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalItems = items?.length ?? 0;
  const dirtyItems = items?.filter((i) => i.status === 'dirty') ?? [];
  const approachingItems = items?.filter(
    (i) => i.status === 'clean' && isApproachingWash(i.wear_count, i.wash_threshold)
  ) ?? [];
  const cleanItems = totalItems - dirtyItems.length;

  const handleWashAll = useCallback(async () => {
    await washAll();
    queryClient.invalidateQueries({ queryKey: ['items'] });
  }, [queryClient]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.replace('/(auth)/login');
  }, [signOut, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good {getGreeting()}</Text>
          <Text style={styles.userName}>{user?.email?.split('@')[0] ?? 'there'} 👋</Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={handleSignOut}
          accessibilityLabel="Sign out"
        >
          <Ionicons name="log-out-outline" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: Colors.surface }]}>
          <Text style={styles.statNumber}>{totalItems}</Text>
          <Text style={styles.statLabel}>Total Items</Text>
          <View style={[styles.statIcon, { backgroundColor: Colors.primaryAccent + '15' }]}>
            <Ionicons name="shirt-outline" size={18} color={Colors.primaryAccent} />
          </View>
        </View>
        <View style={[styles.statCard, { backgroundColor: Colors.surface }]}>
          <Text style={[styles.statNumber, { color: Colors.clean }]}>{cleanItems}</Text>
          <Text style={styles.statLabel}>Clean</Text>
          <View style={[styles.statIcon, { backgroundColor: Colors.cleanBg }]}>
            <Ionicons name="checkmark-circle-outline" size={18} color={Colors.clean} />
          </View>
        </View>
        <View style={[styles.statCard, { backgroundColor: Colors.surface }]}>
          <Text style={[styles.statNumber, { color: Colors.dirty }]}>{dirtyItems.length}</Text>
          <Text style={styles.statLabel}>Laundry</Text>
          <View style={[styles.statIcon, { backgroundColor: Colors.dirtyBg }]}>
            <Ionicons name="water-outline" size={18} color={Colors.dirty} />
          </View>
        </View>
      </View>

      {/* Today's Outfit */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today&apos;s Outfit</Text>
        {todayLogs && todayLogs.length > 0 ? (
          <View style={styles.todayOutfitCard}>
            {todayLogs.map((log: any) => (
              <View key={log.id} style={styles.todayItem}>
                <View style={styles.todayItemImage}>
                  <Text style={styles.todayItemEmoji}>
                    {log.item?.category?.icon ?? '👕'}
                  </Text>
                </View>
                <Text style={styles.todayItemName} numberOfLines={1}>
                  {log.item?.name ?? 'Unknown'}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.emptyOutfitCard}
            onPress={() => router.push('/(tabs)/add')}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={32} color={Colors.textTertiary} />
            <Text style={styles.emptyOutfitText}>Log today&apos;s outfit</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Laundry Alerts */}
      {dirtyItems.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🧺 Needs Washing</Text>
            <TouchableOpacity onPress={handleWashAll} style={styles.washAllButton}>
              <Text style={styles.washAllText}>Wash All</Text>
            </TouchableOpacity>
          </View>
          {dirtyItems.slice(0, 5).map((item) => (
            <View key={item.id} style={styles.alertItem}>
              <View style={styles.alertDot} />
              <Text style={styles.alertItemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.alertItemCount}>
                {item.wear_count}/{item.wash_threshold} wears
              </Text>
            </View>
          ))}
          {dirtyItems.length > 5 && (
            <Text style={styles.moreItems}>+{dirtyItems.length - 5} more items</Text>
          )}
        </View>
      )}

      {/* Approaching Threshold */}
      {approachingItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Almost Dirty</Text>
          {approachingItems.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.warningItem}>
              <Text style={styles.alertItemName} numberOfLines={1}>{item.name}</Text>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${calculateWearProgress(item.wear_count, item.wash_threshold) * 100}%`,
                      backgroundColor: Colors.warning,
                    },
                  ]}
                />
              </View>
              <Text style={styles.alertItemCount}>
                {item.wear_count}/{item.wash_threshold}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Empty State */}
      {totalItems === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>👗</Text>
          <Text style={styles.emptyStateTitle}>Your wardrobe is empty</Text>
          <Text style={styles.emptyStateSubtitle}>
            Start by adding your first clothing item
          </Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => router.push('/(tabs)/add')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color={Colors.textInverse} />
            <Text style={styles.emptyStateButtonText}>Add Your First Item</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: Spacing.xl,
    paddingBottom: Spacing.massive,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  greeting: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: FontWeight.regular,
  },
  userName: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
    letterSpacing: -0.3,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statNumber: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  todayOutfitCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  todayItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  todayItemImage: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayItemEmoji: {
    fontSize: 28,
  },
  todayItemName: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    maxWidth: 64,
    textAlign: 'center',
  },
  emptyOutfitCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyOutfitText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },
  washAllButton: {
    backgroundColor: Colors.dirtyBg,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  washAllText: {
    fontSize: FontSize.sm,
    color: Colors.dirty,
    fontWeight: FontWeight.semibold,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dirty,
  },
  alertItemName: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontWeight: FontWeight.medium,
  },
  alertItemCount: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  progressBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: 2,
    maxWidth: 80,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  moreItems: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
    paddingTop: Spacing.md,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.huge,
    gap: Spacing.md,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyStateTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  emptyStateSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    ...Shadows.md,
  },
  emptyStateButtonText: {
    color: Colors.textInverse,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});
