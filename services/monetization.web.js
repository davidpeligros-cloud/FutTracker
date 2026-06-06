import React from 'react';
import { Text, View } from 'react-native';

export const getMonetizationMode = () => ({
  revenueCat: 'web-demo',
  ads: 'web-demo',
});

export const initializeMonetization = async () => getMonetizationMode();

export const getSubscriptionStatus = async () => ({
  isPremium: false,
  planId: null,
  source: 'web-demo',
});

export const purchasePremiumPlan = async (planId) => ({
  success: true,
  demo: true,
  planId,
});

export const restorePremiumPurchases = async () => ({
  success: false,
  demo: true,
});

export const showInterstitialAd = async () => ({
  shown: false,
  demo: true,
});

export const showRewardedAd = async () => ({
  rewarded: true,
  demo: true,
});

export function NativeAdSlot({ style }) {
  return (
    <View style={style}>
      <Text style={{ color: '#8e9bb1', fontSize: 10, fontWeight: '700' }}>AD WEB</Text>
    </View>
  );
}
