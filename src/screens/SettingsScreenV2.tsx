import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, Clipboard, Alert, TextInput, ScrollView, ActivityIndicator, Image, Modal } from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, deleteField, getDoc, collection, getDocs, deleteDoc, arrayRemove } from 'firebase/firestore';
import { Check, Copy, LogOut, User, Settings as SettingsIcon, RefreshCw, Trash2, Bell, Palette, FileText, Shield, Crown, ChevronRight, Pencil, X, Calendar, Clock } from 'lucide-react-native';
import { scheduleReminderNotification, cancelReminderNotification } from '../utils/notificationHelper';
import { THEME_COLORS, THEME_PALETTES } from '../constants/theme';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import i18n from '../i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsScreenProps {
  coupleId: string;
  userUid: string;
  initialThemeColor?: string;
  navigation?: any;
}

const SettingsScreen = (props: SettingsScreenProps) => {
  const { coupleId, userUid, initialThemeColor = '#8f7161' } = props;
  const { t } = useTranslation();
  // This screen is mounted via a tab render-prop without a navigation prop,
  // so obtain navigation from the hook instead.
  const navigation = useNavigation<any>();

  const [userData, setUserData] = useState<any>(null);
  const [partnerData, setPartnerData] = useState<any>(null);
  const [coupleData, setCoupleData] = useState<any>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editIconBg, setEditIconBg] = useState('#fdfbf7');
  const [loading, setLoading] = useState(false);
  const [weekStartDay, setWeekStartDay] = useState(0);

  const [currencyInput, setCurrencyInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [customEmoji, setCustomEmoji] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(21);
  const [reminderMinute, setReminderMinute] = useState(0);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempHour, setTempHour] = useState(21);
  const [tempMinute, setTempMinute] = useState(0);
  const [themeColor, setThemeColor] = useState(initialThemeColor);

  const dynamicTheme = THEME_PALETTES[themeColor];
  const screenBg = dynamicTheme?.global?.bg || '#fff9fb';
  // If dynamicTheme header exists, use it, otherwise default to white bg / stone-800 text
  const headerBg = dynamicTheme?.header?.bg || 'white';
  const headerText = dynamicTheme?.header?.text || '#8f7161';

  useEffect(() => {
    if (!userUid || !coupleId) return;

    // Fetch User Data
    const userRef = doc(db, 'users', userUid);
    const unsubUser = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUserData(data);
        setEditName(data.displayName || t('settings.noName'));
        setEditIcon(data.photoURL || '😊');
        setEditIconBg(data.iconBg || '#ffe6e7');
        setWeekStartDay(data.weekStartDay || 0);
        setThemeColor(data.themeColor || '#8f7161');
        setNotificationsEnabled(data.notificationsEnabled !== false);
      }
    });

    // Load reminder settings
    AsyncStorage.getItem('reminderEnabled').then(v => { if (v !== null) setReminderEnabled(v === 'true'); });
    AsyncStorage.getItem('reminderHour').then(v => { if (v !== null) setReminderHour(parseInt(v)); });
    AsyncStorage.getItem('reminderMinute').then(v => { if (v !== null) setReminderMinute(parseInt(v)); });

    // Fetch Couple Data
    const coupleRef = doc(db, 'couples', coupleId);
    const unsubCouple = onSnapshot(coupleRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setCoupleData(data);
        setCurrencyInput(data.currency || '¥');

        // Fetch Partner Data
        const partnerId = data.users?.find((uid: string) => uid !== userUid);
        if (partnerId) {
          const partnerRef = doc(db, 'users', partnerId);
          onSnapshot(partnerRef, (pSnapshot) => {
            if (pSnapshot.exists()) {
              setPartnerData(pSnapshot.data());
            }
          });
        } else {
          setPartnerData(null);
        }
      }
    });

    return () => {
      unsubUser();
      unsubCouple();
    };
  }, [userUid, coupleId]);

  const handleReminderToggle = async () => {
    const next = !reminderEnabled;
    setReminderEnabled(next);
    await AsyncStorage.setItem('reminderEnabled', next.toString());
    if (next) {
      await scheduleReminderNotification(reminderHour, reminderMinute, t('settings.reminderTitle'), t('settings.reminderBody'));
    } else {
      await cancelReminderNotification();
    }
  };

  const handleTimeConfirm = async () => {
    setReminderHour(tempHour);
    setReminderMinute(tempMinute);
    setShowTimePicker(false);
    await AsyncStorage.setItem('reminderHour', tempHour.toString());
    await AsyncStorage.setItem('reminderMinute', tempMinute.toString());
    if (reminderEnabled) {
      await scheduleReminderNotification(tempHour, tempMinute, t('settings.reminderTitle'), t('settings.reminderBody'));
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const copyToClipboard = () => {
    Clipboard.setString(coupleId);
    Alert.alert(t('settings.copied'), t('settings.copiedWithId', { coupleId }));
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert(t('common.error'), t('settings.nameError'));
      return;
    }
    setLoading(true);
    try {
      const userRef = doc(db, 'users', userUid);
      await updateDoc(userRef, {
        displayName: editName
      });
      setIsEditingName(false);
      Alert.alert(t('settings.updateNameSuccess'), t('settings.updateNameSuccessMsg'));
    } catch (e) {
      console.error("Error updating profile:", e);
      Alert.alert(t('common.error'), t('settings.updateNameError'));
    } finally {
      setLoading(false);
    }
  };

  const updateProfileIcon = async (newIcon: string) => {
    try {
      const userRef = doc(db, 'users', userUid);
      await updateDoc(userRef, {
        photoURL: newIcon
      });
    } catch (e) {
      console.error("Error updating icon:", e);
      Alert.alert(t('common.error'), t('settings.iconChangeError'));
    }
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    if (!newCurrency.trim()) return;
    try {
      const coupleRef = doc(db, 'couples', coupleId);
      await updateDoc(coupleRef, {
        currency: newCurrency
      });
      setCurrencyInput(newCurrency);
    } catch (e) {
      console.error("Error updating currency:", e);
      Alert.alert(t('common.error'), t('settings.currencyError'));
    }
  };

  const handleWeekStartChange = async (day: number) => {
    try {
      setWeekStartDay(day); // Optimistic update
      const userRef = doc(db, 'users', userUid);
      await updateDoc(userRef, {
        weekStartDay: day
      });
    } catch (e) {
      console.error("Error updating week start day:", e);
      Alert.alert(t('common.error'), t('settings.weekStartError'));
      setWeekStartDay(userData?.weekStartDay || 0); // Revert
    }
  };

  const handleUnpair = () => {
    Alert.alert(
      t('settings.unpairTitle'),
      t('settings.unpairConfirm'),
      [
        { text: t('common.cancel'), style: "cancel" },
        {
          text: t('settings.unpairButton'),
          style: "destructive",
          onPress: async () => {
            try {
              // 1. Remove user from Couple Document
              const coupleRef = doc(db, 'couples', coupleId);
              await updateDoc(coupleRef, {
                users: arrayRemove(userUid),
                [`members.${userUid}`]: deleteField()
              });

              // 2. Remove coupleId from User Document
              const userRef = doc(db, 'users', userUid);
              await updateDoc(userRef, {
                coupleId: deleteField()
              });
            } catch (e) {
              console.error("Error unpairing:", e);
              Alert.alert(t('common.error'), t('settings.unpairError'));
            }
          }
        }
      ]
    );
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      t('settings.deleteDataTitle'),
      t('settings.deleteDataConfirm'),
      [
        { text: t('common.cancel'), style: "cancel" },
        {
          text: t('settings.deleteDataButton'),
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              // 1. Delete subcollections (Habits, Goals, Memories, Messages)
              // Note: Client SDK cannot delete collections. We must delete docs individually.
              const subcollections = ['habits', 'goals', 'memories', 'messages'];
              for (const sub of subcollections) {
                const subRef = collection(db, 'couples', coupleId, sub);
                const snapshot = await getDocs(subRef);
                const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
                await Promise.all(deletePromises);
              }

              // 2. Delete Couple Doc
              await deleteDoc(doc(db, 'couples', coupleId));

              // 3. Reset User Data (remove coupleId)
              const userRef = doc(db, 'users', userUid);
              await updateDoc(userRef, {
                coupleId: deleteField(),
                isSetupCompleted: deleteField()
              });

              Alert.alert(t('settings.deleteDataDone'), t('settings.deleteDataDoneMsg'));
              // App.tsx will handle navigation change
            } catch (e) {
              console.error("Error deleting all data:", e);
              Alert.alert(t('common.error'), t('settings.deleteDataError'));
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const [joinId, setJoinId] = useState('');

  const handleJoinCouple = async () => {
    if (!auth.currentUser || !joinId.trim()) return;

    Alert.alert(
      t('settings.joinTitle'),
      t('settings.joinConfirm'),
      [
        { text: t('common.cancel'), style: "cancel" },
        {
          text: t('common.join'),
          onPress: async () => {
            setLoading(true);
            try {
              const targetId = joinId.trim().toUpperCase();
              const coupleRef = doc(db, 'couples', targetId);
              const coupleSnap = await getDoc(coupleRef);

              if (!coupleSnap.exists()) {
                Alert.alert(t('common.error'), t('settings.notFoundError'));
                setLoading(false);
                return;
              }

              const currentUsers = coupleSnap.data().users || [];
              const userDocRef = doc(db, 'users', auth.currentUser!.uid);
              const userDocSnap = await getDoc(userDocRef);
              const userData = userDocSnap.exists() ? userDocSnap.data() : {};

              const updates: any = {
                [`members.${auth.currentUser!.uid}`]: {
                  name: userData.displayName || 'User',
                  icon: userData.photoURL || '😊',
                  color: userData.color || 'blue',
                  joinedAt: new Date().toISOString()
                }
              };

              const existingMembers = Object.keys(coupleSnap.data().members || {});
              const allUsers = Array.from(new Set([...currentUsers, ...existingMembers, auth.currentUser!.uid]));
              updates.users = allUsers;

              await updateDoc(coupleRef, updates);

              const userRef = doc(db, 'users', auth.currentUser!.uid);
              await updateDoc(userRef, {
                coupleId: targetId
              });

              setJoinId('');
              Alert.alert(t('settings.joinSuccess'), t('settings.joinSuccessMsg'));

            } catch (e) {
              console.error(e);
              Alert.alert(t('common.error'), t('settings.joinError'));
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleLanguageChange = () => {
    Alert.alert(
      t('settings.languageSelect'),
      '',
      [
        {
          text: t('settings.japanese'),
          onPress: async () => {
            await i18n.changeLanguage('ja');
            await AsyncStorage.setItem('appLanguage', 'ja');
          }
        },
        {
          text: t('settings.english'),
          onPress: async () => {
            await i18n.changeLanguage('en');
            await AsyncStorage.setItem('appLanguage', 'en');
          }
        },
        { text: t('common.cancel'), style: 'cancel' }
      ]
    );
  };

  const PROFILE_EMOJIS = ["😊", "🐱", "🐶", "🐰", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐙", "🦄", "🦋", "🌻", "🌸", "🍀", "⭐️", "🌙", "☀️", "🍎", "🍓", "🍔", "🍕", "🍣", "🍙", "🍦", "🍩", "🍪", "⚽️", "🏀", "🎮", "🎵", "🎨", "✈️", "🚀", "🚗", "🏠", "💎"];

  const settingsTheme = THEME_PALETTES[themeColor]?.settings;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: headerBg }}>
      {/* Fixed Header */}
      <View style={{ backgroundColor: headerBg, borderBottomWidth: 1, borderBottomColor: '#f5f5f4', paddingBottom: 16 }}>
        <View className="items-center py-2">
          <Text className="text-lg font-bold" style={{ color: headerText }}>{t('settings.title')}</Text>
        </View>
      </View>
      <ScrollView style={{ flex: 1, backgroundColor: screenBg, padding: 24 }}>

        {/* Pro Membership Banner */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Subscription')}
          className="mb-8 bg-stone-800 rounded-3xl p-6 shadow-md overflow-hidden relative"
        >
          <View className="absolute top-0 right-0 p-4 opacity-10">
            <Crown size={120} color="white" />
          </View>
          <View className="flex-row items-center mb-2">
            <Crown size={24} color="#fbbf24" className="mr-4" />
            <Text className="text-amber-400 font-bold text-lg">{t('settings.proMembership')}</Text>
          </View>
          <Text className="text-stone-300 text-xs mb-4">
            {t('settings.proDescription')}
          </Text>
          <View className=" bg-amber-400 self-start px-4 py-2 rounded-full">
            <Text className="text-stone-900 font-bold text-xs">{t('settings.upgrade')}</Text>
          </View>
        </TouchableOpacity>

        {/* Account Settings */}
        <View className="mb-6">
          <Text className="text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider">{t('settings.account')}</Text>

          <View className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100 p-4">
            <View className="flex-row items-center">
              <View className="mr-6 items-center">
                <TouchableOpacity
                  onPress={() => {
                    setEditIcon(userData?.photoURL || '😊');
                    setCustomEmoji(userData?.photoURL || '😊');
                    setShowEmojiPicker(true);
                  }}
                  className="w-16 h-16 rounded-full items-center justify-center"
                  style={{ backgroundColor: '#fdfbf7' }}
                >
                  <Text className="text-4xl">{userData?.photoURL || '😊'}</Text>
                </TouchableOpacity>
              </View>
              <View className="flex-1">
                {isEditingName ? (
                  <View className="flex-row items-center mb-1">
                    <TextInput
                      value={editName}
                      onChangeText={setEditName}
                      className="flex-1 p-2 bg-stone-100 rounded-lg font-bold text-stone-800 mr-2"
                      autoFocus
                    />
                    <TouchableOpacity onPress={handleSaveProfile} className="p-2 bg-[#8f7161] rounded-full mr-1">
                      {loading ? <ActivityIndicator size="small" color="white" /> : <Check size={16} color="white" />}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsEditingName(false)} className="p-2 bg-stone-200 rounded-full">
                      <X size={16} color="#78716c" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="flex-row items-center mb-1">
                    <Text className="text-xl font-bold mr-2" style={{ color: settingsTheme?.text || '#ad9f97' }}>{userData?.displayName || 'Guest'}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setEditName(userData?.displayName || '');
                        setIsEditingName(true);
                      }}
                      className="p-1"
                    >
                      <Pencil size={14} color="#a8a29e" />
                    </TouchableOpacity>
                  </View>
                )}
                <View className="flex-row items-center mb-2">
                  {auth.currentUser?.isAnonymous && (
                    <View className="bg-stone-200 px-2 py-0.5 rounded mr-3">
                      <Text className="text-[10px] font-bold text-stone-600">{t('settings.guest')}</Text>
                    </View>
                  )}
                  <Text className="text-xs text-stone-400">ID: {userUid.substring(0, 6)}</Text>
                </View>
                {auth.currentUser?.providerData.some(p => p.providerId === 'google.com') ? (
                  <View>
                    <View className="flex-row items-center mb-0.5">
                      <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                      <Text className="text-xs font-bold text-stone-500">{t('settings.googleLinked')}</Text>
                    </View>
                    <Text className="text-[10px] text-stone-400">{auth.currentUser?.email}</Text>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => Alert.alert(t('settings.googleLinkTitle'), t('settings.googleLinkMsg'))}>
                    <Text className="text-xs font-bold text-blue-500 underline">{t('settings.linkGoogle')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>


        {/* Appearance Settings */}
        <View className="mb-6">
          <Text className="text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider">{t('settings.appearance')}</Text>
          <View className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100">

            {/* Widget Preview Area */}
            <View className="p-6 items-center border-b border-stone-50 bg-stone-50/50">
              <Text className="text-xs font-bold text-stone-400 mb-4">{t('settings.preview')}</Text>

              {/* Fake Small Widget */}
              <View className="w-32 h-32 rounded-3xl p-4 flex-col justify-between shadow-sm" style={{ backgroundColor: themeColor }}>
                <View className="flex-row justify-between items-start">
                  <Text className="text-white font-bold text-lg">Habit</Text>
                  <View className="w-6 h-6 rounded-full bg-white/20 items-center justify-center">
                    <Check size={14} color="white" />
                  </View>
                </View>
                <View>
                  <Text className="text-white/80 text-xs font-bold">Today</Text>
                  <View className="flex-row items-baseline">
                    <Text className="text-white font-bold text-2xl">Done</Text>
                  </View>
                </View>
              </View>
              <Text className="text-[10px] text-stone-400 mt-2">{t('settings.widgetPreviewNote')}</Text>
            </View>

            {/* Theme Colors */}
            <View className="p-4 border-b border-stone-50">
              <View className="flex-row items-center mb-3">
                <Palette size={16} color={settingsTheme?.text || '#44403c'} className="mr-2" />
                <Text className="font-bold" style={{ color: settingsTheme?.text || '#44403c' }}>{t('settings.themeColor')}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2 px-1 py-1">
                  {THEME_COLORS.map(theme => (
                    <TouchableOpacity
                      key={theme.id}
                      onPress={async () => {
                        setThemeColor(theme.color);
                        try {
                          const userRef = doc(db, 'users', userUid);
                          await updateDoc(userRef, {
                            themeColor: theme.color
                          });
                        } catch (e) {
                          // silent error
                        }
                      }}
                      className={`w-10 h-10 rounded-full items-center justify-center border-2 ${themeColor === theme.color ? 'border-stone-400 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: theme.color }}
                    >
                      {themeColor === theme.color && <Check size={16} color="white" />}
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* App Icon */}
            <View className="p-4">
              <View className="flex-row items-center mb-3">
                <View className="w-4 h-4 rounded-md border border-stone-300 mr-2 items-center justify-center bg-stone-100">
                  <View className="w-2 h-2 rounded-full bg-stone-400" />
                </View>
                <Text className="font-bold" style={{ color: settingsTheme?.text || '#44403c' }}>{t('settings.appIcon')}</Text>
              </View>
              <View className="flex-row justify-between">
                {[
                  { name: 'icon7', labelKey: 'iconDefault', img: require('../../assets/7.png') },
                  { name: 'icon8', labelKey: 'iconPink', img: require('../../assets/8.png') },
                  { name: 'icon6', labelKey: 'iconDark', img: require('../../assets/6.png') }
                ].map((item) => {
                  return (
                    <TouchableOpacity
                      key={item.name}
                      onPress={async () => {
                        try {
                          const AppIcon = require('expo-dynamic-app-icon');
                          if (AppIcon && AppIcon.setAppIcon) {
                            const target = item.name === 'icon7' ? 'icon7' : item.name;
                            // setAppIcon swaps the icon (iOS shows its own localized
                            // system alert). We intentionally do NOT add a second
                            // custom alert here to avoid a duplicate popup.
                            await AppIcon.setAppIcon(target);
                          }
                        } catch (e) {
                          Alert.alert(t('common.error'), t('settings.iconChangeError'));
                        }
                      }}
                      className="items-center"
                    >
                      <Image
                        source={item.img}
                        style={{ width: 64, height: 64, borderRadius: 16, borderWidth: 1, borderColor: '#e7e5e4' }}
                      />
                      <Text className="text-[10px] text-stone-400 mt-1 font-bold">{t(`settings.${item.labelKey}`)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

          </View>
        </View>

        {/* General Settings */}
        <View className="mb-6">
          <Text className="text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider">{t('settings.general')}</Text>
          <View className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100">

            {/* Notifications */}
            <View className="p-4 border-b border-stone-50 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-orange-100 rounded-full items-center justify-center mr-4" style={settingsTheme ? { backgroundColor: settingsTheme.iconBg } : {}}>
                  <Bell size={16} color={settingsTheme ? settingsTheme.iconColor : '#f97316'} />
                </View>
                <Text className="font-bold" style={{ color: settingsTheme?.text || '#44403c' }}>{t('settings.notifications')}</Text>
              </View>
              <TouchableOpacity
                onPress={async () => {
                  const next = !notificationsEnabled;
                  setNotificationsEnabled(next);
                  await updateDoc(doc(db, 'users', userUid), { notificationsEnabled: next });
                }}
                className={`w-12 h-7 rounded-full p-1 ${notificationsEnabled ? '' : 'bg-stone-200'}`}
                style={notificationsEnabled ? { backgroundColor: themeColor } : {}}
              >
                <View className={`w-5 h-5 bg-white rounded-full shadow-sm ${notificationsEnabled ? 'self-end' : 'self-start'}`} />
              </TouchableOpacity>
            </View>

            {/* Reminder */}
            {notificationsEnabled && (
              <>
                <View className="p-4 border-b border-stone-50 flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="w-8 h-8 bg-orange-100 rounded-full items-center justify-center mr-4" style={settingsTheme ? { backgroundColor: settingsTheme.iconBg } : {}}>
                      <Clock size={16} color={settingsTheme ? settingsTheme.iconColor : '#f97316'} />
                    </View>
                    <Text className="font-bold" style={{ color: settingsTheme?.text || '#44403c' }}>{t('settings.reminder')}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleReminderToggle}
                    className={`w-12 h-7 rounded-full p-1 ${reminderEnabled ? '' : 'bg-stone-200'}`}
                    style={reminderEnabled ? { backgroundColor: themeColor } : {}}
                  >
                    <View className={`w-5 h-5 bg-white rounded-full shadow-sm ${reminderEnabled ? 'self-end' : 'self-start'}`} />
                  </TouchableOpacity>
                </View>
                {reminderEnabled && (
                  <TouchableOpacity
                    onPress={() => { setTempHour(reminderHour); setTempMinute(reminderMinute); setShowTimePicker(true); }}
                    className="p-4 border-b border-stone-50 flex-row items-center justify-between active:bg-stone-50"
                  >
                    <Text className="pl-12 font-bold text-stone-500">{t('settings.reminderTime')}</Text>
                    <View className="flex-row items-center">
                      <Text className="text-stone-400 text-xs font-bold mr-1">
                        {`${reminderHour.toString().padStart(2, '0')}:${reminderMinute.toString().padStart(2, '0')}`}
                      </Text>
                      <ChevronRight size={16} color="#d6d3d1" />
                    </View>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Calendar Settings */}
            <View className="p-4 border-b border-stone-50">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 bg-indigo-100 rounded-full items-center justify-center mr-4" style={settingsTheme ? { backgroundColor: settingsTheme.iconBg } : {}}>
                    <Calendar size={16} color={settingsTheme ? settingsTheme.iconColor : '#6366f1'} />
                  </View>
                  <Text className="font-bold" style={{ color: settingsTheme?.text || '#44403c' }}>{t('settings.calendarStart')}</Text>
                </View>
              </View>
              <View className="flex-row gap-3 pl-12">
                <TouchableOpacity
                  onPress={() => handleWeekStartChange(0)}
                  className={`px-3 py-1.5 rounded-lg border ${weekStartDay === 0 ? '' : 'bg-stone-50 border-stone-200'}`}
                  style={weekStartDay === 0 ? { backgroundColor: themeColor, borderColor: themeColor } : {}}
                >
                  <Text className={`text-xs font-bold ${weekStartDay === 0 ? 'text-white' : 'text-stone-600'}`}>{t('settings.sundayStart')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleWeekStartChange(1)}
                  className={`px-3 py-1.5 rounded-lg border ${weekStartDay === 1 ? '' : 'bg-stone-50 border-stone-200'}`}
                  style={weekStartDay === 1 ? { backgroundColor: themeColor, borderColor: themeColor } : {}}
                >
                  <Text className={`text-xs font-bold ${weekStartDay === 1 ? 'text-white' : 'text-stone-600'}`}>{t('settings.mondayStart')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Currency */}
            <View className="p-4">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 bg-yellow-100 rounded-full items-center justify-center mr-4" style={settingsTheme ? { backgroundColor: settingsTheme.iconBg } : {}}>
                    <RefreshCw size={16} color={settingsTheme ? settingsTheme.iconColor : '#eab308'} />
                  </View>
                  <Text className="font-bold" style={{ color: settingsTheme?.text || '#44403c' }}>{t('settings.currency')}</Text>
                </View>
              </View>
              <View className="flex-row flex-wrap gap-2 pl-12 mb-3">
                {['¥', '＄', '❤︎', 'Pt'].map(c => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => handleCurrencyChange(c)}
                    className={`px-3 py-1.5 rounded-lg border ${coupleData?.currency === c ? '' : 'bg-stone-50 border-stone-200'}`}
                    style={coupleData?.currency === c ? {
                      backgroundColor: settingsTheme?.activeOptionBg || '#8f7161',
                      borderColor: settingsTheme?.activeOptionBorder || '#8f7161'
                    } : {}}
                  >
                    <Text
                      className={`text-xs font-bold ${coupleData?.currency === c ? '' : 'text-stone-600'}`}
                      style={coupleData?.currency === c ? { color: settingsTheme?.activeOptionText || 'white' } : {}}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View className="pl-12">
                <TextInput
                  value={['¥', '＄', '❤︎', 'Pt'].includes(coupleData?.currency) ? '' : coupleData?.currency}
                  onChangeText={handleCurrencyChange}
                  placeholder={t('settings.currencyPlaceholder')}
                  className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200 font-bold text-stone-800"
                />
                <Text className="text-[10px] text-stone-400 mt-2">{t('settings.currencyNote')}</Text>
              </View>
            </View>

            {/* Language */}
            <TouchableOpacity
              onPress={handleLanguageChange}
              className="p-4 border-t border-stone-50 flex-row items-center justify-between active:bg-stone-50"
            >
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-4" style={settingsTheme ? { backgroundColor: settingsTheme.iconBg } : {}}>
                  <Text style={{ fontSize: 16 }}>🌐</Text>
                </View>
                <Text className="font-bold" style={{ color: settingsTheme?.text || '#44403c' }}>{t('settings.language')}</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-stone-400 text-xs font-bold mr-1">
                  {i18n.language === 'ja' ? t('settings.japanese') : t('settings.english')}
                </Text>
                <ChevronRight size={16} color="#d6d3d1" />
              </View>
            </TouchableOpacity>

          </View>
        </View>

        {/* About & Legal */}
        <View className="mb-6">
          <Text className="text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider">{t('settings.info')}</Text>
          <View className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100">
            <TouchableOpacity
              onPress={() => navigation.navigate('TermsOfService')}
              className="p-4 border-b border-stone-50 flex-row items-center justify-between active:bg-stone-50"
            >
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-4" style={settingsTheme ? { backgroundColor: settingsTheme.iconBg } : {}}>
                  <FileText size={16} color={settingsTheme ? settingsTheme.iconColor : '#3b82f6'} />
                </View>
                <Text className="font-bold" style={{ color: settingsTheme?.text || '#44403c' }}>{t('settings.dataManagement')}</Text>
              </View>
              <ChevronRight size={16} color="#d6d3d1" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('PrivacyPolicy')}
              className="p-4 border-b border-stone-50 flex-row items-center justify-between active:bg-stone-50"
            >
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center mr-4" style={settingsTheme ? { backgroundColor: settingsTheme.iconBg } : {}}>
                  <Shield size={16} color={settingsTheme ? settingsTheme.iconColor : '#10b981'} />
                </View>
                <Text className="font-bold text-stone-700">{t('settings.privacyPolicy')}</Text>
              </View>
              <ChevronRight size={16} color="#d6d3d1" />
            </TouchableOpacity>

            <View className="p-4 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-stone-100 rounded-full items-center justify-center mr-4" style={settingsTheme ? { backgroundColor: settingsTheme.iconBg } : {}}>
                  <SettingsIcon size={16} color={settingsTheme ? settingsTheme.iconColor : '#78716c'} />
                </View>
                <Text className="font-bold" style={{ color: settingsTheme?.text || '#44403c' }}>{t('settings.partnerLink')}</Text>
              </View>
              <Text className="text-stone-400 font-bold text-xs">1.0.0</Text>
            </View>
          </View>
        </View>

        {/* Pairing & Data */}
        <View className="mb-20">
          <Text className="text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider">{t('settings.pairingData')}</Text>
          <View className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100">
            {/* Couple ID */}
            <View className="flex-row justify-between items-center p-4 border-b border-stone-50">
              <Text className="text-sm text-stone-500">{t('settings.inviteCode')}</Text>
              <View className="flex-row items-center space-x-2">
                <View className="bg-stone-100 px-3 py-1 rounded">
                  <Text className="font-mono font-bold text-stone-800 tracking-widest">{coupleId}</Text>
                </View>
                <TouchableOpacity onPress={copyToClipboard} className="p-2">
                  <Copy size={16} color="#8f7161" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Partner Info */}
            {partnerData ? (
              <View className="p-4 border-b border-stone-50">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-sm text-stone-500">{t('settings.partner')}</Text>
                  <View className="flex-row items-center space-x-2">
                    <Text className="text-xl">{partnerData.photoURL || '😊'}</Text>
                    <Text className="font-bold text-stone-800">{partnerData.displayName || t('settings.noName')}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleUnpair} className="self-end">
                  <Text className="text-xs text-red-400 underline">{t('settings.unlinkPartner')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="p-4 border-b border-stone-50">
                <Text className="text-xs text-stone-400 mb-2 text-center">{t('settings.noPartnerYet')}</Text>
                <Text className="text-xs text-stone-400 text-center mb-4">{t('settings.noPartnerSub')}</Text>

                <View className="flex-row items-center space-x-2 bg-stone-50 p-2 rounded-xl border border-stone-200">
                  <TextInput
                    className="flex-1 font-bold text-stone-800 text-center tracking-widest"
                    placeholder={t('settings.partnerIdPlaceholder')}
                    placeholderTextColor="#a8a29e"
                    value={joinId}
                    onChangeText={setJoinId}
                    autoCapitalize="characters"
                    maxLength={6}
                  />
                  <TouchableOpacity
                    onPress={handleJoinCouple}
                    disabled={loading || !joinId}
                    className={`px-4 py-2 rounded-lg ${!joinId ? 'bg-stone-300' : 'bg-[#8f7161]'}`}
                  >
                    {loading ? <ActivityIndicator size="small" color="white" /> : <Text className="text-white font-bold text-xs">{t('settings.joinButton')}</Text>}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={handleUnpair} className="mt-4 self-center">
                  <Text className="text-xs text-stone-400 underline">{t('settings.cancelPairing')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Logout */}
            <TouchableOpacity
              onPress={handleLogout}
              className="p-4 border-b border-stone-50 flex-row items-center justify-between active:bg-stone-50"
            >
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-stone-100 rounded-full items-center justify-center mr-4" style={settingsTheme ? { backgroundColor: settingsTheme.iconBg } : {}}>
                  <LogOut size={16} color={settingsTheme ? settingsTheme.iconColor : '#78716c'} />
                </View>
                <Text className="font-bold text-stone-700">{t('settings.logout')}</Text>
              </View>
              <ChevronRight size={16} color="#d6d3d1" />
            </TouchableOpacity>

            {/* Delete All Data */}
            <TouchableOpacity
              onPress={handleDeleteAllData}
              className="p-4 flex-row items-center justify-between active:bg-stone-50"
            >
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-red-100 rounded-full items-center justify-center mr-4">
                  <Trash2 size={16} color="#f87171" />
                </View>
                <Text className="font-bold text-red-500">{t('settings.deleteData')}</Text>
              </View>
              <ChevronRight size={16} color="#d6d3d1" />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView >

      <Modal
        visible={showEmojiPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center p-4">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm items-center">
            <Text className="text-lg font-bold text-stone-800 mb-2">{t('settings.changeIconTitle')}</Text>
            <View className="w-full h-64 mb-4">
              <ScrollView nestedScrollEnabled={true}>
                <View className="flex-row flex-wrap justify-center gap-2">
                  {PROFILE_EMOJIS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => setCustomEmoji(emoji)}
                      className={`w-12 h-12 items-center justify-center rounded-full ${customEmoji === emoji ? 'bg-[#8f7161]' : 'bg-stone-100'}`}
                    >
                      <Text className="text-2xl">{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={() => setShowEmojiPicker(false)}
                className="flex-1 p-3 rounded-xl bg-stone-100"
              >
                <Text className="text-center font-bold text-stone-500">{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  if (customEmoji) {
                    await updateProfileIcon(customEmoji);
                  }
                  setShowEmojiPicker(false);
                }}
                className="flex-1 p-3 rounded-xl bg-[#8f7161]"
              >
                <Text className="text-center font-bold text-white">{t('settings.iconSet')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Time Picker Modal */}
      <Modal visible={showTimePicker} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 24, width: '100%' }}>
            <Text style={{ textAlign: 'center', fontWeight: 'bold', color: '#44403c', fontSize: 16, marginBottom: 16 }}>{t('settings.reminderTimeTitle')}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
              {/* Hours */}
              <View style={{ height: 176, width: 72 }}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setTempHour(i)}
                      style={{ height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: tempHour === i ? themeColor : 'transparent' }}
                    >
                      <Text style={{ fontWeight: 'bold', color: tempHour === i ? 'white' : '#57534e' }}>
                        {i.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#57534e', marginHorizontal: 12 }}>:</Text>
              {/* Minutes */}
              <View style={{ height: 176, width: 72 }}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {[0, 15, 30, 45].map(m => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setTempMinute(m)}
                      style={{ height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: tempMinute === m ? themeColor : 'transparent' }}
                    >
                      <Text style={{ fontWeight: 'bold', color: tempMinute === m ? 'white' : '#57534e' }}>
                        {m.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleTimeConfirm}
              style={{ padding: 12, borderRadius: 12, alignItems: 'center', backgroundColor: themeColor }}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default SettingsScreen;
