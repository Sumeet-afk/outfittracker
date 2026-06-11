/**
 * Item Detail Screen
 *
 * View and edit a single clothing item.
 * Log wear, wash, edit details, or delete.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { supabase } from '../../lib/supabase';
import { logWear, washItem, calculateWearProgress } from '../../services/laundryEngine';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '../../styles/theme';
import type { Item } from '../../lib/types';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editThreshold, setEditThreshold] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Fetch item
  const { data: item, isLoading } = useQuery({
    queryKey: ['item', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*, category:categories(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Item;
    },
    enabled: !!id,
  });

  // Fetch wear history for this item
  const { data: wearHistory = [] } = useQuery({
    queryKey: ['wear_logs', 'item', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wear_logs')
        .select('*')
        .eq('item_id', id)
        .order('date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  // Log wear mutation
  const logWearMutation = useMutation({
    mutationFn: () => {
      const today = new Date().toISOString().split('T')[0];
      return logWear(id!, today);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item', id] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['wear_logs'] });
    },
  });

  // Wash mutation
  const washMutation = useMutation({
    mutationFn: () => washItem(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item', id] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('items')
        .update({
          name: editName.trim(),
          wash_threshold: parseInt(editThreshold, 10),
          notes: editNotes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item', id] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      setIsEditing(false);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      router.back();
    },
  });

  const handleDelete = useCallback(() => {
    if (Platform.OS === 'web') {
      if (confirm('Delete this item? This cannot be undone.')) {
        deleteMutation.mutate();
      }
    } else {
      Alert.alert(
        'Delete Item',
        'This will permanently remove the item and all its wear history.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
        ]
      );
    }
  }, [deleteMutation]);

  const startEditing = useCallback(() => {
    if (item) {
      setEditName(item.name);
      setEditThreshold(String(item.wash_threshold));
      setEditNotes(item.notes ?? '');
      setIsEditing(true);
    }
  }, [item]);

  if (isLoading || !item) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const progress = calculateWearProgress(item.wear_count, item.wash_threshold);
  const isDirty = item.status === 'dirty';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Image */}
      <View style={styles.heroSection}>
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.heroImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Text style={styles.heroEmoji}>
              {(item.category as any)?.icon ?? '👕'}
            </Text>
          </View>
        )}

        {/* Status Badge */}
        <View style={[styles.statusBadge, isDirty ? styles.statusDirty : styles.statusClean]}>
          <Ionicons
            name={isDirty ? 'water' : 'checkmark-circle'}
            size={14}
            color={Colors.textInverse}
          />
          <Text style={styles.statusText}>{isDirty ? 'Needs Wash' : 'Clean'}</Text>
        </View>
      </View>

      {/* Info Section */}
      {isEditing ? (
        <View style={styles.editSection}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>NAME</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              accessibilityLabel="Edit item name"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>WASH AFTER (wears)</Text>
            <TextInput
              style={styles.input}
              value={editThreshold}
              onChangeText={setEditThreshold}
              keyboardType="number-pad"
              accessibilityLabel="Edit wash threshold"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>NOTES</Text>
            <TextInput
              style={[styles.input, { minHeight: 60 }]}
              value={editNotes}
              onChangeText={setEditNotes}
              multiline
              accessibilityLabel="Edit notes"
            />
          </View>
          <View style={styles.editActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setIsEditing(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveEditButton}
              onPress={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.textInverse} />
              ) : (
                <Text style={styles.saveEditButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.infoHeader}>
            <View style={styles.infoHeaderLeft}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemCategory}>
                {(item.category as any)?.icon ?? '📁'} {(item.category as any)?.name ?? 'Uncategorized'}
              </Text>
            </View>
            <TouchableOpacity style={styles.editButton} onPress={startEditing}>
              <Ionicons name="pencil-outline" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Wear Progress */}
          <View style={styles.wearSection}>
            <View style={styles.wearHeader}>
              <Text style={styles.wearLabel}>Wear Progress</Text>
              <Text style={styles.wearCount}>
                {item.wear_count} / {item.wash_threshold} wears
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
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
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.wearButton]}
              onPress={() => logWearMutation.mutate()}
              disabled={logWearMutation.isPending || isDirty}
              activeOpacity={0.7}
            >
              <Ionicons name="body-outline" size={20} color={Colors.textInverse} />
              <Text style={styles.actionButtonText}>
                {logWearMutation.isPending ? 'Logging...' : 'Log Wear'}
              </Text>
            </TouchableOpacity>

            {isDirty && (
              <TouchableOpacity
                style={[styles.actionButton, styles.washButton]}
                onPress={() => washMutation.mutate()}
                disabled={washMutation.isPending}
                activeOpacity={0.7}
              >
                <Ionicons name="water-outline" size={20} color={Colors.textInverse} />
                <Text style={styles.actionButtonText}>
                  {washMutation.isPending ? 'Washing...' : 'Mark Washed'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Notes */}
          {item.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.sectionLabel}>NOTES</Text>
              <Text style={styles.notesText}>{item.notes}</Text>
            </View>
          )}

          {/* Color swatch */}
          {item.color && (
            <View style={styles.colorSection}>
              <Text style={styles.sectionLabel}>COLOR</Text>
              <View style={styles.colorDisplay}>
                <View style={[styles.colorDot, { backgroundColor: item.color }]} />
              </View>
            </View>
          )}

          {/* Wear History */}
          <View style={styles.historySection}>
            <Text style={styles.sectionLabel}>RECENT WEAR HISTORY</Text>
            {wearHistory.length > 0 ? (
              wearHistory.map((log: any) => (
                <View key={log.id} style={styles.historyItem}>
                  <Ionicons name="calendar-outline" size={16} color={Colors.textTertiary} />
                  <Text style={styles.historyDate}>
                    {new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.noHistory}>No wear history yet</Text>
            )}
          </View>

          {/* Delete */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.accent} />
            <Text style={styles.deleteButtonText}>Delete Item</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingBottom: Spacing.massive,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  heroSection: {
    width: '100%',
    height: 320,
    backgroundColor: Colors.surfaceElevated,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: {
    fontSize: 80,
  },
  statusBadge: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  statusClean: {
    backgroundColor: Colors.clean,
  },
  statusDirty: {
    backgroundColor: Colors.dirty,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textInverse,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.xl,
    paddingBottom: 0,
  },
  infoHeaderLeft: {
    flex: 1,
  },
  itemName: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  itemCategory: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  wearSection: {
    margin: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  wearHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  wearLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  wearCount: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  wearButton: {
    backgroundColor: Colors.primary,
  },
  washButton: {
    backgroundColor: Colors.dirty,
  },
  actionButtonText: {
    color: Colors.textInverse,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  notesSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  notesText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  colorSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  colorDisplay: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  historySection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  historyDate: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  noHistory: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
    backgroundColor: Colors.accent + '08',
  },
  deleteButtonText: {
    color: Colors.accent,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  // Edit mode
  editSection: {
    padding: Spacing.xl,
  },
  field: {
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  saveEditButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    ...Shadows.sm,
  },
  saveEditButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textInverse,
  },
});
