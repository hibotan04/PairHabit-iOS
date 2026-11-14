import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, SafeAreaView, ScrollView, Modal, ActivityIndicator, Switch } from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { useNavigation, useRoute } from '@react-navigation/native';
import { EmojiKeyboard } from 'rn-emoji-keyboard';
import { THEME_PALETTES } from '../constants/theme';
import { AuthContext } from '../context/AuthContext';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';

export default function SetupRewardScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { coupleId, themeColor = '#8f7161', currency = '¥' } = route.params || {};
  const { setIsSetupCompleted } = useContext(AuthContext);

  const dynamicTheme = THEME_PALETTES[themeColor];
  const screenBg = dynamicTheme?.global?.bg || '#fff9fb';

  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [days, setDays] = useState('7');
  const [rate, setRate] = useState('80');
  const [emoji, setEmoji] = useState('🍰'); // Default emoji
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const emojis = ["🍰", "🎢", "🎬", "🍜", "🧖‍♀️", "🍷", "✈️", "🎁", "💆", "🏰"];

  const handleFinish = async () => {
    if (!name || !cost) {
      Alert.alert(t('common.error'), t('setupReward.validationError'));
      return;
    }

    // Validation checks
    if (!coupleId) {
      Alert.alert(t('common.error'), t('setupReward.coupleIdError'));
      return;
    }
    if (!auth.currentUser) {
      Alert.alert(t('common.error'), t('setupReward.authError'));
      return;
    }

    setIsLoading(true);

    try {
      // Timeout Promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(t('setupReward.timeoutError'))), 10000)
      );

      // Operations Promise
      const operationPromise = (async () => {
        console.log("1. Adding reward doc...");
        await addDoc(collection(db, 'couples', coupleId, 'goals'), {
          name,
          cost: parseInt(cost),
          emoji,
          createdAt: new Date(),
          redeemed: false,
          ...(isAdvancedMode ? {
            conditions: {
              days: parseInt(days),
              rate: parseInt(rate)
            }
          } : {})
        });
        console.log("2. Reward added. Updating user setup status...");

        await updateDoc(doc(db, 'users', auth.currentUser!.uid), {
          isSetupCompleted: true
        });
        console.log("3. User updated. Done.");
        // Manually trigger local state update to ensure navigation happens immediately
        setIsSetupCompleted(true);
      })();

      await Promise.race([operationPromise, timeoutPromise]);

    } catch (error: any) {
      console.error("SetupReward Error:", error);
      Alert.alert(t('common.error'), t('setupReward.saveError', { message: error.message }));
      setIsLoading(false);
    } finally {
      // 1. Stop loading immediately
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!auth.currentUser) {
      Alert.alert(t('common.error'), t('setupReward.authError'));
      return;
    }

    setIsLoading(true);

    try {
      // Timeout Promise (10s)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(t('setupReward.timeoutError'))), 10000)
      );

      // Operations Promise
      const operationPromise = (async () => {
        console.log("1. Skipping reward. Updating user setup status...");
        await updateDoc(doc(db, 'users', auth.currentUser!.uid), {
          isSetupCompleted: true
        });
        console.log("2. User updated (Skip). Done.");
        // Manually trigger local state update to ensure navigation happens immediately
        setIsSetupCompleted(true);
      })();

      await Promise.race([operationPromise, timeoutPromise]);

    } catch (error: any) {
      console.error("SetupReward Skip Error:", error);
      Alert.alert(t('common.error'), t('setupReward.processError', { message: error.message }));
    } finally {
      // 1. Stop loading immediately
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: screenBg }}>
      <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 120 }}>
        <Text className="text-2xl font-bold text-[#441903] mb-2 text-center">{t('setupReward.title')}</Text>
        <Text className="text-[#8f7161] text-center mb-8 opacity-80">
          {t('setupReward.subtitle')}
        </Text>

        <View className="bg-white p-6 rounded-3xl shadow-sm mb-8">
          <View className="mb-6">
            <Text className="text-sm font-bold text-[#8f7161] mb-2">{t('setupReward.nameLabel')} <Text className="text-red-500">*</Text></Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('setupReward.namePlaceholder')}
              placeholderTextColor="#dcc2b6"
              className="w-full p-4 bg-stone-100 rounded-xl font-bold text-[#8f7161]"
            />
          </View>

          <View className="mb-6">
            <Text className="text-sm font-bold text-[#8f7161] mb-2">{t('setupReward.scoreLabel', { currency })} <Text className="text-red-500">*</Text></Text>
            <View className="relative">
              <TextInput
                value={cost}
                onChangeText={setCost}
                placeholder="20000"
                placeholderTextColor="#dcc2b6"
                keyboardType="numeric"
                className="w-full p-4 bg-stone-100 rounded-xl font-bold text-[#8f7161]"
              />
            </View>
          </View>

          {/* Advanced Rules Section (Honki Mode) */}
          <View className="mb-6 border-t border-stone-100 pt-4">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-sm font-bold text-[#8f7161]">{t('setupReward.advancedMode')}</Text>
                <Text className="text-xs text-[#8f7161] opacity-70 mt-1">{t('setupReward.advancedModeSub')}</Text>
              </View>
              <Switch
                value={isAdvancedMode}
                onValueChange={setIsAdvancedMode}
                trackColor={{ false: "#e5e5e5", true: themeColor === '#f0bfb1' ? '#ffe6e7' : '#8f7161' }}
                thumbColor={"white"}
              />
            </View>

            {isAdvancedMode && (
              <View className="bg-stone-100 p-4 rounded-xl">
                <Text className="text-xs font-bold text-[#8f7161] mb-3">{t('setupReward.ticketConditions')}</Text>
                <View className="flex-row items-center flex-wrap">
                  <Text className="text-[#8f7161] font-bold mr-2">{t('setupReward.recentDays')}</Text>
                  <TextInput
                    value={days}
                    onChangeText={setDays}
                    keyboardType="numeric"
                    className="bg-white w-12 p-2 rounded-lg text-center font-bold text-[#8f7161] mr-2"
                  />
                  <Text className="text-[#8f7161] font-bold mr-2">{t('setupReward.daysUnit')}</Text>
                </View>
                <View className="flex-row items-center mt-2">
                  <Text className="text-[#8f7161] font-bold mr-2">{t('setupReward.achievementRate')}</Text>
                  <TextInput
                    value={rate}
                    onChangeText={setRate}
                    keyboardType="numeric"
                    className="bg-white w-12 p-2 rounded-lg text-center font-bold text-[#8f7161] mr-2"
                  />
                  <Text className="text-[#8f7161] font-bold">{t('setupReward.percentOrMore')}</Text>
                </View>
              </View>
            )}
          </View>

          <View>
            <Text className="text-sm font-bold text-[#8f7161] mb-2">{t('setupReward.iconLabel')}</Text>
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
              <Text className="text-sm text-[#8f7161] mb-2">{t('setupReward.selectedIcon')}</Text>
              <View className="w-16 h-16 bg-stone-100 rounded-full items-center justify-center">
                <Text className="text-4xl">{emoji}</Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleFinish}
          disabled={isLoading}
          className={`bg-[#8f7161] py-4 rounded-2xl shadow-md active:opacity-90 mb-4 ${isLoading ? 'opacity-70' : ''}`}
        >
          {isLoading ? (
            <View className="flex-row justify-center items-center gap-2">
              <ActivityIndicator color="white" />
              <Text className="text-white text-center font-bold text-lg">{t('setupReward.configuringButton')}</Text>
            </View>
          ) : (
            <Text className="text-white text-center font-bold text-lg">{t('setupReward.finishButton')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSkip}
          disabled={isLoading}
          className="p-4"
        >
          {isLoading ? (
            <ActivityIndicator color="#dcc2b6" />
          ) : (
            <Text className="text-[#dcc2b6] text-center font-bold">{t('setupReward.laterButton')}</Text>
          )}
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
              search: t('setupReward.emojiSearch'),
              recently_used: t('setupReward.emojiRecentlyUsed'),
              smileys_emotion: t('setupReward.emojiSmileys'),
              people_body: t('setupReward.emojiPeople'),
              animals_nature: t('setupReward.emojiAnimals'),
              food_drink: t('setupReward.emojiFood'),
              travel_places: t('setupReward.emojiTravel'),
              activities: t('setupReward.emojiActivities'),
              objects: t('setupReward.emojiObjects'),
              symbols: t('setupReward.emojiSymbols'),
              flags: t('setupReward.emojiFlags'),
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
      </Modal>
    </SafeAreaView>
  );
}
