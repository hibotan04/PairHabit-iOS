import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

type TermsSection = {
  title: string;
  body?: string;
  items?: string[];
};

export default function TermsOfServiceScreen({ navigation }: any) {
  const { t } = useTranslation();
  const sections = t('legal.terms.sections', { returnObjects: true }) as TermsSection[];

  return (
    <SafeAreaView className="flex-1 bg-bg-screen">
      <View className="px-6 py-4 flex-row items-center border-b border-stone-100 bg-white">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <ChevronLeft size={24} color="#8f7161" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-stone-800">{t('legal.terms.title')}</Text>
      </View>

      <ScrollView className="flex-1 p-6">
        <View className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 mb-8">
          <Text className="text-stone-800 font-bold text-lg mb-4">{t('legal.terms.title')}</Text>
          <Text className="text-stone-600 leading-6 mb-6">
            {t('legal.terms.intro')}
          </Text>

          {sections.map((section) => (
            <View key={section.title} className={section.title === sections[sections.length - 1].title ? 'mb-12' : 'mb-6'}>
              <Text className="text-stone-800 font-bold mb-2">{section.title}</Text>
              {section.body && (
                <Text className="text-stone-600 leading-6 mb-2">{section.body}</Text>
              )}
              {section.items && (
                <View className="pl-2">
                  {section.items.map((item, index) => (
                    <Text key={item} className="text-stone-600 leading-6">
                      {index + 1}. {item}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}

          <Text className="text-stone-600 leading-6 mt-2 font-bold select-text">
            support@example.org
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
