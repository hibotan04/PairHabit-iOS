import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Image, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { X, Heart } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

interface MemoryModalProps {
  visible: boolean;
  memory: any | null;
  onClose: () => void;
  currency: string;
}

const { width } = Dimensions.get('window');

export default function MemoryModal({ visible, memory, onClose, currency }: MemoryModalProps) {
  const { t } = useTranslation();
  const [imageRatio, setImageRatio] = useState(1);
  const [loadingImage, setLoadingImage] = useState(false);

  useEffect(() => {
    if (memory?.photo && (memory.photo.startsWith('http') || memory.photo.startsWith('file'))) {
      setLoadingImage(true);
      Image.getSize(memory.photo, (w, h) => {
        setLoadingImage(false);
        if (w && h) {
          setImageRatio(w / h);
        }
      }, (err) => {
        console.log("Failed to get image size", err);
        setLoadingImage(false);
      });
    }
  }, [memory]);

  if (!memory) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-[#fff9fb]">
        <SafeAreaView className="flex-1">
          <View className="px-4 py-3 border-b border-stone-100 flex-row justify-between items-center bg-white shadow-sm z-10">
            <View className="w-10" />
            <Text className="text-lg font-bold text-stone-800">{t('memoryModal.title')}</Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-10 h-10 items-center justify-center bg-stone-100 rounded-full"
            >
              <X color="#57534e" size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1" bounces={true} showsVerticalScrollIndicator={false}>
            <View className="w-full bg-[#f5f5f4] relative box-border" style={{ minHeight: 200 }}>
              {memory.photo ? (
                (memory.photo.startsWith('http') || memory.photo.startsWith('file')) ? (
                  <Image
                    source={{ uri: memory.photo }}
                    style={{ width: width, height: width / imageRatio }}
                    resizeMode="contain"
                  />
                ) : (
                  <View className="w-full h-80 items-center justify-center">
                    <Text className="text-6xl">{memory.photo}</Text>
                  </View>
                )
              ) : (
                <View className="w-full h-80 items-center justify-center">
                  <Heart size={64} color="#d6d3d1" />
                </View>
              )}
            </View>

            <View className="p-6">
              <View className="flex-row justify-between items-start mb-6">
                <View className="flex-1 mr-4">
                  <Text className="text-stone-500 text-sm font-bold mb-1">
                    {new Date(memory.date || memory.createdAt).toLocaleDateString()}
                  </Text>
                  <Text className="text-stone-800 text-2xl font-bold leading-tight">{memory.title || memory.name}</Text>
                </View>

                {(() => {
                  const val = memory.price ?? memory.cost;
                  // Explicitly check for null or undefined. Allow 0.
                  if (val === null || val === undefined) return null;
                  return (
                    <View className="bg-[#fff0e6] px-3 py-1.5 rounded-full border border-[#ffe0cc]">
                      <Text className="text-[#9a3412] font-bold">
                        {currency}{Number(val).toLocaleString()}
                      </Text>
                    </View>
                  );
                })()}
              </View>

              <View className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm mb-10">
                <Text className="text-stone-600 text-base leading-relaxed">
                  {memory.comment}
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
