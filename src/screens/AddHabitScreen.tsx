import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, SafeAreaView, ScrollView, Modal } from 'react-native';
import { db, auth } from '../../firebaseConfig';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { X, Trash2, Smile } from 'lucide-react-native';
import { EmojiKeyboard } from 'rn-emoji-keyboard';
import { THEME_PALETTES } from '../constants/theme';
import { useTranslation } from 'react-i18next';

import { reloadAllTimelines } from '../../modules/widget-controller';

export default function AddHabitScreen({ navigation, route }: any) {
  const { coupleId, habit, themeColor = '#8f7161' } = route.params;
  const { t } = useTranslation();
  const isEdit = !!habit;

  const dynamicTheme = THEME_PALETTES[themeColor];
  const screenBg = dynamicTheme?.global?.bg || '#fff9fb';

  const [name, setName] = useState(habit?.name || '');
  const [value, setValue] = useState(habit?.value ? String(habit.value) : '');
  const [emoji, setEmoji] = useState(habit?.emoji || '✨');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [customEmoji, setCustomEmoji] = useState('');

  const emojis = ["💪", "📚", "🍳", "🧹", "💤", "🏃", "🧘", "✨", "💧", "🥗", "🌞"];

  const handleSave = async () => {
    if (!name || !value) {
      Alert.alert(t('common.error'), t('addHabit.validationError'));
      return;
    }

    try {
      if (isEdit) {
        await updateDoc(doc(db, 'couples', coupleId, 'habits', habit.id), {
          name,
          value: parseInt(value),
          emoji,
        });
      } else {
        await addDoc(collection(db, 'couples', coupleId, 'habits'), {
          name,
          value: parseInt(value),
          emoji,
          history: {},
          ownerId: auth.currentUser?.uid,
          createdAt: new Date().toISOString()
        });
      }
      reloadAllTimelines();
      navigation.goBack();
    } catch (e) {
      console.error("Error saving habit:", e);
      Alert.alert(t('common.error'), t('addHabit.saveError'));
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      t('addHabit.deleteTitle'),
      t('addHabit.deleteConfirm'),
      [
        { text: t('common.cancel'), style: "cancel" },
        {
          text: t('common.delete'),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'couples', coupleId, 'habits', habit.id));
              reloadAllTimelines();
              navigation.goBack();
            } catch (e) {
              console.error("Error deleting habit:", e);
              Alert.alert(t('common.error'), t('addHabit.deleteError'));
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: screenBg }}>
      <View className="px-6 py-4 flex-row justify-between items-center border-b border-stone-100 bg-white">
        <Text className="text-lg font-bold text-stone-800">{isEdit ? t('addHabit.editTitle') : t('addHabit.title')}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X color="#8f7161" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-6">
        <View className="bg-white p-6 rounded-3xl shadow-sm mb-6">
          <View className="mb-6">
            <Text className="text-sm font-bold text-[#8f7161] mb-2">{t('addHabit.nameLabel')} <Text className="text-red-500">*</Text></Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('addHabit.namePlaceholder')}
              placeholderTextColor="#dcc2b6"
              className="w-full p-4 bg-stone-100 rounded-xl font-bold text-[#8f7161]"
            />
          </View>

          <View className="mb-6">
            <Text className="text-sm font-bold text-[#8f7161] mb-2">{t('addHabit.valueLabel')} <Text className="text-red-500">*</Text></Text>
            <View className="relative">
              <Text className="absolute left-4 top-4 text-[#8f7161] font-bold">¥</Text>
              <TextInput
                value={value}
                onChangeText={setValue}
                placeholder="0"
                placeholderTextColor="#dcc2b6"
                keyboardType="numeric"
                className="w-full p-4 pl-8 bg-stone-100 rounded-xl font-bold text-[#8f7161]"
                style={{ backgroundColor: dynamicTheme?.global?.bg ? '#f5f5f4' : '#f5f5f4' }}
              />
            </View>
          </View>

          <View>
            <Text className="text-sm font-bold text-[#8f7161] mb-2">{t('addHabit.iconLabel')}</Text>
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
              <Text className="text-sm text-[#8f7161] mb-2">{t('addHabit.selectedIcon')}</Text>
              <View className="w-16 h-16 bg-stone-100 rounded-full items-center justify-center">
                <Text className="text-4xl">{emoji}</Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          className="bg-[#8f7161] py-4 rounded-2xl shadow-md active:opacity-90 mb-4"
        >
          <Text className="text-white text-center font-bold text-lg">{isEdit ? t('addHabit.updateButton') : t('addHabit.saveButton')}</Text>
        </TouchableOpacity>

        {isEdit && (
          <TouchableOpacity
            onPress={handleDelete}
            className="bg-white py-4 rounded-2xl border border-red-100 active:bg-red-50"
          >
            <Text className="text-red-400 text-center font-bold text-lg flex-row items-center justify-center">
              <Trash2 size={20} color="#f87171" style={{ marginRight: 8 }} /> {t('addHabit.deleteButton')}
            </Text>
          </TouchableOpacity>
        )}
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
              search: t('addHabit.emojiSearch'),
              recently_used: t('addHabit.emojiRecentlyUsed'),
              smileys_emotion: t('addHabit.emojiSmileys'),
              people_body: t('addHabit.emojiPeople'),
              animals_nature: t('addHabit.emojiAnimals'),
              food_drink: t('addHabit.emojiFood'),
              travel_places: t('addHabit.emojiTravel'),
              activities: t('addHabit.emojiActivities'),
              objects: t('addHabit.emojiObjects'),
              symbols: t('addHabit.emojiSymbols'),
              flags: t('addHabit.emojiFlags'),
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
              }
            }}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
