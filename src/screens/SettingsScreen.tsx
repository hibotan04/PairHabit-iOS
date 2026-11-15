import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, Clipboard, Alert, TextInput, ScrollView, ActivityIndicator, Image, Modal } from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { signOut, GoogleAuthProvider, linkWithCredential, signInWithCredential, deleteUser, getAuth, signInWithCredential as signInSecondary, OAuthProvider, EmailAuthProvider } from 'firebase/auth';
import { initializeApp, getApp, getApps, deleteApp } from 'firebase/app';
import { doc, onSnapshot, updateDoc, deleteField, getDoc, collection, getDocs, deleteDoc, arrayRemove } from 'firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Trash2, LogOut, Check, X, Bell, Moon, Sun, Monitor, Heart, Shield, FileText, ChevronRight, Copy, Crown, Pencil, Settings as SettingsIcon, Calendar, Palette, RefreshCw, Mail } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
// import { EmojiKeyboard } from 'rn-emoji-keyboard';
import { THEME_COLORS, THEME_PALETTES } from '../constants/theme';
import { SHA256 } from 'crypto-js';

import { generateAppleNonce } from '../utils/appleNonce';

interface SettingsScreenProps {
  coupleId: string;
  userUid: string;
  initialThemeColor?: string;
}

export default function SettingsScreen({ coupleId, userUid, initialThemeColor = '#8f7161' }: SettingsScreenProps) {
  const [userData, setUserData] = useState<any>(null);
  const [partnerData, setPartnerData] = useState<any>(null);
  const [coupleData, setCoupleData] = useState<any>(null);
  const navigation = useNavigation<any>();

  // Guard against missing coupleId (e.g. after unpairing)
  if (!coupleId) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#8f7161" />
      </View>
    );
  }

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
  const [themeColor, setThemeColor] = useState(initialThemeColor);
  const [currentIcon, setCurrentIcon] = useState('icon7');

  // Linking State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showEmailLinkModal, setShowEmailLinkModal] = useState(false);
  const [linkEmail, setLinkEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');

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
        setEditName(data.displayName || '名無し');
        setEditIcon(data.photoURL || '😊');
        setEditIconBg(data.iconBg || '#ffe6e7');
        setWeekStartDay(data.weekStartDay || 0);
        setThemeColor(data.themeColor || '#8f7161');

      }
    });

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

  useEffect(() => {
    const fetchCurrentIcon = async () => {
      try {
        const AppIcon = require('expo-dynamic-app-icon');
        if (AppIcon && AppIcon.getIconName) {
          const name = await AppIcon.getIconName();
          setCurrentIcon(name || 'icon7');
        }
      } catch (e) {
        console.log("Failed to get app icon name", e);
      }
    };
    fetchCurrentIcon();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const copyToClipboard = () => {
    Clipboard.setString(coupleId);
    Alert.alert("コピーしました", `カップルID: ${coupleId}`);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert("エラー", "名前を入力してください");
      return;
    }
    setLoading(true);
    try {
      const userRef = doc(db, 'users', userUid);
      await updateDoc(userRef, {
        displayName: editName
      });
      setIsEditingName(false);
      Alert.alert("完了", "名前を更新しました");
    } catch (e) {
      console.error("Error updating profile:", e);
      Alert.alert("エラー", "更新に失敗しました");
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
      // Local state update is handled by onSnapshot
    } catch (e) {
      console.error("Error updating icon:", e);
      Alert.alert("エラー", "アイコンの更新に失敗しました");
    }
  };

  const updateProfileIconBg = async (newBg: string) => {
    try {
      setEditIconBg(newBg); // Optimistic update
      const userRef = doc(db, 'users', userUid);
      await updateDoc(userRef, {
        iconBg: newBg
      });
    } catch (e) {
      console.error("Error updating icon bg:", e);
      Alert.alert("エラー", "背景色の更新に失敗しました");
      setEditIconBg(userData?.iconBg || '#ffe6e7');
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
      Alert.alert("エラー", "通貨の変更に失敗しました");
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
      Alert.alert("エラー", "設定の更新に失敗しました");
      setWeekStartDay(userData?.weekStartDay || 0); // Revert
    }
  };
  const handleUnpair = () => {
    Alert.alert(
      "パートナーとの連携解除",
      "本当に解除しますか？\n\n【注意】\nこれまでの二人の思い出や習慣の達成状況など、全ての共有データが消去されます。この操作は取り消せません。",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "解除する",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              // 1. Try to remove user from Couple Document (Best Effort)
              try {
                const coupleRef = doc(db, 'couples', coupleId);
                await updateDoc(coupleRef, {
                  users: arrayRemove(userUid),
                  [`members.${userUid}`]: deleteField()
                });
              } catch (coupleError) {
                console.warn("[Unpair] Failed to remove from couple doc (proceeding anyway):", coupleError);
              }

              // 2. Remove coupleId from User Document (Force Unlink)
              const userRef = doc(db, 'users', userUid);
              await updateDoc(userRef, {
                coupleId: deleteField()
              });

              Alert.alert("完了", "連携を解除しました");
            } catch (e: any) {
              console.error("Error unpairing:", e);
              Alert.alert("エラー", "解除に失敗しました: " + (e.message || e));
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };



  const handleDeleteAccount = () => {
    Alert.alert(
      "アカウント削除",
      "【重要】\nアカウントを完全に削除します。\n・全てのデータが消え、復元できません。\n・サブスクリプションの解約は別途App Storeで行う必要があります。\n\n本当に削除しますか？",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除する",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              // 1. Try to cleanup data if possible (Best effort)
              try {
                const userRef = doc(db, 'users', userUid);
                await deleteDoc(userRef);
                if (coupleId) {
                  // Try to remove self from couple
                  const coupleRef = doc(db, 'couples', coupleId);
                  await updateDoc(coupleRef, {
                    users: arrayRemove(userUid),
                    [`members.${userUid}`]: deleteField()
                  });
                }
              } catch (cleanupError) {
                console.warn("Cleanup error (proceeding to delete auth):", cleanupError);
              }

              // 2. Delete Auth User
              if (auth.currentUser) {
                await deleteUser(auth.currentUser);
                Alert.alert("完了", "アカウントを削除しました。ご利用ありがとうございました。");
                // App will auto logout
              }
            } catch (e: any) {
              console.error("Error deleting account:", e);
              if (e.code === 'auth/requires-recent-login') {
                Alert.alert("再ログインが必要です", "セキュリティのため、アカウント削除の前に一度ログアウトし、再ログインしてください。");
              } else {
                Alert.alert("エラー", "アカウント削除に失敗しました: " + e.message);
              }
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
      "パートナーに参加",
      "指定されたIDのカップルに参加しますか？\n現在のデータは表示されなくなります。",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "参加する",
          onPress: async () => {
            setLoading(true);
            try {
              const targetId = joinId.trim().toUpperCase();
              const coupleRef = doc(db, 'couples', targetId);
              const coupleSnap = await getDoc(coupleRef);

              if (!coupleSnap.exists()) {
                Alert.alert("エラー", "指定されたIDのカップルが見つかりません。");
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
              Alert.alert("成功", "パートナーと連携しました！");

            } catch (e) {
              console.error(e);
              Alert.alert("エラー", "参加に失敗しました。");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleLinkGoogle = async () => {
    setLoading(true);
    let googleCredential: any = null;
    let switched = false;
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResult: any = await GoogleSignin.signIn();
      let idToken = signInResult.idToken;
      if (!idToken && signInResult.data) {
        idToken = signInResult.data.idToken;
      }
      if (!idToken) throw new Error('No ID token found');

      googleCredential = GoogleAuthProvider.credential(idToken);
      if (auth.currentUser) {
        await linkWithCredential(auth.currentUser, googleCredential);
        Alert.alert("連携成功", "Googleアカウントと連携しました！");
      }
    } catch (error: any) {
      console.error(error);
      if (error && error.code === 'auth/credential-already-in-use') {
        // Show option to switch accounts or overwrite
        Alert.alert(
          "アカウント重複",
          "このGoogleアカウントは既に他のデータと紐付いています。",
          [
            { text: "キャンセル", style: "cancel", onPress: () => setLoading(false) },
            {
              text: "既存データでログイン",
              onPress: () => {
                Alert.alert(
                  "データ消去の確認",
                  "既存のアカウントでログインすると、現在の（ゲスト）データは消去されます。\n本当によろしいですか？",
                  [
                    { text: "キャンセル", style: "cancel", onPress: () => setLoading(false) },
                    {
                      text: "はい、ログインします",
                      style: "destructive",
                      onPress: async () => {
                        if (googleCredential) {
                          try {
                            setLoading(true);
                            switched = true;
                            await signInWithCredential(auth, googleCredential);
                          } catch (e) {
                            Alert.alert("エラー", "ログインに失敗しました");
                            setLoading(false);
                          }
                        }
                      }
                    }
                  ]
                );
              }
            },
            {
              text: "今のデータで上書き",
              style: "destructive",
              onPress: () => {
                Alert.alert(
                  "最終確認",
                  "Googleアカウントに保存されている元々のデータは完全に消去されます。\nこの操作は取り消せません。\n本当に上書きしますか？",
                  [
                    { text: "キャンセル", style: "cancel", onPress: () => setLoading(false) },
                    {
                      text: "はい、上書きします",
                      style: "destructive",
                      onPress: async () => {
                        if (googleCredential) {
                          try {
                            setLoading(true);
                            switched = true; // prevent default loading false

                            // 1. Initialize secondary app to delete the OTHER user
                            const secondaryAppName = 'SecondaryAuthApp';
                            let secondaryApp;
                            if (getApps().length > 0 && getApps().find(a => a.name === secondaryAppName)) {
                              secondaryApp = getApp(secondaryAppName);
                            } else {
                              secondaryApp = initializeApp(auth.app.options, secondaryAppName);
                            }
                            const secondaryAuth = getAuth(secondaryApp);

                            // 2. Sign in as the EXISTING conflicting user on secondary app
                            const userCredentialB = await signInSecondary(secondaryAuth, googleCredential);
                            const userB = userCredentialB.user;

                            // 3. Delete that user (User B)
                            await deleteUser(userB);

                            // 4. Link current user (A) with the credential (now free)
                            if (auth.currentUser) {
                              await linkWithCredential(auth.currentUser, googleCredential);
                              Alert.alert("成功", "古いデータを削除し、現在のアカウントと連携しました！");
                            }

                            setLoading(false); // Done
                          } catch (e: any) {
                            console.error(e);
                            Alert.alert("エラー", "上書き連携に失敗しました: " + (e.message || 'Error'));
                            setLoading(false);
                          }
                        }
                      }
                    }
                  ]
                );
              }
            }
          ]
        );
        return;
      } else if (error.code === 'SIGN_IN_CANCELLED') {
        // ignore
      } else {
        Alert.alert("エラー", "Google連携に失敗しました: " + (error.message || 'Unknown error'));
      }
    }

    // Only clear loading if we didn't switch (switching keeps loading until unmount/nav)
    if (!switched) setLoading(false);
  };

  const handleLinkApple = async () => {
    setLoading(true);
    setShowLinkModal(false);
    let appleCredential: any = null;
    let switched = false;
    let rawNonce = '';

    try {
      // Generate explicit nonce
      rawNonce = generateAppleNonce();
      const hashedNonce = SHA256(rawNonce).toString();
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce, // Pass hashed nonce to Apple
      });

      const { identityToken } = credential;
      if (!identityToken) throw new Error("Apple Sign-In failed - no identity token");

      const provider = new OAuthProvider('apple.com');
      appleCredential = provider.credential({
        idToken: identityToken,
        rawNonce: rawNonce, // Pass RAW nonce to Firebase
      });

      if (auth.currentUser) {
        await linkWithCredential(auth.currentUser, appleCredential);
        Alert.alert("連携成功", "Appleアカウントと連携しました！");
      }
    } catch (e: any) {
      if (e.code === 'ERR_REQUEST_CANCELED') {
        // ignore
      } else if (e.code === 'auth/credential-already-in-use') {
        // Handle Conflict
        Alert.alert(
          "アカウント重複",
          "このAppleアカウントは既に他のデータと紐付いています。",
          [
            { text: "キャンセル", style: "cancel", onPress: () => setLoading(false) },
            {
              text: "既存データでログイン",
              onPress: () => {
                Alert.alert(
                  "データ消去の確認",
                  "既存のアカウントでログインすると、現在のデータ（未保存の内容）は失われます。\n本当によろしいですか？",
                  [
                    { text: "キャンセル", style: "cancel", onPress: () => setLoading(false) },
                    {
                      text: "はい、ログインします",
                      style: "destructive",
                      onPress: async () => {
                        if (appleCredential) {
                          try {
                            setLoading(true);
                            switched = true;
                            await signInWithCredential(auth, appleCredential);
                          } catch (err) {
                            Alert.alert("エラー", "ログインに失敗しました");
                            setLoading(false);
                          }
                        }
                      }
                    }
                  ]
                );
              }
            },
            {
              text: "今のデータで上書き",
              style: "destructive",
              onPress: () => {
                Alert.alert(
                  "最終確認",
                  "Appleアカウントに保存されている元々のデータは完全に消去されます。\nこの操作は取り消せません。\n本当に上書きしますか？",
                  [
                    { text: "キャンセル", style: "cancel", onPress: () => setLoading(false) },
                    {
                      text: "はい、上書きします",
                      style: "destructive",
                      onPress: async () => {
                        // We must NOT reuse appleCredential here because the nonce was likely consumed by the failed link attempt.
                        try {
                          setLoading(true);
                          switched = true; // prevent early loading false

                          // 1. Initialize secondary app (same as before)
                          const secondaryAppName = 'SecondaryAuthApp';
                          let secondaryApp;
                          if (getApps().length > 0 && getApps().find(a => a.name === secondaryAppName)) {
                            secondaryApp = getApp(secondaryAppName);
                          } else {
                            secondaryApp = initializeApp(auth.app.options, secondaryAppName);
                          }
                          const secondaryAuth = getAuth(secondaryApp);

                          // 2. Request Fresh Token for Deletion
                          // Alert handled by system prompt usually, but we can assume user knows they need to sign in.
                          // Or we can show a specific prompt if needed, but the system FaceID prompt is self-explanatory if context is clear.

                          const deleteNonceRaw = generateAppleNonce();
                          const deleteNonceHash = SHA256(deleteNonceRaw).toString();

                          const deleteCredential = await AppleAuthentication.signInAsync({
                            requestedScopes: [
                              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                              AppleAuthentication.AppleAuthenticationScope.EMAIL,
                            ],
                            nonce: deleteNonceHash
                          });

                          if (!deleteCredential.identityToken) throw new Error("Deletion Sign-In failed");

                          const provider = new OAuthProvider('apple.com');
                          const credentialForDelete = provider.credential({
                            idToken: deleteCredential.identityToken,
                            rawNonce: deleteNonceRaw
                          });

                          // 3. Sign in as conflict user (using FRESH token)
                          const userCredentialB = await signInSecondary(secondaryAuth, credentialForDelete);
                          const userB = userCredentialB.user;

                          // 4. Delete that user
                          await deleteUser(userB);

                          // 5. Link current user - WE NEED A FRESH TOKEN for Apple
                          if (auth.currentUser) {
                            Alert.alert("確認", "古いデータを削除しました。\n連携を完了するため、もう一度Appleサインインを行ってください。");

                            // Generate refresh nonce
                            const newRawNonce = generateAppleNonce();
                            const newHashedNonce = SHA256(newRawNonce).toString();

                            const newCredential = await AppleAuthentication.signInAsync({
                              requestedScopes: [
                                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                                AppleAuthentication.AppleAuthenticationScope.EMAIL,
                              ],
                              nonce: newHashedNonce
                            });
                            if (!newCredential.identityToken) throw new Error("Retry failed");

                            const newProvider = new OAuthProvider('apple.com');
                            const newAppleCredential = newProvider.credential({
                              idToken: newCredential.identityToken,
                              rawNonce: newRawNonce // Pass RAW nonce
                            });

                            await linkWithCredential(auth.currentUser, newAppleCredential);
                            Alert.alert("成功", "現在のアカウントと正常に連携しました！");
                          }
                          setLoading(false);
                        } catch (err: any) {
                          console.error(err);
                          Alert.alert("エラー", "上書き連携に失敗しました: " + (err.message || 'Error'));
                          setLoading(false);
                        }
                      }
                    }
                  ]
                );
              }
            }
          ]
        );
        return;
      } else {
        Alert.alert("エラー", "Apple連携に失敗しました: " + e.message);
      }
    }

    if (!switched) setLoading(false);
  };

  const handleLinkEmail = async () => {
    if (!linkEmail || !linkPassword) {
      Alert.alert("エラー", "メールアドレスとパスワードを入力してください");
      return;
    }
    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(linkEmail, linkPassword);
      if (auth.currentUser) {
        await linkWithCredential(auth.currentUser, credential);
        Alert.alert("連携成功", "メールアドレスと連携しました！");
        setShowEmailLinkModal(false);
        setLinkEmail('');
        setLinkPassword('');
      }
    } catch (e: any) {
      console.error(e);
      if (e.code === 'auth/credential-already-in-use') {
        Alert.alert("エラー", "このメールアドレスは既に他のアカウントで使用されています。");
      } else if (e.code === 'auth/invalid-email') {
        Alert.alert("エラー", "メールアドレスの形式が正しくありません。");
      } else if (e.code === 'auth/weak-password') {
        Alert.alert("エラー", "パスワードは6文字以上で入力してください。");
      } else {
        Alert.alert("エラー", "連携に失敗しました: " + e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const PROFILE_EMOJIS = ["😊", "🐱", "🐶", "🐰", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐙", "🦄", "🦋", "🌻", "🌸", "🍀", "⭐️", "🌙", "☀️", "🍎", "🍓", "🍔", "🍕", "🍣", "🍙", "🍦", "🍩", "🍪", "⚽️", "🏀", "🎮", "🎵", "🎨", "✈️", "🚀", "🚗", "🏠", "💎"];

  const settingsTheme = THEME_PALETTES[themeColor]?.settings;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: headerBg }}>
      {/* Fixed Header */}
      <View style={{ backgroundColor: headerBg, borderBottomWidth: 1, borderBottomColor: '#f5f5f4', paddingBottom: 16 }}>
        <View className="items-center py-2">
          <Text className="text-lg font-bold" style={{ color: headerText }}>設定</Text>
        </View>
      </View>

      <KeyboardAwareScrollView
        style={{ flex: 1, backgroundColor: screenBg }}
        contentContainerStyle={{ padding: 24 }}
        enableOnAndroid={true}
        extraScrollHeight={100}
        keyboardShouldPersistTaps="handled"
      >

        {/* Pro Membership Banner */}
        {/* Pro Membership Banner */}
        {/* Pro Membership Banner (Hidden if already Pro) */}
        {!userData?.isPro && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Subscription')}
            className="mb-8 bg-stone-800 rounded-3xl p-6 shadow-md overflow-hidden relative"
          >
            <View className="absolute top-0 right-0 p-4 opacity-10">
              <Crown size={120} color="white" />
            </View>
            <View className="flex-row items-center mb-2">
              <Crown size={24} color="#fbbf24" className="mr-4" />
              <Text className="text-amber-400 font-bold text-lg">PRO メンバーシップ</Text>
            </View>
            <Text className="text-stone-300 text-xs mb-4">
              保存できる写真の枚数が無制限になります。{'\n'}二人の絆をこれまで以上に残しましょう。
            </Text>
            <View className="bg-amber-400 self-start px-4 py-2 rounded-full">
              <Text className="text-stone-900 font-bold text-xs">アップグレードする</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Account Settings */}
        <View className="mb-6">
          <Text className="text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider">アカウント</Text>

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
                  {userData?.isPro && (
                    <View className="bg-amber-100 flex-row items-center px-2 py-0.5 rounded mr-2 border border-amber-200">
                      <Crown size={10} color="#d97706" className="mr-1" />
                      <Text className="text-[10px] font-bold text-amber-700">PROプラン</Text>
                    </View>
                  )}
                  {auth.currentUser?.isAnonymous && (
                    <View className="bg-stone-200 px-2 py-0.5 rounded mr-3">
                      <Text className="text-[10px] font-bold text-stone-600">ゲスト</Text>
                    </View>
                  )}
                  <Text className="text-xs text-stone-400">ID: {userUid.substring(0, 6)}</Text>
                </View>
              </View>

              {/* Account Linking Status */}
              <View className="mt-2">
                {/* Google Status */}
                {auth.currentUser?.providerData.some(p => p.providerId === 'google.com') && (
                  <View className="flex-row items-center mb-1">
                    <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                    <Text className="text-xs font-bold text-stone-500">Google連携済み</Text>
                    {/* <Text className="text-[10px] text-stone-400 ml-2">{auth.currentUser?.email}</Text> */}
                  </View>
                )}

                {/* Apple Status */}
                {auth.currentUser?.providerData.some(p => p.providerId === 'apple.com') && (
                  <View className="flex-row items-center mb-1">
                    <View className="w-2 h-2 rounded-full bg-stone-800 mr-2" />
                    <Text className="text-xs font-bold text-stone-500">Apple連携済み</Text>
                  </View>
                )}

                {/* Email Status */}
                {auth.currentUser?.providerData.some(p => p.providerId === 'password') && (
                  <View className="flex-row items-center mb-1">
                    <View className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                    <Text className="text-xs font-bold text-stone-500">メールアドレス連携済み</Text>
                    {/* <Text className="text-[10px] text-stone-400 ml-2">{auth.currentUser?.email}</Text> */}
                  </View>
                )}

                {/* Link Button (for Guests or unlinked) */}
                {/* Actually, even if linked to one, they might want to link another? */}
                {/* User request: "If guest... show generic link... if linked... show linked status... remove link google if linked" */}

                {/* Show link button if there is at least one provider NOT linked? Or just always show 'Add Link'? */}
                {/* The user said "hide 'link with google' if linked". Let's show "Link Account" only if they are primarily Guest OR want to add more. */}
                {/* Let's show "＋ アカウントを連携する" to allow adding multiple methods. */}

                <TouchableOpacity
                  onPress={() => setShowLinkModal(true)}
                  className="mt-2 flex-row items-center"
                >
                  <View className="bg-stone-100 rounded-full p-1 mr-2">
                    <SettingsIcon size={12} color="#a8a29e" />
                  </View>
                  <Text className="text-xs font-bold text-stone-500 underline">アカウント連携設定</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>


        {/* Link Options Modal */}
        <Modal
          visible={showLinkModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowLinkModal(false)}
        >
          <View className="flex-1 bg-black/50 justify-center items-center p-4">
            <View className="bg-white rounded-3xl w-full max-w-sm overflow-hidden">
              <View className="p-4 border-b border-stone-100 flex-row justify-between items-center">
                <Text className="font-bold text-stone-700">アカウント連携</Text>
                <TouchableOpacity onPress={() => setShowLinkModal(false)} className="p-1 bg-stone-100 rounded-full">
                  <X size={16} color="#78716c" />
                </TouchableOpacity>
              </View>

              <View className="p-4">
                <Text className="text-xs text-stone-400 mb-4">
                  データを保護し、機種変更時などに復元できるように、アカウントを連携してください。複数の方法を連携できます。
                </Text>

                {/* Google */}
                {!auth.currentUser?.providerData.some(p => p.providerId === 'google.com') && (
                  <TouchableOpacity
                    onPress={() => { setShowLinkModal(false); handleLinkGoogle(); }}
                    className="flex-row items-center bg-white border border-stone-200 p-3 rounded-xl mb-3"
                  >
                    <View className="w-6 h-6 items-center justify-center mr-3">
                      {/* Simple Google Icon rep */}
                      <Text className="text-lg">G</Text>
                    </View>
                    <Text className="font-bold text-stone-700">Googleで連携</Text>
                  </TouchableOpacity>
                )}

                {/* Apple */}
                {!auth.currentUser?.providerData.some(p => p.providerId === 'apple.com') && (
                  <TouchableOpacity
                    onPress={handleLinkApple}
                    className="flex-row items-center bg-black p-3 rounded-xl mb-3"
                  >
                    <View className="w-6 h-6 items-center justify-center mr-3">
                      <Text className="text-white text-lg"></Text>
                    </View>
                    <Text className="font-bold text-white">Appleで連携</Text>
                  </TouchableOpacity>
                )}

                {/* Email */}
                {!auth.currentUser?.providerData.some(p => p.providerId === 'password') && (
                  <TouchableOpacity
                    onPress={() => { setShowLinkModal(false); setShowEmailLinkModal(true); }}
                    className="flex-row items-center bg-stone-200 p-3 rounded-xl"
                  >
                    <View className="w-6 h-6 items-center justify-center mr-3">
                      <Mail size={18} color="#57534e" />
                    </View>
                    <Text className="font-bold text-stone-700">メールアドレスで連携</Text>
                  </TouchableOpacity>
                )}

                {auth.currentUser?.providerData.length === 3 && (
                  <Text className="text-center text-stone-400 text-xs">全てのアカウントと連携済みです✨</Text>
                )}
              </View>
            </View>
          </View>
        </Modal>

        {/* Email Link Input Modal */}
        <Modal
          visible={showEmailLinkModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowEmailLinkModal(false)}
        >
          <View className="flex-1 bg-black/50 justify-center items-center p-4">
            <View className="bg-white rounded-3xl w-full max-w-sm overflow-hidden">
              <View className="p-4 border-b border-stone-100 flex-row justify-between items-center">
                <Text className="font-bold text-stone-700">メール連携設定</Text>
                <TouchableOpacity onPress={() => setShowEmailLinkModal(false)} className="p-1 bg-stone-100 rounded-full">
                  <X size={16} color="#78716c" />
                </TouchableOpacity>
              </View>

              <View className="p-6">
                <TextInput
                  className="w-full bg-stone-50 p-3 rounded-xl border border-stone-200 mb-3"
                  placeholder="メールアドレス"
                  value={linkEmail}
                  onChangeText={setLinkEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TextInput
                  className="w-full bg-stone-50 p-3 rounded-xl border border-stone-200 mb-6"
                  placeholder="パスワード (6文字以上)"
                  value={linkPassword}
                  onChangeText={setLinkPassword}
                  secureTextEntry
                />
                <TouchableOpacity
                  onPress={handleLinkEmail}
                  className="bg-[#8f7161] p-3 rounded-xl items-center"
                >
                  <Text className="text-white font-bold">連携する</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        {/* App Settings */}
        <View className="mb-6">
          <Text className="text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider">アプリ設定</Text>
          <View className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100">

            {/* Notifications */}
            <View className="p-4 border-b border-stone-50 flex-col">
              <View className="w-full flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 bg-orange-100 rounded-full items-center justify-center mr-4" style={settingsTheme ? { backgroundColor: settingsTheme.iconBg } : {}}>
                    <Bell size={16} color={settingsTheme ? settingsTheme.iconColor : '#f97316'} />
                  </View>
                  <Text className="font-bold" style={{ color: settingsTheme?.text || '#44403c' }}>通知</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={`w-12 h-7 rounded-full p-1 ${notificationsEnabled ? '' : 'bg-stone-200'}`}
                  style={notificationsEnabled ? { backgroundColor: themeColor } : {}}
                >
                  <View className={`w-5 h-5 bg-white rounded-full shadow-sm ${notificationsEnabled ? 'self-end' : 'self-start'}`} />
                </TouchableOpacity>
              </View>

              {/* Test Notification Button */}
              {notificationsEnabled && (
                <TouchableOpacity
                  className="mt-3 py-2 px-3 bg-stone-50 rounded-lg self-start"
                  onPress={async () => {
                    const { registerForPushNotificationsAsync, sendPushNotification } = require('../utils/notificationHelper');
                    try {
                      setLoading(true);
                      const token = await registerForPushNotificationsAsync();
                      if (token) {
                        await sendPushNotification(token, "テスト通知", "これは通知のテストです！🔔\n正しく届いていますか？");
                        Alert.alert("送信完了", "テスト通知を送信しました。\n5〜10秒ほど待ってみてください。");
                      } else {
                        Alert.alert("エラー", "プッシュトークンの取得に失敗しました。");
                      }
                    } catch (e: any) {
                      Alert.alert("エラー", "送信エラー: " + e.message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <Text className="text-xs font-bold text-stone-500">🔔 テスト通知を送る</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Calendar Settings */}
            <View className="p-4 border-b border-stone-50">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 bg-indigo-100 rounded-full items-center justify-center mr-4" style={settingsTheme ? { backgroundColor: settingsTheme.iconBg } : {}}>
                    <Calendar size={16} color={settingsTheme ? settingsTheme.iconColor : '#6366f1'} />
                  </View>
                  <Text className="font-bold" style={{ color: settingsTheme?.text || '#44403c' }}>カレンダー始まり</Text>
                </View>
              </View>
              <View className="flex-row gap-3 pl-12">
                <TouchableOpacity
                  onPress={() => handleWeekStartChange(0)}
                  className={`px-3 py-1.5 rounded-lg border ${weekStartDay === 0 ? '' : 'bg-stone-50 border-stone-200'}`}
                  style={weekStartDay === 0 ? { backgroundColor: themeColor, borderColor: themeColor } : {}}
                >
                  <Text className={`text-xs font-bold ${weekStartDay === 0 ? 'text-white' : 'text-stone-600'}`}>日曜始まり</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleWeekStartChange(1)}
                  className={`px-3 py-1.5 rounded-lg border ${weekStartDay === 1 ? '' : 'bg-stone-50 border-stone-200'}`}
                  style={weekStartDay === 1 ? { backgroundColor: themeColor, borderColor: themeColor } : {}}
                >
                  <Text className={`text-xs font-bold ${weekStartDay === 1 ? 'text-white' : 'text-stone-600'}`}>月曜始まり</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Theme & Icon */}
            <View className="p-4 border-b border-stone-50">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 bg-pink-100 rounded-full items-center justify-center mr-4" style={settingsTheme ? { backgroundColor: settingsTheme.iconBg } : {}}>
                    <Palette size={16} color={settingsTheme ? settingsTheme.iconColor : '#ec4899'} />
                  </View>
                  <Text className="font-bold" style={{ color: settingsTheme?.text || '#44403c' }}>テーマ</Text>
                </View>
              </View>

              {/* Colors */}
              <View className="pl-12 mb-6">
                <Text className="text-xs font-bold text-stone-400 mb-2">カラー</Text>
                <View className="flex-row gap-3 flex-wrap">
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
                          console.error("Error saving theme color:", e);
                          Alert.alert("エラー", "テーマの保存に失敗しました");
                        }
                      }}
                      className={`flex-row items-center px-3 py-1.5 rounded-full border-2 ${themeColor === theme.color ? 'border-stone-400' : 'border-transparent'}`}
                      style={
                        themeColor === theme.color
                          ? { backgroundColor: theme.color, borderColor: settingsTheme?.activeOptionBorder || '#8f7161' }
                          : { backgroundColor: theme.color }
                      }
                    >
                      {themeColor === theme.color && <Check size={12} color="white" className="mr-1" />}
                      <Text className="text-white text-xs font-bold">{theme.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Icons */}
              <View className="pl-12">
                <Text className="text-xs font-bold text-stone-400 mb-2">アプリアイコン</Text>
                <View className="flex-row gap-4">
                  {[
                    { name: 'icon7', label: 'Default', img: require('../../assets/7.png') },
                    { name: 'icon8', label: 'Pink', img: require('../../assets/8.png') },
                    { name: 'icon6', label: 'Dark', img: require('../../assets/6.png') }
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.name}
                      onPress={async () => {
                        try {
                          const AppIcon = require('expo-dynamic-app-icon');
                          if (AppIcon && AppIcon.setAppIcon) {
                            const target = item.name === 'icon7' ? 'icon7' : item.name;
                            await AppIcon.setAppIcon(target);
                            setCurrentIcon(target);
                            Alert.alert("変更完了", "ホーム画面のアイコンが変更されました");
                          } else {
                            Alert.alert("エラー", "この機能はネイティブビルドが必要です");
                          }
                        } catch (e) {
                          console.error(e);
                          Alert.alert("エラー", "アイコンの変更に失敗しました");
                        }
                      }}
                      className="items-center"
                    >
                      <Image
                        source={item.img}
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 14,
                          borderWidth: currentIcon === item.name ? 2 : 1,
                          borderColor: currentIcon === item.name ? (settingsTheme?.iconColor || '#8f7161') : '#e7e5e4'
                        }}
                      />
                      <View className="h-6 items-center justify-center mt-1">
                        {currentIcon === item.name && (
                          <View className="rounded-full p-0.5" style={{ backgroundColor: settingsTheme?.iconColor || '#8f7161' }}>
                            <Check size={12} color="white" />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Currency */}
            <View className="p-4">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 bg-yellow-100 rounded-full items-center justify-center mr-4" style={settingsTheme ? { backgroundColor: settingsTheme.iconBg } : {}}>
                    <RefreshCw size={16} color={settingsTheme ? settingsTheme.iconColor : '#eab308'} />
                  </View>
                  <Text className="font-bold" style={{ color: settingsTheme?.text || '#44403c' }}>通貨単位</Text>
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
                  placeholder="自由入力 (例: P)"
                  className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200 font-bold text-stone-800"
                />
                <Text className="text-[10px] text-stone-400 mt-2">※ アプリ全体の通貨単位として表示されます</Text>
              </View>
            </View>

          </View>
        </View>

        {/* About & Legal */}
        <View className="mb-6">
          <Text className="text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider">情報・サポート</Text>
          <View className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100">
            <TouchableOpacity
              onPress={() => navigation.navigate('TermsOfService')}
              className="p-4 border-b border-stone-50 flex-row items-center justify-between active:bg-stone-50"
            >
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-4" style={settingsTheme ? { backgroundColor: settingsTheme.iconBg } : {}}>
                  <FileText size={16} color={settingsTheme ? settingsTheme.iconColor : '#3b82f6'} />
                </View>
                <Text className="font-bold" style={{ color: settingsTheme?.text || '#44403c' }}>データ管理</Text>
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
                <Text className="font-bold text-stone-700">プライバシーポリシー</Text>
              </View>
              <ChevronRight size={16} color="#d6d3d1" />
            </TouchableOpacity>

            <View className="p-4 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-stone-100 rounded-full items-center justify-center mr-4" style={settingsTheme ? { backgroundColor: settingsTheme.iconBg } : {}}>
                  <SettingsIcon size={16} color={settingsTheme ? settingsTheme.iconColor : '#78716c'} />
                </View>
                <Text className="font-bold" style={{ color: settingsTheme?.text || '#44403c' }}>パートナー連携</Text>
              </View>
              <Text className="text-stone-400 font-bold text-xs">1.0.0</Text>
            </View>
          </View>
        </View>

        {/* Pairing & Data */}
        <View className="mb-20">
          <Text className="text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider">ペアリング & データ</Text>
          <View className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100">
            {/* Couple ID */}
            {/* Couple ID (Only show if not paired) */}
            {!partnerData && (
              <View className="flex-row justify-between items-center p-4 border-b border-stone-50">
                <Text className="text-sm text-stone-500">招待コード</Text>
                <View className="flex-row items-center space-x-2">
                  <View className="bg-stone-100 px-3 py-1 rounded">
                    <Text className="font-mono font-bold text-stone-800 tracking-widest">{coupleId}</Text>
                  </View>
                  <TouchableOpacity onPress={copyToClipboard} className="p-2">
                    <Copy size={16} color="#8f7161" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Partner Info */}
            {partnerData ? (
              <View className="p-4 border-b border-stone-50">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-sm text-stone-500">パートナー</Text>
                  <View className="flex-row items-center space-x-2">
                    <Text className="text-xl">{partnerData.photoURL || '😊'}</Text>
                    <Text className="font-bold text-stone-800">{partnerData.displayName || '名無し'}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleUnpair} className="self-end">
                  <Text className="text-xs text-red-400 underline">パートナーとの連携を解除</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="p-4 border-b border-stone-50">
                <Text className="text-xs text-stone-400 mb-2 text-center">パートナーがまだ参加していません</Text>
                <Text className="text-xs text-stone-400 text-center mb-4">招待コードを共有してペアリングしましょう</Text>

                <View className="flex-row items-center space-x-2 bg-stone-50 p-2 rounded-xl border border-stone-200">
                  <TextInput
                    className="flex-1 font-bold text-stone-800 text-center tracking-widest"
                    placeholder="相手のIDを入力"
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
                    {loading ? <ActivityIndicator size="small" color="white" /> : <Text className="text-white font-bold text-xs">参加</Text>}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={handleUnpair} className="mt-4 self-center">
                  <Text className="text-xs text-stone-400 underline">ペアリングをキャンセル（連携解除）</Text>
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
                <Text className="font-bold text-stone-700">ログアウト</Text>
              </View>
              <ChevronRight size={16} color="#d6d3d1" />
            </TouchableOpacity>



            {/* Delete Account */}
            <TouchableOpacity
              onPress={handleDeleteAccount}
              className="p-4 flex-row items-center justify-between active:bg-stone-50"
            >
              <View className="flex-row items-center">
                <View className="w-8 h-8 bg-red-100 rounded-full items-center justify-center mr-4">
                  <Trash2 size={16} color="#f87171" />
                </View>
                <Text className="font-bold text-red-500">アカウント削除</Text>
              </View>
              <ChevronRight size={16} color="#d6d3d1" />
            </TouchableOpacity>
          </View>
        </View>

      </KeyboardAwareScrollView>

      <Modal
        visible={showEmojiPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center p-4">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm items-center">
            <Text className="text-lg font-bold text-stone-800 mb-2">アイコンを変更</Text>
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

            <View className="w-full mb-6">
              <Text className="text-xs text-stone-400 mb-2 text-center">その他 (手入力)</Text>
              <TextInput
                value={customEmoji}
                onChangeText={setCustomEmoji}
                className="w-full p-3 bg-stone-50 rounded-xl text-center font-bold text-xl border border-stone-200"
                placeholder="好きな絵文字を入力"
                maxLength={2}
              />
            </View>

            <View className="flex-row w-full space-x-3">
              <TouchableOpacity
                onPress={() => setShowEmojiPicker(false)}
                className="flex-1 bg-stone-200 p-3 rounded-xl items-center"
              >
                <Text className="font-bold text-stone-600">キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  updateProfileIcon(customEmoji || '😊');
                  setShowEmojiPicker(false);
                }}
                className="flex-1 bg-[#8f7161] p-3 rounded-xl items-center"
              >
                <Text className="font-bold text-white">保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
