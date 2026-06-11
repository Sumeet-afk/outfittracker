/**
 * Background Removal Service
 *
 * Uses @imgly/background-removal (WASM) for local, private processing.
 * Works entirely in-browser. Models are downloaded on first run.
 */
import { removeBackground } from '@imgly/background-removal';
import { Platform } from 'react-native';

/**
 * Removes the background from an image URI and returns a Blob.
 * Note: Only supported on Web in this current implementation.
 *
 * @param imageUri The local URI of the image (e.g., from ImagePicker)
 * @param onProgress Callback for model download and processing progress
 * @returns A PNG Blob with a transparent background
 */
export async function processImageBackground(
  imageUri: string,
  onProgress?: (status: string, progress: number) => void
): Promise<Blob> {
  if (Platform.OS !== 'web') {
    throw new Error('Background removal is currently only supported on Web in this version.');
  }

  try {
    const config = {
      // Use higher quality model for better edge detection
      model: 'isnet_fp16' as const,
      progress: (key: string, current: number, total: number) => {
        if (onProgress && total > 0) {
          const percentage = Math.round((current / total) * 100);
          onProgress(`Downloading AI Model (${key})...`, percentage);
        } else if (onProgress) {
          onProgress('Processing image...', 100);
        }
      },
    };

    const resultBlob = await removeBackground(imageUri, config);
    return resultBlob;
  } catch (error) {
    console.error('Background removal failed:', error);
    throw new Error('Failed to remove background. Please try again.');
  }
}
