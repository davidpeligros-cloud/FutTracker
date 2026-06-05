const androidAdMobAppId = process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713';
const iosAdMobAppId = process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || 'ca-app-pub-3940256099942544~1458002511';

export default {
  expo: {
    name: 'FutbolLive',
    slug: 'futbol-live-app',
    version: '1.0.0',
    orientation: 'portrait',
    platforms: ['ios', 'android'],
    sdkVersion: '54.0.0',
    updates: {
      fallbackToCacheTimeout: 0,
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.futbollive.app',
    },
    android: {
      package: 'com.futbollive.app',
    },
    plugins: [
      'expo-dev-client',
      [
        'react-native-google-mobile-ads',
        {
          androidAppId: androidAdMobAppId,
          iosAppId: iosAdMobAppId,
        },
      ],
    ],
  },
};
