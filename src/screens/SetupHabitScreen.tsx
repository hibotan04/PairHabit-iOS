import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, SafeAreaView, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { useNavigation, useRoute } from '@react-navigation/native';
import { EmojiKeyboard } from 'rn-emoji-keyboard';
import { THEME_PALETTES } from '../constants/theme';
import { useTranslation } from 'react-i18next';

export default function SetupHabitScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { coupleId, themeColor = '#8f7161' } = route.params;

  const dynamicTheme = THEME_PALETTES[themeColor];
  const screenBg = dynamicTheme?.global?.bg || '#fff9fb';

  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState('¥'); // Default currency
  const [emoji, setEmoji] = useState('✨');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [customEmoji, setCustomEmoji] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const emojis = ["💪", "📚", "🍳", "🧹", "💤", "🏃", "🧘", "✨", "💧", "🥗"];
  const currencies = ["¥", "$", "❤︎", "Pt", "custom"];

  const handleNext = async () => {

    if (!name || !value) {
      Alert.alert(t('common.error'), t('setupHabit.validationHabitError'));
      return;
    }

    if (!currency) {
      Alert.alert(t('common.error'), t('setupHabit.validationUnitError'));
      return;
    }

    if (!auth.currentUser?.uid) {
      Alert.alert(t('common.error'), t('setupHabit.validationAuthError'));
      return;
    }

    setIsLoading(true);
    try {
      // 1. Save Currency Setting to Couple Doc
      const coupleRef = doc(db, 'couples', coupleId);
      await updateDoc(coupleRef, {
        currency: currency
      });

      // 2. Save Habit
      await addDoc(collection(db, 'couples', coupleId, 'habits'), {
        name,
        value: parseInt(value),
        emoji,
        history: {},
        ownerId: auth.currentUser?.uid,
        createdAt: new Date().toISOString()
      });

      console.log("Success! Navigating...");
      setIsLoading(false);
      navigation.navigate('OnboardingSetupReward', { coupleId, themeColor, currency });
    } catch (e: any) {
      console.error("Error adding habit:", e);
      Alert.alert(t('common.error'), t('setupHabit.saveError', { message: e.message }));
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-screen">
      <ScrollView className="flex-1 p-6">
        <View className="items-center mb-8 mt-4">
          <Text className="text-2xl font-bold text-[#8f7161] text-center mb-2">{t('setupHabit.title')}</Text>
          <Text className="text-[#8f7161] text-center opacity-80">
            {t('setupHabit.subtitle')}
          </Text>
        </View>

        <View className="bg-white p-6 rounded-3xl shadow-sm mb-8">
          <View className="mb-6">
            <Text className="text-sm font-bold text-[#8f7161] mb-2">{t('setupHabit.nameLabel')} <Text className="text-red-500">*</Text></Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('setupHabit.namePlaceholder')}
              placeholderTextColor="#dcc2b6"
              className="w-full p-4 bg-stone-100 rounded-xl font-bold text-[#8f7161]"
            />
            <Text className="text-xs text-[#8f7161] mt-2 opacity-60 ml-1">
              {t('setupHabit.nameHint')}
            </Text>
          </View>

          {/* Currency Selection */}
          <View className="mb-6">
            <Text className="text-sm font-bold text-[#8f7161] mb-2">{t('setupHabit.unitLabel')}</Text>
            <View className="flex-row gap-2 flex-wrap">
              {currencies.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCurrency(c === "custom" ? "" : c)}
                  className={`px-4 py-2 rounded-xl border ${(currency === c || (c === "custom" && !["¥", "$", "❤︎", "Pt"].includes(currency)))
                    ? 'bg-[#8f7161] border-[#8f7161]'
                    : 'bg-transparent border-[#dcc2b6]'
                    }`}
                >
                  <Text className={`font-bold ${(currency === c || (c === "custom" && !["¥", "$", "❤︎", "Pt"].includes(currency))) ? 'text-white' : 'text-[#8f7161]'}`}>{c === "custom" ? t('setupHabit.customUnit') : c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Custom Currency Input */}
            {!["¥", "$", "❤︎", "Pt"].includes(currency) && (
              <TextInput
                value={currency}
                onChangeText={setCurrency}
                placeholder={t('setupHabit.unitPlaceholder')}
                placeholderTextColor="#dcc2b6"
                className="mt-2 w-full p-4 bg-stone-100 rounded-xl font-bold text-[#8f7161]"
              />
            )}
          </View>

          <View className="mb-6">
            <Text className="text-sm font-bold text-[#8f7161] mb-2">{t('setupHabit.valueLabel', { currency })} <Text className="text-red-500">*</Text></Text>
            <View className="relative">
              <TextInput
                value={value}
                onChangeText={setValue}
                placeholder="100"
                placeholderTextColor="#dcc2b6"
                keyboardType="numeric"
                className="w-full p-4 bg-stone-100 rounded-xl font-bold text-[#8f7161]"
              />
            </View>
            <Text className="text-xs text-[#8f7161] mt-2 opacity-70">
              {t('setupHabit.valueHint')}
            </Text>
          </View>

          <View>
            <Text className="text-sm font-bold text-[#8f7161] mb-2">{t('setupHabit.iconLabel')}</Text>
            <View className="flex-row flex-wrap gap-2">
              {emojis.map((e) => (
                <TouchableOpacity
                  key={e}
                  onPress={() => setEmoji(e)}
                  className="w-12 h-12 items-center justify-center rounded-full bg-stone-100"
                  style={{ transform: [{ scale: emoji === e ? 1.25 : 1 }] }}
                >
                  <Text className="text-2xl">{e}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setShowEmojiPicker(true)}
                className="w-12 h-12 items-center justify-center rounded-full bg-stone-100"
              >
                <Text className="text-2xl text-[#8f7161]">+</Text>
              </TouchableOpacity>
            </View>
            <View className="mt-4 items-center">
              <Text className="text-sm text-[#8f7161] mb-2">{t('setupHabit.selectedIcon')}</Text>
              <View className="w-16 h-16 bg-stone-100 rounded-full items-center justify-center">
                <Text className="text-4xl">{emoji}</Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleNext}
          disabled={isLoading}
          className={`bg-[#8f7161] py-4 rounded-2xl shadow-md active:opacity-90 ${isLoading ? 'opacity-70' : ''}`}
        >
          {isLoading ? (
            <View className="flex-row justify-center items-center gap-2">
              <ActivityIndicator color="white" />
              <Text className="text-white text-center font-bold text-lg">{t('setupHabit.processingButton')}</Text>
            </View>
          ) : (
            <Text className="text-white text-center font-bold text-lg">{t('setupHabit.nextButton')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('OnboardingSetupReward', { coupleId, themeColor, currency })}
          disabled={isLoading}
          className="mt-4 py-2 mb-8"
        >
          <Text className="text-[#8f7161] text-center font-bold text-sm opacity-60">
            {isLoading ? t('setupHabit.processingButton') : t('setupHabit.laterButton')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showEmojiPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <EmojiKeyboard
            onEmojiSelected={(emojiObject) => {
              setEmoji(emojiObject.emoji);
              setShowEmojiPicker(false);
            }}
            enableSearchBar
            categoryPosition="top"
            translation={{
              search: t('setupHabit.emojiSearch'),
              recently_used: t('setupHabit.emojiRecentlyUsed'),
              smileys_emotion: t('setupHabit.emojiSmileys'),
              people_body: t('setupHabit.emojiPeople'),
              animals_nature: t('setupHabit.emojiAnimals'),
              food_drink: t('setupHabit.emojiFood'),
              travel_places: t('setupHabit.emojiTravel'),
              activities: t('setupHabit.emojiActivities'),
              objects: t('setupHabit.emojiObjects'),
              symbols: t('setupHabit.emojiSymbols'),
              flags: t('setupHabit.emojiFlags'),
            }}
            theme={{
              container: '#fdfbf7',
              header: '#8f7161',
              knob: '#8f7161',
              search: {
                text: '#8f7161',
                placeholder: '#dcc2b6',
                icon: '#8f7161',
                background: '#fff',
              },
              category: {
                icon: '#dcc2b6',
                iconActive: '#8f7161',
                container: '#fdfbf7',
                containerActive: '#fff',
              },
            }}
            styles={{
              container: {
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                height: '50%',
              },
              header: {
                color: '#8f7161',
                fontFamily: 'System',
              }
            }}
          />
        </View>
      </Modal >
    </SafeAreaView >
  );
}
