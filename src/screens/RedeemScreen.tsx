
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, SafeAreaView, Image, ActivityIndicator, Platform } from 'react-native';
import { db, storage } from '../../firebaseConfig';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import { X, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { THEME_PALETTES } from '../constants/theme';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTranslation } from 'react-i18next';

export default function RedeemScreen({ navigation, route }: any) {
  const { t } = useTranslation();
  const { ticket, coupleId, themeColor = '#8f7161', isPro = false, currentPhotoCount = 0 } = route.params;

  const dynamicTheme = THEME_PALETTES[themeColor];
  const screenBg = dynamicTheme?.global?.bg || '#fff9fb';

  // Check lock status
  const isLocked = ticket.availableAt && new Date() < new Date(ticket.availableAt);
  if (isLocked) {
    const unlockDate = new Date(ticket.availableAt!);
    Alert.alert(t('redeem.lockedTitle'), t('redeem.lockedMsg', { date: unlockDate.toLocaleDateString() }), [
      { text: "OK", onPress: () => navigation.goBack() }
    ]);
    return null;
  }

  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState<string | null>(null); // Default to null (no image)
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    // ... (logic remains same) ...
    const canAdd = isPro || currentPhotoCount < 5;
    if (!canAdd) {
      Alert.alert(t('redeem.planLimitTitle'), t('redeem.planLimitMsg'));
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    if (!coupleId) {
      throw new Error("Couple ID is missing");
    }

    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      console.log("Blob created:", blob.size, blob.type);

      const filename = uri.substring(uri.lastIndexOf('/') + 1);
      const storageRef = ref(storage, `memories/${coupleId}/${filename}`);

      const metadata = {
        contentType: 'image/jpeg',
      };

      console.log("Starting uploadBytes...");
      await uploadBytes(storageRef, blob, metadata);
      console.log("Upload complete, getting URL...");

      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Error uploading image: ", error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!comment.trim()) {
      Alert.alert(t('common.error'), t('redeem.validationError'));
      return;
    }

    setLoading(true);
    try {
      let photoUrl = photo;
      if (photo && (photo.startsWith('file://') || photo.startsWith('content://'))) {
        photoUrl = await uploadImage(photo);
      }

      // 1. Create Memory
      await addDoc(collection(db, 'couples', coupleId, 'memories'), {
        title: ticket.name,
        price: ticket.cost,
        photo: photoUrl,
        comment: comment,
        date: new Date().toISOString(),
        ticketId: ticket.id
      });

      // 2. Update Goal Status
      const goalRef = doc(db, 'couples', coupleId, 'goals', ticket.id);
      await updateDoc(goalRef, {
        status: 'redeemed',
        redeemedAt: new Date().toISOString()
      });

      Alert.alert(t('redeem.savedTitle'), t('redeem.savedMsg'), [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (e: any) {
      console.error("Error redeeming ticket:", e);
      Alert.alert(t('common.error'), t('redeem.saveError', { message: e.message || JSON.stringify(e) }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: screenBg }}>
      <View className="px-6 py-4 flex-row justify-between items-center border-b border-stone-100 bg-white">
        <Text className="text-lg font-bold text-stone-800">{t('redeem.title')}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading}>
          <X color="#57534e" size={24} />
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        className="flex-1 p-6"
        enableOnAndroid={true}
        extraScrollHeight={20}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 mb-6">
          <View className="mb-6 items-center">
            <Text className="text-xl font-bold text-stone-800 mb-2">{ticket.name}</Text>
            <Text className="text-stone-500 text-sm">{t('redeem.subtitle')}</Text>
          </View>

          <View className="mb-6">
            <Text className="text-sm font-bold text-stone-600 mb-2">{t('redeem.photoLabel')}</Text>

            <TouchableOpacity
              onPress={pickImage}
              disabled={loading}
              className="aspect-video bg-[#efeae8] rounded-xl overflow-hidden relative items-center justify-center border-2 border-dashed border-stone-300"
            >
              {photo ? (
                (photo.startsWith('http') || photo.startsWith('file')) ? (
                  <Image source={{ uri: photo }} className="w-full h-full" resizeMode="contain" />
                ) : (
                  <Text className="text-6xl">{photo}</Text>
                )
              ) : (
                <View className="items-center justify-center opacity-50">
                  <Camera color="#78716c" size={48} strokeWidth={1.5} />
                  <Text className="text-stone-500 font-bold mt-2">{t('redeem.photoUpload')}</Text>
                </View>
              )}

              {/* Overlay edit button if photo exists */}
              {photo && (
                <View className="absolute bottom-2 right-2 bg-black/50 p-2 rounded-full">
                  <Camera color="white" size={20} />
                </View>
              )}
            </TouchableOpacity>

            <Text className="text-xs text-stone-400 mt-2 text-center">
              {t('redeem.photoHint')}
            </Text>
          </View>

          <View>
            <Text className="text-sm font-bold text-stone-600 mb-2">{t('redeem.commentLabel')} <Text className="text-red-500">*</Text></Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder={t('redeem.commentPlaceholder')}
              multiline
              numberOfLines={4}
              className="w-full p-4 bg-stone-50 rounded-xl font-bold text-stone-800 h-32"
              textAlignVertical="top"
              editable={!loading}
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          className={`py-4 rounded-xl shadow-lg ${loading ? 'bg-stone-400' : 'bg-amber-800 active:bg-amber-900'} mb-10`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-bold text-lg">{t('redeem.saveButton')}</Text>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
