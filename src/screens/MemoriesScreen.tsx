import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Image, TouchableOpacity, Alert, ActionSheetIOS, Platform, Modal, TextInput, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { Heart, MoreHorizontal, Trash2, Edit2, X, Camera, Ticket, Lock as LockIcon, BookOpen } from 'lucide-react-native';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import MemoryModal from '../components/MemoryModal';
import { Habit, Reward } from '../types';
import { useNavigation } from '@react-navigation/native';
import { THEME_PALETTES } from '../constants/theme';
import { PhotoUsageService } from '../services/PhotoUsageService';
import { useTranslation } from 'react-i18next';
import { TAB_ROUTES } from '../navigation/routes';

interface MemoriesScreenProps {
  memories: any[];
  currency: string;
  coupleId: string;
  goals: any[];
  habits: any[];
  themeColor: string;
  userData: any; // User type
}

export default function MemoriesScreen({ memories, currency, coupleId, goals, habits, themeColor, userData }: MemoriesScreenProps) {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [editingMemory, setEditingMemory] = useState<any | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<any | null>(null);
  const [editComment, setEditComment] = useState('');
  const [editPhoto, setEditPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Pro Limit Logic
  const isPro = userData?.isPro || false;
  const totalPhotos = memories.filter(m => m.photo).length;
  // If user has 5 or more photos, and is NOT pro, they cannot add more.
  const canAddPhoto = isPro || totalPhotos < 5;

  // Sort by date desc
  const sortedMemories = [...memories].sort((a, b) => {
    return new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime();
  });

  const handleOptions = (memory: any) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('common.cancel'), t('memories.menuEdit'), t('memories.menuDelete')],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            startEdit(memory);
          } else if (buttonIndex === 2) {
            confirmDelete(memory);
          }
        }
      );
    } else {
      Alert.alert(
        t('memories.menu'),
        undefined,
        [
          { text: t('common.cancel'), style: "cancel" },
          { text: t('memories.menuEdit'), onPress: () => startEdit(memory) },
          { text: t('memories.menuDelete'), onPress: () => confirmDelete(memory), style: "destructive" }
        ]
      );
    }
  };

  const startEdit = (memory: any) => {
    setEditingMemory(memory);
    setEditComment(memory.comment || '');
    setEditPhoto(memory.photo || null);
  };

  const pickImage = async () => {
    // Check limit for Editing
    const isPro = userData?.isPro || false;

    // Only check limit if we are ADDING a photo (memory didn't have one)
    if (!isPro && !editingMemory?.photo) {
      const canAdd = await PhotoUsageService.canAddPhoto(coupleId, isPro);
      if (!canAdd) {
        Alert.alert(
          t('memories.photoLimitTitle'),
          t('memories.photoLimitMsg'),
          [
            { text: t('common.cancel'), style: "cancel" },
            { text: t('memories.viewDetails'), onPress: () => navigation.navigate('Subscription') }
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
      setEditPhoto(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    if (!coupleId) throw new Error("Couple ID is missing");

    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const filename = `memory_${Date.now()}.jpg`;
      const storageRef = ref(storage, `memories/${coupleId}/${filename}`);

      const metadata = { contentType: 'image/jpeg' };
      await uploadBytes(storageRef, blob, metadata);

      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Error uploading image: ", error);
      throw error;
    }
  };

  const saveEdit = async () => {

    if (!coupleId) {
      Alert.alert(t('common.error'), t('memories.coupleIdError'));
      return;
    }
    if (!editingMemory) return;

    if (!editComment.trim()) {
      Alert.alert(t('common.error'), t('memories.commentError'));
      return;
    }

    setLoading(true);
    try {
      let photoUrl = editingMemory.photo;

      // Upload new image if changed and it's a local file
      if (editPhoto && editPhoto !== editingMemory.photo && (editPhoto.startsWith('file://') || editPhoto.startsWith('content://'))) {
        console.log("Uploading new photo...");
        photoUrl = await uploadImage(editPhoto);
      }

      console.log("Updating Firestore doc...");
      const memoryRef = doc(db, 'couples', coupleId, 'memories', editingMemory.id);
      await updateDoc(memoryRef, {
        comment: editComment,
        photo: photoUrl
      });
      console.log("Update successful");
      setEditingMemory(null);
      Alert.alert(t('memories.savedTitle'), t('memories.savedMsg'));
    } catch (e) {
      console.error("Error updating memory:", e);
      Alert.alert(t('common.error'), t('memories.updateError', { message: (e as any).message }));
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (memory: any) => {
    console.log("confirmDelete called for:", memory.id);
    Alert.alert(
      t('memories.deleteTitle'),
      t('memories.deleteConfirm'),
      [
        { text: t('common.cancel'), style: "cancel" },
        {
          text: t('memories.menuDelete'),
          style: "destructive",
          onPress: async () => {
            if (!coupleId) {
              Alert.alert(t('common.error'), t('memories.coupleIdMissing'));
              return;
            }
            try {
              const memoryRef = doc(db, 'couples', coupleId, 'memories', memory.id);
              await deleteDoc(memoryRef);
              console.log("Delete successful");
              Alert.alert(t('memories.deletedTitle'), t('memories.deletedMsg'));
            } catch (e) {
              console.error("Error deleting memory:", e);
              Alert.alert(t('common.error'), t('memories.deleteError', { message: (e as any).message }));
            }
          }
        }
      ]
    );
  };

  const dynamicTheme = THEME_PALETTES[themeColor];
  const screenBg = dynamicTheme?.global?.bg || '#fff9fb';
  const headerBg = dynamicTheme?.header?.bg || 'white';
  const headerText = dynamicTheme?.header?.text || '#8f7161';
  const memoriesTitleColor = dynamicTheme?.memories?.title || '#ad9f97';
  const memoriesCardTitleColor = dynamicTheme?.memories?.cardTitle || '#292524';

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: headerBg }}>
      {/* Fixed Header */}
      <View style={{ backgroundColor: headerBg, borderBottomWidth: 1, borderBottomColor: '#f5f5f4', paddingBottom: 16 }}>
        {/* Header Title Update */}
        <View className="items-center py-2">
          <Text className="text-lg font-bold" style={{ color: headerText }}>{t('memories.title')}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: screenBg, padding: 24 }}>
        {/* Ticket Box Removed */}


        {sortedMemories.length === 0 ? (
          <View className="items-center justify-center py-20 px-6">
            <View className="w-20 h-20 bg-stone-100 rounded-full items-center justify-center mb-6 relative">
              <Heart size={32} color="#a8a29e" />

            </View>

            <Text className="text-lg font-bold text-stone-700 mb-2 text-center">
              {t('memories.noMemories')}
            </Text>

            {goals.filter(g => g.status === 'ticket').length > 0 ? (
              <View>
                <Text className="text-stone-500 text-center font-bold mb-6 leading-relaxed">
                  {t('memories.hasTickets')}
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate(TAB_ROUTES.ticket)}
                  className="bg-stone-800 px-6 py-3 rounded-full self-center shadow-sm"
                >
                  <Text className="text-white font-bold">{t('memories.useTicket')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text className="text-stone-500 text-center font-bold mb-6 leading-relaxed">
                  {t('memories.noTicketsYet')}
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate(TAB_ROUTES.home)}
                  style={{ backgroundColor: themeColor }}
                  className="px-6 py-3 rounded-full self-center shadow-sm"
                >
                  <Text className="text-white font-bold">{t('memories.goalWork')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View className="pb-20">
            {sortedMemories.map((memory) => (
              <TouchableOpacity
                key={memory.id}
                className="bg-white rounded-3xl shadow-sm overflow-hidden border border-stone-100 mb-6"
                onPress={() => setSelectedMemory(memory)}
                activeOpacity={0.9}
              >
                {/* Header */}
                <View className="flex-row justify-between items-center p-4 bg-white">
                  <Text className="text-stone-800 text-base font-bold flex-1 mr-2" numberOfLines={1}>
                    {memory.title || memory.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleOptions(memory)}
                    className="p-1"
                  >
                    <MoreHorizontal color="#a8a29e" size={20} />
                  </TouchableOpacity>
                </View>

                {/* Photo */}
                <View className="w-full relative bg-[#efeae8] items-center justify-center" style={{ aspectRatio: 16 / 9 }}>
                  {memory.photo ? (
                    (memory.photo.startsWith('http') || memory.photo.startsWith('file')) ? (
                      <Image
                        source={{ uri: memory.photo }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <Text className="text-6xl">{memory.photo}</Text>
                    )
                  ) : (
                    <View className="w-full h-full items-center justify-center">
                      <Heart size={48} color="#d6d3d1" />
                    </View>
                  )}

                  {/* Date Overlay */}
                  <Text className="absolute bottom-4 left-4 text-white text-xs font-bold shadow-sm">
                    {new Date(memory.date || memory.createdAt).toLocaleDateString()}
                  </Text>

                  {/* Price Badge */}
                  <View
                    className="absolute bottom-4 right-4 px-3 py-1 rounded-full"
                    style={{ backgroundColor: dynamicTheme?.memories?.priceBadgeBg || '#d47d76' }}
                  >
                    <Text className="text-white text-xs font-bold">
                      {currency}{(memory.price || memory.cost)?.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Content */}
                <View className="p-4">
                  <Text className="text-stone-600 text-sm leading-relaxed">
                    {memory.comment}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={!!editingMemory}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingMemory(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-black/50 justify-center items-center p-6"
        >
          <View className="bg-white w-full rounded-2xl p-6 max-h-[80%]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-stone-800">{t('memories.editTitle')}</Text>
              <TouchableOpacity onPress={() => setEditingMemory(null)} disabled={loading}>
                <X color="#78716c" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="mb-4">
                <Text className="text-sm font-bold text-stone-600 mb-2">{t('memories.photoLabel')}</Text>
                <TouchableOpacity
                  onPress={pickImage}
                  disabled={loading}
                  className="aspect-video bg-stone-100 rounded-xl overflow-hidden relative"
                >
                  {editPhoto ? (
                    <Image source={{ uri: editPhoto }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <View className="w-full h-full items-center justify-center">
                      <Camera size={32} color="#d6d3d1" />
                      <Text className="text-stone-400 text-xs mt-2">{t('memories.changePhoto')}</Text>
                    </View>
                  )}

                  <View className="absolute bottom-2 right-2 bg-black/50 p-2 rounded-full">
                    <Camera color="white" size={16} />
                  </View>
                </TouchableOpacity>
              </View>

              <View className="mb-6">
                <Text className="text-sm font-bold text-stone-600 mb-2">{t('memories.commentLabel')}</Text>
                <TextInput
                  value={editComment}
                  onChangeText={setEditComment}
                  multiline
                  numberOfLines={4}
                  className="w-full bg-stone-50 p-4 rounded-xl text-stone-800 h-32"
                  textAlignVertical="top"
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                onPress={saveEdit}
                disabled={loading}
                className="py-3 rounded-xl items-center"
                style={{ backgroundColor: loading ? '#a8a29e' : (themeColor === '#f0bfb1' ? '#d47d76' : '#8f7161') }}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold">{t('memories.saveButton')}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* View Modal */}
      <MemoryModal
        visible={!!selectedMemory}
        memory={selectedMemory}
        onClose={() => setSelectedMemory(null)}
        currency={currency}
      />
    </SafeAreaView>
  );
}
