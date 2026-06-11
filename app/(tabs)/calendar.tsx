/**
 * Calendar Screen — Visual outfit calendar
 *
 * Monthly view with outfit thumbnails on each day.
 * Tap a day to view/edit that day's outfit.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { logWear } from '../../services/laundryEngine';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '../../styles/theme';
import type { Item, WearLog } from '../../lib/types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CalendarScreen() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showItemPicker, setShowItemPicker] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  // Build month date range for query
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  // Fetch wear logs for the month
  const { data: wearLogs = [], isLoading } = useQuery({
    queryKey: ['wear_logs', monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wear_logs')
        .select('*, item:items(*, category:categories(*))')
        .gte('date', monthStart)
        .lte('date', monthEnd);
      if (error) throw error;
      return (data ?? []) as WearLog[];
    },
  });

  // Fetch all clean items (for the picker)
  const { data: cleanItems = [] } = useQuery({
    queryKey: ['items', 'clean'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*, category:categories(*)')
        .eq('status', 'clean')
        .order('name');
      if (error) throw error;
      return (data ?? []) as Item[];
    },
  });

  // Log wear mutation
  const logWearMutation = useMutation({
    mutationFn: ({ itemId, date }: { itemId: string; date: string }) =>
      logWear(itemId, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wear_logs'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      setShowItemPicker(false);
    },
  });

  // Group logs by date
  const logsByDate = wearLogs.reduce<Record<string, WearLog[]>>((acc, log) => {
    if (!acc[log.date]) acc[log.date] = [];
    acc[log.date].push(log);
    return acc;
  }, {});

  const navigateMonth = useCallback((direction: number) => {
    setCurrentDate(new Date(year, month + direction, 1));
  }, [year, month]);

  const handleDayPress = useCallback((dateStr: string) => {
    setSelectedDate(dateStr);
    setShowItemPicker(true);
  }, []);

  // Build calendar grid
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  // Pad to complete last row
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  return (
    <View style={styles.container}>
      {/* Month Navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity
          onPress={() => navigateMonth(-1)}
          style={styles.navButton}
          accessibilityLabel="Previous month"
        >
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {MONTHS[month]} {year}
        </Text>
        <TouchableOpacity
          onPress={() => navigateMonth(1)}
          style={styles.navButton}
          accessibilityLabel="Next month"
        >
          <Ionicons name="chevron-forward" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Day Headers */}
      <View style={styles.dayHeaders}>
        {DAYS.map((day) => (
          <Text key={day} style={styles.dayHeader}>{day}</Text>
        ))}
      </View>

      {/* Calendar Grid */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.calendarGrid}>
            {calendarCells.map((day, index) => {
              if (day === null) {
                return <View key={`empty-${index}`} style={styles.dayCell} />;
              }

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayLogs = logsByDate[dateStr] ?? [];
              const isToday = dateStr === today;
              const hasOutfit = dayLogs.length > 0;

              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[
                    styles.dayCell,
                    isToday && styles.dayCellToday,
                    hasOutfit && styles.dayCellWithOutfit,
                  ]}
                  onPress={() => handleDayPress(dateStr)}
                  activeOpacity={0.6}
                  accessibilityLabel={`${MONTHS[month]} ${day}${hasOutfit ? `, ${dayLogs.length} items worn` : ''}`}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      isToday && styles.dayNumberToday,
                    ]}
                  >
                    {day}
                  </Text>

                  {/* Outfit preview dots */}
                  {hasOutfit && (
                    <View style={styles.outfitDots}>
                      {dayLogs.slice(0, 3).map((log, i) => (
                        <View
                          key={log.id}
                          style={[
                            styles.outfitDot,
                            {
                              backgroundColor:
                                (log.item as any)?.color ??
                                Colors.categoryColors[i % Colors.categoryColors.length],
                            },
                          ]}
                        />
                      ))}
                      {dayLogs.length > 3 && (
                        <Text style={styles.moreDotsText}>+{dayLogs.length - 3}</Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected Day Detail */}
          {selectedDate && logsByDate[selectedDate] && (
            <View style={styles.selectedDayDetail}>
              <Text style={styles.selectedDayTitle}>
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              {logsByDate[selectedDate].map((log) => (
                <View key={log.id} style={styles.logItem}>
                  <View style={styles.logItemIcon}>
                    <Text style={styles.logItemEmoji}>
                      {(log.item as any)?.category?.icon ?? '👕'}
                    </Text>
                  </View>
                  <View style={styles.logItemInfo}>
                    <Text style={styles.logItemName}>
                      {(log.item as any)?.name ?? 'Unknown'}
                    </Text>
                    <Text style={styles.logItemCategory}>
                      {(log.item as any)?.category?.name ?? 'Item'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Item Picker Modal */}
      <Modal
        visible={showItemPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowItemPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log Wear</Text>
            <TouchableOpacity
              onPress={() => setShowItemPicker(false)}
              style={styles.modalClose}
            >
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>
            Select an item to log for {selectedDate}
          </Text>

          <FlatList
            data={cleanItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.pickerList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerItem}
                onPress={() => {
                  if (selectedDate) {
                    logWearMutation.mutate({ itemId: item.id, date: selectedDate });
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.pickerItemIcon}>
                  <Text style={styles.pickerItemEmoji}>
                    {(item.category as any)?.icon ?? '👕'}
                  </Text>
                </View>
                <View style={styles.pickerItemInfo}>
                  <Text style={styles.pickerItemName}>{item.name}</Text>
                  <Text style={styles.pickerItemMeta}>
                    {(item.category as any)?.name ?? 'Item'} · {item.wear_count}/{item.wash_threshold} wears
                  </Text>
                </View>
                <Ionicons name="add-circle-outline" size={24} color={Colors.accent} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyPicker}>
                <Text style={styles.emptyPickerText}>No clean items available</Text>
              </View>
            }
          />
        </View>
      </Modal>
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
    paddingVertical: Spacing.huge,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  monthTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  dayHeaders: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.xl,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayCellToday: {
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.md,
  },
  dayCellWithOutfit: {
    backgroundColor: Colors.cleanBg,
    borderRadius: BorderRadius.md,
  },
  dayNumber: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  dayNumberToday: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  outfitDots: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
    alignItems: 'center',
  },
  outfitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moreDotsText: {
    fontSize: 8,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },
  selectedDayDetail: {
    margin: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  selectedDayTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  logItemIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logItemEmoji: {
    fontSize: 20,
  },
  logItemInfo: {
    flex: 1,
  },
  logItemName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  logItemCategory: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  pickerList: {
    paddingHorizontal: Spacing.xl,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  pickerItemIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItemEmoji: {
    fontSize: 24,
  },
  pickerItemInfo: {
    flex: 1,
  },
  pickerItemName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  pickerItemMeta: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  emptyPicker: {
    alignItems: 'center',
    paddingVertical: Spacing.huge,
  },
  emptyPickerText: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
  },
});
