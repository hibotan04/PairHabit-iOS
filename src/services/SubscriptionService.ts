import Purchases, { PurchasesOffering, PurchasesPackage, CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import { Platform, Alert } from 'react-native';
import { db } from '../../firebaseConfig';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { PurchasesConfig } from '../config/PurchasesConfig';
import i18n from '../i18n';

const ENTITLEMENT_ID = 'Pro';

export const SubscriptionService = {

  init: async (userId?: string) => {
    const apiKey = Platform.select({
      ios: PurchasesConfig.appleApiKey,
      android: PurchasesConfig.googleApiKey
    });

    if (!apiKey) {
      console.warn("[SubscriptionService] API Key missing! Check src/config/PurchasesConfig.ts");
      return;
    }

    try {
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }
      Purchases.configure({ apiKey });

      if (userId) {
        await Purchases.logIn(userId);
      }
    } catch (e) {
      console.error("[SubscriptionService] Init failed", e);
    }
  },

  getOfferings: async (): Promise<any | null> => {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
        return offerings.current;
      }
    } catch (e) {
      console.error("[SubscriptionService] Error fetching offerings", e);
    }
    return null;
  },

  purchasePackage: async (pack: any, userId: string) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pack);
      return await SubscriptionService.checkSubscriptionStatus(customerInfo, userId);
    } catch (e: any) {
      if (!e.userCancelled) {
        console.error("[SubscriptionService] Purchase error", e);
        Alert.alert(i18n.t('common.error'), i18n.t('subscription.purchaseProcessingError'));
      }
      return false;
    }
  },

  restorePurchases: async (userId: string) => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      return await SubscriptionService.checkSubscriptionStatus(customerInfo, userId);
    } catch (e) {
      console.error("[SubscriptionService] Restore error", e);
      return false;
    }
  },

  checkSubscriptionStatus: async (customerInfo: any, userId: string) => {
    try {
      let isPro = false;
      let isSponsor = false;

      // 1. Check RevenueCat Status
      if (customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]) {
        isPro = true;
      }

      // 2. Fallback: Check Firestore for 'isSponsor' (Manual override)
      if (userId) {
        try {
          const userRef = doc(db, 'users', userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            isSponsor = userSnap.data().isSponsor === true;
            if (isSponsor) isPro = true;
          }

          // Sync status back to Firestore
          await updateDoc(userRef, {
            isPro: isPro,
            lastSubscriptionCheck: new Date().toISOString()
          });
        } catch (err) {
          console.error("Error checking/syncing status:", err);
        }
      }

      console.log(`[SubscriptionService] Status Check: isPro=${isPro} (Sponsor: ${isSponsor})`);
      return isPro;
    } catch (e) {
      console.error("Error checking subscription status:", e);
      return false; // Fail safe to false if error, but user might be Pro... tricky. Better to assume false for security.
    }
  },

  getFormattedPrice: (pack: any) => {
    return pack.product.priceString;
  }
};
