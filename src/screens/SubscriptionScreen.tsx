import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { X, Check } from 'lucide-react-native';
import { SubscriptionService } from '../services/SubscriptionService';
import { PurchasesPackage } from 'react-native-purchases';
import { auth } from '../../firebaseConfig';
import { useTranslation } from 'react-i18next';

export default function SubscriptionScreen({ navigation }: any) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [offering, setOffering] = useState<PurchasesPackage | null>(null);

  useEffect(() => {
    const fetchOfferings = async () => {
      setLoading(true);
      const currentOffering = await SubscriptionService.getOfferings();
      if (currentOffering && currentOffering.availablePackages.length > 0) {
        setOffering(currentOffering.availablePackages[0]); // Default to first package (Annual usually)
      }
      setLoading(false);
    };
    fetchOfferings();
  }, []);

  const handlePurchase = async () => {
    if (!offering || !auth.currentUser) return;

    setLoading(true);
    try {
      const success = await SubscriptionService.purchasePackage(offering, auth.currentUser.uid);
      if (success) {
        Alert.alert(t('subscription.thankYou'), t('subscription.proActivated'));
        navigation.goBack();
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert(t('common.error'), t('subscription.purchaseError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const success = await SubscriptionService.restorePurchases(auth.currentUser.uid);
      if (success) {
        Alert.alert(t('subscription.restoreComplete'), t('subscription.restoreSuccess'));
      } else {
        Alert.alert(t('subscription.restoreFailed'), t('subscription.restoreNotFound'));
      }
    } catch (e) {
      Alert.alert(t('common.error'), t('subscription.restoreError'));
    } finally {
      setLoading(false);
    }
  };

  const priceString = offering ? SubscriptionService.getFormattedPrice(offering) : "¥300"; // Fallback/Loading price

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-6 py-4 flex-row justify-between items-center">
        <Text className="text-lg font-bold text-stone-800"></Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X color="#57534e" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6">
        <View className="items-center mb-8">
          <Text className="text-2xl font-bold text-stone-800 mb-2">{t('subscription.title')}</Text>
          <Text className="text-stone-500 text-center">
            {t('subscription.description')}
          </Text>
        </View>

        <View className="bg-orange-50 p-6 rounded-3xl mb-8 border border-orange-100">
          <View className="flex-row items-center mb-4">
            <View className="bg-orange-100 p-1 rounded-full mr-3">
              <Check size={16} color="#f97316" />
            </View>
            <Text className="text-stone-700 font-bold">{t('subscription.unlimitedPhotos')}</Text>
          </View>
          <View className="flex-row items-center">
            <View className="bg-orange-100 p-1 rounded-full mr-3">
              <Check size={16} color="#f97316" />
            </View>
            <Text className="text-stone-700 font-bold">{t('subscription.period', { price: priceString })}</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handlePurchase}
          disabled={loading || !offering}
          className={`py-5 rounded-2xl items-center shadow-lg mb-4 ${loading || !offering ? 'bg-stone-300' : 'bg-[#d47d76]'}`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text className="text-white font-bold text-lg">{t('subscription.subscribeButton', { price: priceString })}</Text>
              <Text className="text-white/80 text-xs mt-1">{t('subscription.monthlyEquivalent')}</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRestore} disabled={loading} className="items-center py-4">
          <Text className="text-stone-400 font-bold">{t('subscription.restoreButton')}</Text>
        </TouchableOpacity>

        <Text className="text-[10px] text-stone-400 text-center mb-2 leading-4 px-2">
          {t('subscription.termsNote')}
        </Text>
        <View className="flex-row justify-center mt-2">
          <TouchableOpacity onPress={() => navigation.navigate('TermsOfService')} className="mx-2">
            <Text className="text-xs text-stone-400 underline">{t('subscription.termsLink')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')} className="mx-2">
            <Text className="text-xs text-stone-400 underline">{t('subscription.privacyLink')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
