const androidAdMobAppId = process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713';
const iosAdMobAppId = process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || 'ca-app-pub-3940256099942544~1458002511';

export default {
  expo: {
    name: 'FútbolLive',
    slug: 'futbol-live-app',
    owner: 'peligros_jrr',
    scheme: 'futbollive',
    version: '1.0.0',
    orientation: 'portrait',
    platforms: ['ios', 'android'],
    sdkVersion: '54.0.0',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    updates: {
      fallbackToCacheTimeout: 0,
    },
    assetBundlePatterns: ['**/*'],
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#05070c',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.futbollive.app',
      buildNumber: '1',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: 'com.futbollive.app',
      versionCode: 1,
      edgeToEdgeEnabled: true,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#05070c',
      },
      permissions: ['INTERNET'],
    },
    extra: {
      eas: {
        projectId: 'd03b5b27-0cdb-41a1-875a-83e614bba296',
      },
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
