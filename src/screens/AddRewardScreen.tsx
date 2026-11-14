import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, SafeAreaView, ScrollView, Image, ActivityIndicator } from 'react-native';
import { db } from '../../firebaseConfig';
import { collection, addDoc, doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { X, Camera, Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebaseConfig';
import { Switch } from 'react-native';
import { THEME_PALETTES } from '../constants/theme';
import { PhotoUsageService } from '../services/PhotoUsageService';
import EmojiPicker from 'rn-emoji-keyboard';
import { useTranslation } from 'react-i18next';

export default function AddRewardScreen({ navigation, route }: any) {
  const { coupleId, themeColor = '#8f7161', isPro = false, rewardToEdit } = route.params;
  const { t } = useTranslation();
  const [name, setName] = useState(rewardToEdit?.name || '');
  const [cost, setCost] = useState(rewardToEdit?.cost?.toString() || '');
  const [currency, setCurrency] = useState('¥');

  const dynamicTheme = THEME_PALETTES[themeColor];
  const screenBg = dynamicTheme?.global?.bg || '#fff9fb';

  useEffect(() => {
    const fetchCurrency = async () => {
      try {
        const coupleRef = doc(db, 'couples', coupleId);
        const coupleSnap = await getDoc(coupleRef);
        if (coupleSnap.exists()) {
          setCurrency(coupleSnap.data().currency || '¥');
        }
      } catch (e) {
        console.error("Error fetching currency:", e);
      }
    };
    fetchCurrency();
  }, [coupleId]);


  // Advanced Rules State
  const [isAdvancedMode, setIsAdvancedMode] = useState(!!rewardToEdit?.conditions);
  const [days, setDays] = useState(rewardToEdit?.conditions?.days?.toString() || '7');
  const [rate, setRate] = useState(rewardToEdit?.conditions?.rate?.toString() || '80');
  const [emoji, setEmoji] = useState(
    (rewardToEdit?.image && !rewardToEdit.image.startsWith('http') && !rewardToEdit.image.startsWith('file'))
      ? rewardToEdit.image
      : '🎁'
  );

  const [imageUri, setImageUri] = useState<string | null>(
    (rewardToEdit?.image && (rewardToEdit.image.startsWith('http') || rewardToEdit.image.startsWith('file')))
      ? rewardToEdit.image
      : null
  );

  const [loading, setLoading] = useState(false);
  const [showCustomEmojiInput, setShowCustomEmojiInput] = useState(false);
  const [customEmoji, setCustomEmoji] = useState('');

  const PRESET_EMOJIS = ["🎁", "🎫", "✈️", "♨️", "🛍️"];

  const pickImage = async () => {
    // Strict Pro Limit Check
    if (!isPro) {
      const canAdd = await PhotoUsageService.canAddPhoto(coupleId, isPro);
      if (!canAdd) {
        Alert.alert(
          t('addReward.photoLimitTitle'),
          t('addReward.photoLimitMsg'),
          [
            { text: t('common.cancel'), style: "cancel" },
            { text: t('addReward.viewDetails'), onPress: () => navigation.navigate('Subscription') }
          ]
        );
        return;
      }
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setEmoji(''); // Clear emoji if image is selected
    }
  };

  const uploadImage = async (uri: string) => {
    // If it's already a remote URL (starts with http), skip upload
    if (uri.startsWith('http')) return uri;

    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `goal_${Date.now()}.jpg`;
      const storageRef = ref(storage, `goals/${coupleId}/${filename}`);
      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!name || !cost) {
      Alert.alert(t('common.error'), t('addReward.validationError'));
      return;
    }

    setLoading(true);
    try {
      let finalImage = emoji;

      if (imageUri) {
        finalImage = await uploadImage(imageUri);
      }

      const rewardData: any = {
        name,
        cost: parseInt(cost),
        image: finalImage,
        // achieved: false, // Don't reset achieved status on edit? Usually editing active goals only.
        // createdAt: new Date().toISOString() // Should preserve original createdAt for ordering
      };

      if (!rewardToEdit) {
        rewardData.achieved = false;
        rewardData.createdAt = new Date().toISOString();
      }

      if (isAdvancedMode) {
        rewardData.conditions = {
          days: parseInt(days),
          rate: parseInt(rate)
        };
      } else if (rewardToEdit) {
        // Explicitly remove conditions if disabled ONLY when editing
        rewardData.conditions = deleteField();
      }

      if (rewardToEdit) {
        const goalRef = doc(db, 'couples', coupleId, 'goals', rewardToEdit.id);
        await updateDoc(goalRef, rewardData);
      } else {
        await addDoc(collection(db, 'couples', coupleId, 'goals'), rewardData);
      }

      navigation.goBack();
    } catch (e) {
      console.error("Error saving reward:", e);
      Alert.alert(t('common.error'), t('addReward.saveError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: screenBg }}>
      <View className="px-6 py-4 flex-row justify-between items-center border-b border-stone-100 bg-white">
        <Text className="text-lg font-bold text-stone-800">{rewardToEdit ? t('addReward.editTitle') : t('addReward.title')}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X color="#57534e" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-6">
        <View className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 mb-6">
          <View className="mb-6">
            <Text className="text-sm font-bold text-stone-600 mb-2">{t('addReward.nameLabel')} <Text className="text-red-500">*</Text></Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('addReward.namePlaceholder')}
              className="w-full p-4 bg-stone-100 rounded-xl font-bold text-stone-800"
            />
          </View>

          <View className="mb-6">
            <Text className="text-sm font-bold text-stone-600 mb-2">{t('addReward.pointsLabel', { currency })} <Text className="text-red-500">*</Text></Text>
            <View className="relative">
              <Text className="absolute left-4 top-4 text-stone-400 font-bold">{currency}</Text>
              <TextInput
                value={cost}
                onChangeText={setCost}
                placeholder="0"
                keyboardType="numeric"
                className="w-full p-4 pl-8 bg-stone-100 rounded-xl font-bold text-stone-800"
              />
            </View>
          </View>

          {/* Advanced Rules Section */}
          <View className="mb-6 border-t border-stone-100 pt-4">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-sm font-bold text-stone-600">{t('addReward.advancedMode')}</Text>
                <Text className="text-xs text-stone-400 opacity-70 mt-1">{t('addReward.advancedModeSub')}</Text>
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
                <Text className="text-xs font-bold text-stone-600 mb-3">{t('addReward.ticketConditions')}</Text>
                <View className="flex-row items-center flex-wrap">
                  <Text className="text-stone-600 font-bold mr-2">{t('addReward.recentDays')}</Text>
                  <TextInput
                    value={days}
                    onChangeText={setDays}
                    keyboardType="numeric"
                    className="bg-white w-12 p-2 rounded-lg text-center font-bold text-stone-800 mr-2"
                  />
                  <Text className="text-stone-600 font-bold mr-2">{t('addReward.daysUnit')}</Text>
                </View>
                <View className="flex-row items-center mt-2">
                  <Text className="text-stone-600 font-bold mr-2">{t('addReward.achievementRate')}</Text>
                  <TextInput
                    value={rate}
                    onChangeText={setRate}
                    keyboardType="numeric"
                    className="bg-white w-12 p-2 rounded-lg text-center font-bold text-stone-800 mr-2"
                  />
                  <Text className="text-stone-600 font-bold">{t('addReward.percentOrMore')}</Text>
                </View>
              </View>
            )}
          </View>

          <View className="mb-6">
            <Text className="text-sm font-bold text-stone-600 mb-2">{t('addReward.iconLabel')}</Text>

            {/* Emoji Selection */}
            <View className="flex-row flex-wrap gap-2 justify-center">
              {PRESET_EMOJIS.map((e) => (
                <TouchableOpacity
                  key={e}
                  onPress={() => {
                    setEmoji(e);
                    setImageUri(null);
                  }}
                  className="w-12 h-12 items-center justify-center rounded-full bg-stone-100"
                  style={{ transform: [{ scale: emoji === e && !imageUri ? 1.25 : 1 }] }}
                >
                  <Text className="text-2xl">{e}</Text>
                </TouchableOpacity>
              ))}

              {/* Custom Emoji Picker Trigger */}
              <TouchableOpacity
                onPress={() => setShowCustomEmojiInput(true)}
                className="w-12 h-12 items-center justify-center rounded-full bg-stone-100"
                style={{ transform: [{ scale: (!PRESET_EMOJIS.includes(emoji) && emoji && !imageUri) ? 1.25 : 1 }] }}
              >
                {(!PRESET_EMOJIS.includes(emoji) && emoji && !imageUri) ? (
                  <Text className="text-2xl">{emoji}</Text>
                ) : (
                  <Plus color="#78716c" size={24} />
                )}
              </TouchableOpacity>
            </View>

            <EmojiPicker
              onEmojiSelected={(emojiObject) => {
                setEmoji(emojiObject.emoji);
                setImageUri(null);
                setShowCustomEmojiInput(false);
              }}
              open={showCustomEmojiInput}
              onClose={() => setShowCustomEmojiInput(false)}
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          className="py-4 rounded-xl shadow-lg"
          style={{ backgroundColor: themeColor === '#f0bfb1' ? '#d47d76' : '#8f7161' }}
        >
          <Text className="text-white text-center font-bold text-lg">
            {loading ? t('addReward.savingButton') : (rewardToEdit ? t('addReward.updateButton') : t('addReward.saveButton'))}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
