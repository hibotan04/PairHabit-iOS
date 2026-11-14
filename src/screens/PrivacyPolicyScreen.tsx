import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, SafeAreaView } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

type PolicySection = {
  title: string;
  body: string;
  bullets?: string[];
  note?: string;
};

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const sections = t('legal.privacy.sections', { returnObjects: true }) as PolicySection[];

  const handleLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-screen">
      <View className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-3 bg-white/80 border-b border-stone-100">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="p-2 -ml-2 rounded-full active:bg-stone-100"
          >
            <ChevronLeft size={24} color="#57534e" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-stone-800">{t('legal.privacy.title')}</Text>
          <View className="w-10" />
        </View>

        <ScrollView className="flex-1 p-6">
          <View className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 mb-8">
            <Text className="text-sm leading-7 text-stone-600 mb-4">
              {t('legal.privacy.intro')}
            </Text>

            {sections.map((section) => (
              <View key={section.title}>
                <Text className="text-base font-bold text-stone-800 mt-4 mb-2">{section.title}</Text>
                <Text className="text-sm leading-7 text-stone-600 mb-2">{section.body}</Text>
                {section.bullets && (
                  <View className="pl-2 mb-4">
                    {section.bullets.map((bullet) => (
                      <Text key={bullet} className="text-sm leading-7 text-stone-600">- {bullet}</Text>
                    ))}
                  </View>
                )}
                {section.note && (
                  <Text className="text-xs text-stone-400 mb-4 bg-stone-50 p-3 rounded-lg">
                    {section.note}
                  </Text>
                )}
              </View>
            ))}

            <TouchableOpacity onPress={() => handleLink('mailto:support@example.org')}>
              <Text className="text-sm font-bold text-[#8f7161] underline mb-4">
                support@example.org
              </Text>
            </TouchableOpacity>

            <View className="mt-8 pt-4 border-t border-stone-100">
              <Text className="text-xs text-stone-400 text-right">
                {t('legal.privacy.established')}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
