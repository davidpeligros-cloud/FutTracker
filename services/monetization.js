import React from 'react';
import { NativeModules, Platform, Text, View } from 'react-native';

const ENTITLEMENT_ID = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || 'premium';
const IOS_REVENUECAT_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || '';
const ANDROID_REVENUECAT_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || '';
const IOS_BANNER_ID = process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID || '';
const ANDROID_BANNER_ID = process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID || '';
const IOS_INTERSTITIAL_ID = process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID || '';
const ANDROID_INTERSTITIAL_ID = process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID || '';
const IOS_REWARDED_ID = process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID || '';
const ANDROID_REWARDED_ID = process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID || '';

let purchasesInstance = null;
let adsModule = null;
const AD_LOAD_TIMEOUT_MS = 12000;

const getPurchases = () => {
  if (purchasesInstance) return purchasesInstance;
  try {
    const module = require('react-native-purchases');
    purchasesInstance = module.default || module;
    return purchasesInstance;
  } catch (error) {
    return null;
  }
};

const getAdsModule = () => {
  if (adsModule) return adsModule;
  if (!NativeModules.RNGoogleMobileAdsModule) return null;

  try {
    adsModule = require('react-native-google-mobile-ads');
    return adsModule;
  } catch (error) {
    return null;
  }
};

const getRevenueCatKey = () => (Platform.OS === 'ios' ? IOS_REVENUECAT_KEY : ANDROID_REVENUECAT_KEY);

export const getMonetizationMode = () => {
  const hasRevenueCatKey = Boolean(getRevenueCatKey());
  const hasNativeAdsModule = Boolean(NativeModules.RNGoogleMobileAdsModule);
  const hasAdMobIds = Boolean(
    Platform.OS === 'ios'
      ? IOS_BANNER_ID || IOS_INTERSTITIAL_ID || IOS_REWARDED_ID
      : ANDROID_BANNER_ID || ANDROID_INTERSTITIAL_ID || ANDROID_REWARDED_ID
  );
  return {
    revenueCat: hasRevenueCatKey ? 'live' : 'demo',
    ads: hasNativeAdsModule ? (hasAdMobIds ? 'live' : 'test') : 'expo-go',
  };
};

export const initializeMonetization = async () => {
  const mode = getMonetizationMode();
  const Purchases = getPurchases();
  const revenueCatKey = getRevenueCatKey();

  if (Purchases && revenueCatKey) {
    try {
      const { LOG_LEVEL } = require('react-native-purchases');
      if (LOG_LEVEL?.WARN) Purchases.setLogLevel(LOG_LEVEL.WARN);
      Purchases.configure({ apiKey: revenueCatKey });
    } catch (error) {
      mode.revenueCat = 'unavailable';
    }
  }

  const ads = getAdsModule();
  if (ads?.default) {
    try {
      await ads.default().setRequestConfiguration?.({
        maxAdContentRating: ads.MaxAdContentRating?.T || 'T',
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
        testDeviceIdentifiers: __DEV__ ? ['EMULATOR'] : [],
      });
      await ads.default().initialize();
    } catch (error) {
      mode.ads = 'unavailable';
    }
  }

  return mode;
};

export const getSubscriptionStatus = async () => {
  const Purchases = getPurchases();
  if (!Purchases) return { isPremium: false, planId: null, source: 'demo' };

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const activeEntitlement = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
    return {
      isPremium: Boolean(activeEntitlement),
      planId: activeEntitlement?.productIdentifier || null,
      source: activeEntitlement ? 'revenuecat' : 'revenuecat-free',
    };
  } catch (error) {
    return { isPremium: false, planId: null, source: 'unavailable' };
  }
};

export const purchasePremiumPlan = async (planId) => {
  const Purchases = getPurchases();
  if (!Purchases) return { success: true, demo: true, planId };

  try {
    const offerings = await Purchases.getOfferings();
    const packages = offerings?.current?.availablePackages || [];
    const selectedPackage = packages.find((item) => {
      const identifier = `${item.identifier || ''} ${item.packageType || ''} ${item.product?.identifier || ''}`.toLowerCase();
      return identifier.includes(planId);
    }) || (planId === 'lifetime' ? packages.find((item) => `${item.packageType || ''}`.toLowerCase().includes('lifetime')) : null) || packages[0];

    if (!selectedPackage) return { success: true, demo: true, planId };

    const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
    const activeEntitlement = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
    return {
      success: Boolean(activeEntitlement),
      planId: activeEntitlement?.productIdentifier || planId,
      source: 'revenuecat',
    };
  } catch (error) {
    if (error?.userCancelled) return { success: false, cancelled: true };
    return { success: true, demo: true, planId, error };
  }
};

export const restorePremiumPurchases = async () => {
  const Purchases = getPurchases();
  if (!Purchases) return { success: false, demo: true };

  try {
    const customerInfo = await Purchases.restorePurchases();
    const activeEntitlement = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
    return {
      success: Boolean(activeEntitlement),
      planId: activeEntitlement?.productIdentifier || null,
      source: 'revenuecat',
    };
  } catch (error) {
    return { success: false, error };
  }
};

const getRewardedUnitId = () => {
  const ads = getAdsModule();
  const testId = ads?.TestIds?.REWARDED || 'ca-app-pub-3940256099942544/5224354917';
  if (__DEV__) return testId;
  return Platform.OS === 'ios' ? IOS_REWARDED_ID || testId : ANDROID_REWARDED_ID || testId;
};

const getInterstitialUnitId = () => {
  const ads = getAdsModule();
  const testId = ads?.TestIds?.INTERSTITIAL || 'ca-app-pub-3940256099942544/1033173712';
  if (__DEV__) return testId;
  return Platform.OS === 'ios' ? IOS_INTERSTITIAL_ID || testId : ANDROID_INTERSTITIAL_ID || testId;
};

export const showInterstitialAd = () =>
  new Promise((resolve) => {
    const ads = getAdsModule();
    if (!ads?.InterstitialAd || !ads?.AdEventType) {
      resolve({ shown: false, demo: true });
      return;
    }

    const interstitial = ads.InterstitialAd.createForAdRequest(getInterstitialUnitId());
    let settled = false;
    const subscriptions = [];
    const cleanup = () => subscriptions.forEach((unsubscribe) => unsubscribe?.());
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      cleanup();
      resolve(result);
    };
    const timeoutId = setTimeout(() => finish({ shown: false, timeout: true }), AD_LOAD_TIMEOUT_MS);

    subscriptions.push(interstitial.addAdEventListener(ads.AdEventType.LOADED, () => {
      try {
        interstitial.show();
      } catch (error) {
        finish({ shown: false, error: true });
      }
    }));

    subscriptions.push(interstitial.addAdEventListener(ads.AdEventType.CLOSED, () => finish({ shown: true })));

    if (ads.AdEventType.ERROR) {
      subscriptions.push(interstitial.addAdEventListener(ads.AdEventType.ERROR, () => finish({ shown: false, error: true })));
    }

    try {
      interstitial.load();
    } catch (error) {
      finish({ shown: false, error: true });
    }
  });

export const showRewardedAd = () =>
  new Promise((resolve) => {
    const ads = getAdsModule();
    if (!ads?.RewardedAd || !ads?.RewardedAdEventType) {
      resolve({ rewarded: true, demo: true });
      return;
    }

    const rewarded = ads.RewardedAd.createForAdRequest(getRewardedUnitId());
    let earnedReward = false;
    let settled = false;
    const subscriptions = [];
    const cleanup = () => subscriptions.forEach((unsubscribe) => unsubscribe?.());
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      cleanup();
      resolve(result);
    };
    const timeoutId = setTimeout(() => finish({ rewarded: false, timeout: true }), AD_LOAD_TIMEOUT_MS);

    subscriptions.push(rewarded.addAdEventListener(ads.RewardedAdEventType.EARNED_REWARD, () => {
      earnedReward = true;
    }));

    subscriptions.push(rewarded.addAdEventListener(ads.RewardedAdEventType.LOADED, () => {
      try {
        rewarded.show();
      } catch (error) {
        finish({ rewarded: false, error: true });
      }
    }));

    subscriptions.push(rewarded.addAdEventListener(ads.AdEventType.CLOSED, () => finish({ rewarded: earnedReward })));

    if (ads.AdEventType.ERROR) {
      subscriptions.push(rewarded.addAdEventListener(ads.AdEventType.ERROR, () => finish({ rewarded: false, error: true })));
    }

    try {
      rewarded.load();
    } catch (error) {
      finish({ rewarded: false, error: true });
    }
  });

const getBannerUnitId = () => {
  const ads = getAdsModule();
  const testId = ads?.TestIds?.BANNER || 'ca-app-pub-3940256099942544/6300978111';
  if (__DEV__) return testId;
  return Platform.OS === 'ios' ? IOS_BANNER_ID || testId : ANDROID_BANNER_ID || testId;
};

export function NativeAdSlot({ style }) {
  const ads = getAdsModule();
  const BannerAd = ads?.BannerAd;
  const BannerAdSize = ads?.BannerAdSize;

  if (!BannerAd || !BannerAdSize) {
    return (
      <View style={style}>
        <Text style={{ color: '#8e9bb1', fontSize: 10, fontWeight: '700' }}>AD</Text>
      </View>
    );
  }

  return (
    <View style={style}>
      <BannerAd unitId={getBannerUnitId()} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}
