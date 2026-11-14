import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { User, Heart, Gift } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

export default function PairingScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);

  const slides = [
    {
      title: t('pairing.slide1Title'),
      body: t('pairing.slide1Body'),
      icon: <User size={64} color="#8f7161" />,
    },
    {
      title: t('pairing.slide2Title'),
      body: t('pairing.slide2Body'),
      icon: <Heart size={64} color="#8f7161" />,
    },
    {
      title: t('pairing.slide3Title'),
      body: t('pairing.slide3Body'),
      icon: <Gift size={64} color="#8f7161" />,
    }
  ];

  const generateCoupleId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateCouple = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const newCoupleId = generateCoupleId();
      const coupleRef = doc(db, 'couples', newCoupleId);
      const coupleSnap = await getDoc(coupleRef);

      if (coupleSnap.exists()) {
        Alert.alert(t('common.error'), t('pairing.createError'));
        setLoading(false);
        return;
      }

      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      const userData = userDocSnap.exists() ? userDocSnap.data() : {};

      await setDoc(coupleRef, {
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser.uid,
        users: [auth.currentUser.uid],
        currency: '¥',
        members: {
          [auth.currentUser.uid]: {
            name: userData.name || 'User',
            icon: userData.icon || '😊',
            color: userData.color || 'pink',
            joinedAt: new Date().toISOString()
          }
        }
      });

      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, {
        coupleId: newCoupleId,
        isSetupCompleted: false
      }, { merge: true });

    } catch (e) {
      console.error("Error in handleCreateCouple:", e);
      Alert.alert(t('common.error'), t('pairing.coupleCreateError'));
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      handleCreateCouple();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-screen">
      <View className="flex-1 items-center justify-center px-8">
        {/* Icon Circle */}
        <View className="w-32 h-32 bg-white rounded-full items-center justify-center shadow-sm mb-12">
          {slides[step].icon}
        </View>

        {/* Text Content */}
        <View className="w-full space-y-6 mb-12">
          <Text className="text-2xl font-bold text-[#8f7161] text-center leading-9">
            {slides[step].title}
          </Text>
          <Text className="text-[#8f7161] text-center leading-6 opacity-80">
            {slides[step].body}
          </Text>
        </View>

        {/* Indicators */}
        <View className="flex-row space-x-2 mb-12">
          {slides.map((_, i) => (
            <View
              key={i}
              className={`h-2 rounded-full transition-all ${i === step ? 'w-8 bg-[#8f7161]' : 'w-2 bg-[#dcc2b6]'
                }`}
            />
          ))}
        </View>

        {/* Button */}
        <TouchableOpacity
          onPress={handleNext}
          disabled={loading}
          className="w-full bg-[#8f7161] py-4 rounded-xl items-center shadow-md active:opacity-90"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">
              {step === slides.length - 1 ? t('pairing.startButton') : t('pairing.nextButton')}
            </Text>
          )}
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}
