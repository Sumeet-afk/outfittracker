export default {
  name: 'OutfitTracker',
  slug: 'outfittracker',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: 'outfittracker',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#FAFBFC',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.outfittracker.app',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FAFBFC',
    },
    package: 'com.outfittracker.app',
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-image',
    [
      'expo-camera',
      {
        cameraPermission:
          'Allow OutfitTracker to access your camera to photograph clothing items.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Allow OutfitTracker to access your photos to add clothing items.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_KEY,
    eas: {
      projectId: 'your-project-id',
    },
  },
};
