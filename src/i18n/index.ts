import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ja from './locales/ja';
import en from './locales/en';

const resources = {
  ja: { translation: ja },
  en: { translation: en },
};

const deviceLanguage = Localization.getLocales()[0]?.languageCode ?? 'ja';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: deviceLanguage,
    fallbackLng: 'ja',
    interpolation: { escapeValue: false },
  });

// Load persisted language preference and apply it after init
AsyncStorage.getItem('appLanguage').then((savedLanguage) => {
  if (savedLanguage && (savedLanguage === 'ja' || savedLanguage === 'en')) {
    i18n.changeLanguage(savedLanguage);
  }
});

export default i18n;
