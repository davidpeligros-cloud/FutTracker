import React from 'react';
import { Platform, Text, View } from 'react-native';

const ENTITLEMENT_ID = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || 'premium';
const IOS_REVENUECAT_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || '';
const ANDROID_REVENUECAT_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || '';
const IOS_BANNER_ID = process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID || '';
const ANDROID_BANNER_ID = process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID || '';
const IOS_REWARDED_ID = process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID || '';
const ANDROID_REWARDED_ID = process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID || '';

let purchasesInstance = null;
let adsModule = null;

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
  const hasAdMobIds = Boolean(Platform.OS === 'ios' ? IOS_BANNER_ID || IOS_REWARDED_ID : ANDROID_BANNER_ID || ANDROID_REWARDED_ID);
  return {
    revenueCat: hasRevenueCatKey ? 'live' : 'demo',
    ads: hasAdMobIds ? 'live' : 'test',
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
    }) || packages[0];

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

export const showRewardedAd = () =>
  new Promise((resolve) => {
    const ads = getAdsModule();
    if (!ads?.RewardedAd || !ads?.RewardedAdEventType) {
      resolve({ rewarded: true, demo: true });
      return;
    }

    const rewarded = ads.RewardedAd.createForAdRequest(getRewardedUnitId());
    let earnedReward = false;

    const unsubscribeEarned = rewarded.addAdEventListener(ads.RewardedAdEventType.EARNED_REWARD, () => {
      earnedReward = true;
    });

    const unsubscribeLoaded = rewarded.addAdEventListener(ads.RewardedAdEventType.LOADED, () => {
      rewarded.show();
    });

    const unsubscribeClosed = rewarded.addAdEventListener(ads.AdEventType.CLOSED, () => {
      unsubscribeEarned();
      unsubscribeLoaded();
      unsubscribeClosed();
      resolve({ rewarded: earnedReward });
    });

    rewarded.load();
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
        <Text style={{ color: '#8e9bb1', fontSize: 12 }}>Anuncio listo para development build</Text>
      </View>
    );
  }

  return (
    <View style={style}>
      <BannerAd unitId={getBannerUnitId()} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}
