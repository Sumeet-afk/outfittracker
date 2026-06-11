/**
 * Add Item Screen — Camera/gallery capture + form
 *
 * Allows users to add new clothing items with:
 * - Photo capture from camera or gallery
 * - Name, category, color, wash threshold
 * - Upload to Supabase Storage
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { generateClothingImage } from '../../services/imageGeneration';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import {
  DEFAULT_WASH_THRESHOLD,
  ITEM_COLORS,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  STORAGE_BUCKET,
} from '../../lib/constants';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '../../styles/theme';

export default function AddItemScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [washThreshold, setWashThreshold] = useState(String(DEFAULT_WASH_THRESHOLD));
  const [notes, setNotes] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [removeBg, setRemoveBg] = useState(true);
  const [bgProgress, setBgProgress] = useState('');
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

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

  // Generate Image from AI
  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) {
      setError('Please enter a description for the AI.');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    
    try {
      const generatedUri = await generateClothingImage(aiPrompt.trim());
      setImageUri(generatedUri);
      setShowAiInput(false);
      setAiPrompt('');
      // If we used AI, set a default name if it's empty
      if (!name) {
        // Simple title case for the prompt
        const defaultName = aiPrompt
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        setName(defaultName);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate image.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Image picker
  const pickImage = useCallback(async (useCamera: boolean) => {
    try {
      const permissionResult = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        setError('Permission to access photos is required.');
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [3, 4],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [3, 4],
            quality: 0.8,
          });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Validate file size
        if (asset.fileSize && asset.fileSize > MAX_IMAGE_SIZE) {
          setError('Image is too large. Maximum size is 10MB.');
          return;
        }

        setImageUri(asset.uri);
        setError('');
      }
    } catch (err) {
      setError('Failed to pick image. Please try again.');
    }
  }, []);

  // Upload image to Supabase Storage
  const uploadImage = async (uri: string, customBlob?: Blob): Promise<string | null> => {
    if (!user) return null;

    try {
      // If we processed a transparent PNG, force extension to .png
      const fileExt = customBlob ? 'png' : (uri.split('.').pop()?.toLowerCase() ?? 'jpg');
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const blob = customBlob ?? await (await fetch(uri)).blob();

      // Validate MIME type
      const mimeType = blob.type;
      if (!ALLOWED_IMAGE_TYPES.includes(mimeType as any)) {
        setError('Invalid image type. Only JPEG, PNG, and WebP are allowed.');
        return null;
      }

      const { data, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, blob, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (err) {
      setError('Failed to upload image.');
      return null;
    }
  };

  // Save item mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Please enter an item name.');

      const threshold = parseInt(washThreshold, 10);
      if (isNaN(threshold) || threshold < 0) {
        throw new Error('Wash threshold must be 0 or more.');
      }

      let imageUrl: string | null = null;
      if (imageUri) {
        if (removeBg && Platform.OS === 'web') {
          setBgProgress('Initializing AI...');
          const { processImageBackground } = await import('../../services/backgroundRemoval');
          const blob = await processImageBackground(imageUri, (status, pct) => {
            setBgProgress(`${status} ${pct}%`);
          });
          setBgProgress('Uploading...');
          imageUrl = await uploadImage(imageUri, blob);
        } else {
          imageUrl = await uploadImage(imageUri);
        }
      }

      const { data, error: insertError } = await supabase
        .from('items')
        .insert({
          name: name.trim(),
          category_id: categoryId,
          color: selectedColor,
          image_url: imageUrl,
          is_ai_generated: false,
          wash_threshold: threshold,
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      // Reset form
      setName('');
      setCategoryId(null);
      setSelectedColor(null);
      setWashThreshold(String(DEFAULT_WASH_THRESHOLD));
      setNotes('');
      setImageUri(null);
      setError('');
      setBgProgress('');
      router.push('/(tabs)/wardrobe');
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Image Section */}
      <View style={styles.imageSection}>
        {imageUri ? (
          <TouchableOpacity
            style={styles.imagePreviewContainer}
            onPress={() => setImageUri(null)}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: imageUri }}
              style={styles.imagePreview}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.imageOverlay}>
              <Ionicons name="close-circle" size={32} color={Colors.textInverse} />
              <Text style={styles.imageOverlayText}>Tap to remove</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.imagePickers}>
            <TouchableOpacity
              style={styles.imagePickerButton}
              onPress={() => pickImage(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-outline" size={32} color={Colors.primary} />
              <Text style={styles.imagePickerText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.imagePickerButton}
              onPress={() => pickImage(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="images-outline" size={32} color={Colors.primary} />
              <Text style={styles.imagePickerText}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.imagePickerButton}
              onPress={() => setShowAiInput(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="color-wand-outline" size={32} color={Colors.primary} />
              <Text style={styles.imagePickerText}>AI Gen</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* AI Generation Input */}
        {showAiInput && !imageUri && (
          <View style={styles.aiInputContainer}>
            <Text style={styles.fieldLabel}>DESCRIBE THE CLOTHING</Text>
            <View style={styles.aiInputRow}>
              <TextInput
                style={[styles.input, styles.aiInput]}
                placeholder="e.g. Red leather jacket"
                placeholderTextColor={Colors.textTertiary}
                value={aiPrompt}
                onChangeText={setAiPrompt}
                editable={!isGenerating}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.aiGenerateButton, isGenerating && styles.aiGenerateButtonDisabled]}
                onPress={handleGenerateAI}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator color={Colors.textInverse} size="small" />
                ) : (
                  <Ionicons name="sparkles" size={20} color={Colors.textInverse} />
                )}
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={styles.aiCancelButton}
              onPress={() => setShowAiInput(false)}
              disabled={isGenerating}
            >
              <Text style={styles.aiCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Background Removal Toggle */}
        {Platform.OS === 'web' && (
          <View style={styles.bgRemovalRow}>
            <View style={styles.bgRemovalText}>
              <Text style={styles.bgRemovalLabel}>Remove Background (AI)</Text>
              <Text style={styles.bgRemovalHint}>Keeps your room private</Text>
            </View>
            <Switch
              value={removeBg}
              onValueChange={setRemoveBg}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.surface}
            />
          </View>
        )}
      </View>

      {/* Error */}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Name */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>NAME *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Blue Oxford Shirt"
          placeholderTextColor={Colors.textTertiary}
          value={name}
          onChangeText={setName}
          accessibilityLabel="Item name"
        />
      </View>

      {/* Category */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>CATEGORY</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {categories.map((cat: any) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryOption,
                categoryId === cat.id && styles.categoryOptionActive,
              ]}
              onPress={() => setCategoryId(cat.id === categoryId ? null : cat.id)}
            >
              <Text style={styles.categoryEmoji}>{cat.icon ?? '📁'}</Text>
              <Text
                style={[
                  styles.categoryName,
                  categoryId === cat.id && styles.categoryNameActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Color */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>COLOR</Text>
        <View style={styles.colorGrid}>
          {ITEM_COLORS.map((color) => (
            <TouchableOpacity
              key={color.value}
              style={[
                styles.colorSwatch,
                { backgroundColor: color.value },
                selectedColor === color.value && styles.colorSwatchActive,
                color.value === '#FFFFFF' && styles.colorSwatchWhite,
              ]}
              onPress={() => setSelectedColor(
                selectedColor === color.value ? null : color.value
              )}
              accessibilityLabel={color.name}
            >
              {selectedColor === color.value && (
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={
                    color.value === '#FFFFFF' || color.value === '#FCC419' || color.value === '#FFFDD0' || color.value === '#F5F0E1'
                      ? Colors.textPrimary
                      : Colors.textInverse
                  }
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Wash Threshold */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>WASH AFTER (wears)</Text>
        <View style={styles.thresholdRow}>
          <TouchableOpacity
            style={styles.thresholdButton}
            onPress={() => {
              const val = Math.max(0, parseInt(washThreshold, 10) - 1);
              setWashThreshold(String(val));
            }}
          >
            <Ionicons name="remove" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TextInput
            style={styles.thresholdInput}
            value={washThreshold}
            onChangeText={setWashThreshold}
            keyboardType="number-pad"
            textAlign="center"
            accessibilityLabel="Wash threshold number"
          />
          <TouchableOpacity
            style={styles.thresholdButton}
            onPress={() => {
              const val = parseInt(washThreshold, 10) + 1;
              setWashThreshold(String(val));
            }}
          >
            <Ionicons name="add" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.fieldHint}>
          Set to 0 for items that don&apos;t need washing (e.g., accessories)
        </Text>
      </View>

      {/* Notes */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>NOTES</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Any additional details..."
          placeholderTextColor={Colors.textTertiary}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          accessibilityLabel="Item notes"
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, saveMutation.isPending && styles.saveButtonDisabled]}
        onPress={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Save item"
      >
        {saveMutation.isPending ? (
          <View style={styles.progressContainer}>
            <ActivityIndicator color={Colors.textInverse} size="small" />
            {bgProgress ? <Text style={styles.progressText}>{bgProgress}</Text> : null}
          </View>
        ) : (
          <>
            <Ionicons name="checkmark" size={20} color={Colors.textInverse} />
            <Text style={styles.saveButtonText}>Add to Wardrobe</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
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
  imageSection: {
    marginBottom: Spacing.xxl,
  },
  imagePreviewContainer: {
    width: '100%',
    height: 280,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  imageOverlayText: {
    color: Colors.textInverse,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  imagePickers: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  imagePickerButton: {
    flex: 1,
    height: 140,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  imagePickerText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  aiInputContainer: {
    marginTop: Spacing.md,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '40', // soft primary border
  },
  aiInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  aiInput: {
    flex: 1,
    paddingVertical: Spacing.md,
  },
  aiGenerateButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiGenerateButtonDisabled: {
    opacity: 0.7,
  },
  aiCancelButton: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  aiCancelText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  bgRemovalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  bgRemovalText: {
    flex: 1,
  },
  bgRemovalLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  bgRemovalHint: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  progressText: {
    color: Colors.textInverse,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  errorBanner: {
    backgroundColor: '#FFF0F0',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
    marginBottom: Spacing.lg,
  },
  errorText: {
    color: Colors.accent,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  field: {
    marginBottom: Spacing.xxl,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  fieldHint: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notesInput: {
    minHeight: 80,
    paddingTop: Spacing.md,
  },
  categoryRow: {
    gap: Spacing.sm,
  },
  categoryOption: {
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
  categoryOptionActive: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryName: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  categoryNameActive: {
    color: Colors.primary,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  colorSwatchWhite: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  thresholdButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thresholdInput: {
    width: 64,
    height: 44,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg + 2,
    marginTop: Spacing.md,
    ...Shadows.md,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: Colors.textInverse,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.2,
  },
});
