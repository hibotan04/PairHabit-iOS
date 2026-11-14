import React, { useState, useEffect, useRef } from 'react';
import { View, Text, SafeAreaView, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Image, Alert, Clipboard, ActivityIndicator } from 'react-native';
import { Send, MessageCircle, Copy, UserPlus } from 'lucide-react-native';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { User } from '../types';
import { THEME_PALETTES } from '../constants/theme';
import { useTranslation } from 'react-i18next';

interface ChatScreenProps {
  coupleId: string;
  userUid: string;
  partnerData: User | null;
  themeColor?: string;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
}

export default function ChatScreen({ coupleId, userUid, partnerData, themeColor = '#8f7161' }: ChatScreenProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Invitation State
  const [joinId, setJoinId] = useState('');
  const [loading, setLoading] = useState(false);

  const dynamicTheme = THEME_PALETTES[themeColor];
  const screenBg = dynamicTheme?.global?.bg || '#fff9fb';
  const headerBg = dynamicTheme?.header?.bg || 'white';
  const headerText = dynamicTheme?.header?.text || '#8f7161';

  useEffect(() => {
    if (!coupleId) return;

    const q = query(
      collection(db, 'couples', coupleId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      setMessages(msgs);

      // Scroll to bottom on new message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => unsubscribe();
  }, [coupleId]);

  const handleSend = async () => {
    if (!inputText.trim() || !coupleId) return;

    const text = inputText.trim();
    setInputText('');

    try {
      await addDoc(collection(db, 'couples', coupleId, 'messages'), {
        text,
        senderId: userUid,
        createdAt: serverTimestamp(), // Use serverTimestamp for consistency
      });
    } catch (error) {
      console.error("Error sending message:", error);
      alert(t('chat.sendError'));
    }
  };

  const copyToClipboard = () => {
    Clipboard.setString(coupleId);
    Alert.alert(t('chat.copiedTitle'), t('chat.copiedMsg', { coupleId }));
  };

  const handleJoinCouple = async () => {
    if (!auth.currentUser || !joinId.trim()) return;

    Alert.alert(
      t('chat.joinTitle'),
      t('chat.joinConfirm'),
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
                Alert.alert(t('common.error'), t('chat.notFoundError'));
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
              Alert.alert(t('chat.joinSuccess'), t('chat.joinSuccessMsg'));

            } catch (e) {
              console.error(e);
              Alert.alert(t('common.error'), t('chat.joinError'));
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.senderId === userUid;
    const isSameSender = index > 0 && messages[index - 1].senderId === item.senderId;

    // Format time
    let timeString = '';
    if (item.createdAt) {
      const date = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
      timeString = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    }

    return (
      <View className={`flex-row mb-2 ${isMe ? 'justify-end' : 'justify-start'} px-4`}>
        {/* Icon Removed as requested */}

        <View className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
          <View
            className={`px-4 py-2 rounded-2xl ${isMe
              ? 'rounded-tr-sm'
              : 'rounded-tl-sm shadow-sm'
              }`}
            style={isMe
              ? { backgroundColor: dynamicTheme?.chat?.bubbleBg || '#8f7161' }
              : { backgroundColor: dynamicTheme?.chat?.receivedBubbleBg || 'white' }
            }
          >
            <Text
              className={`text-base ${isMe ? '' : ''}`}
              style={isMe
                ? { color: dynamicTheme?.chat?.bubbleText || 'white' }
                : { color: dynamicTheme?.chat?.receivedBubbleText || '#292524' }
              }
            >
              {item.text}
            </Text>
          </View>
          <Text className="text-[10px] text-stone-400 mt-1 px-1">
            {timeString}
          </Text>
        </View>
      </View>
    );
  };

  // If no partner, show invitation screen
  if (!partnerData) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: screenBg }}>
        <View className="flex-1 p-6 justify-center items-center">
          <View className="w-24 h-24 bg-stone-200 rounded-full items-center justify-center mb-6">
            <UserPlus size={48} color="#a8a29e" />
          </View>
          <Text className="text-xl font-bold text-stone-800 mb-2">{t('chat.inviteTitle')}</Text>
          <Text className="text-stone-500 text-center mb-8 leading-6">
            {t('chat.inviteSubtitle')}
          </Text>

          <View className="w-full bg-white rounded-3xl p-6 shadow-sm border border-stone-100 mb-6">
            <Text className="text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider text-center">{t('chat.yourCode')}</Text>
            <View className="flex-row justify-center items-center space-x-3 mb-4">
              <View className="bg-stone-100 px-6 py-3 rounded-xl">
                <Text className="font-mono font-bold text-2xl text-stone-800 tracking-widest">{coupleId}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={copyToClipboard}
              className="flex-row items-center justify-center space-x-2 bg-[#8f7161] py-3 rounded-xl"
            >
              <Copy size={16} color="white" />
              <Text className="text-white font-bold">{t('common.copy')}</Text>
            </TouchableOpacity>
          </View>

          <View className="w-full bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
            <Text className="text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider text-center">{t('chat.partnerCodePrompt')}</Text>
            <View className="flex-row items-center space-x-2 bg-stone-50 p-2 rounded-xl border border-stone-200 mb-4">
              <TextInput
                className="flex-1 font-bold text-stone-800 text-center tracking-widest text-lg p-2"
                placeholder={t('chat.partnerCodePlaceholder')}
                placeholderTextColor="#a8a29e"
                value={joinId}
                onChangeText={setJoinId}
                autoCapitalize="characters"
                maxLength={6}
              />
            </View>
            <TouchableOpacity
              onPress={handleJoinCouple}
              disabled={loading || !joinId}
              className={`w-full py-3 rounded-xl items-center ${!joinId ? 'bg-stone-300' : 'bg-[#8f7161]'}`}
            >
              {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold">{t('chat.joinButton')}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: headerBg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f4', backgroundColor: headerBg }}>
        <View className="flex-row items-center">
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: dynamicTheme?.header?.iconBg || '#f5f5f4' }}
          >
            <Text className="text-2xl">{partnerData?.icon || '😊'}</Text>
          </View>
          <View className="ml-3">
            <Text className="text-lg font-bold" style={{ color: headerText }}>{partnerData?.name || t('chat.partnerDefault')}</Text>
          </View>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingVertical: 16 }}
        style={{ flex: 1, backgroundColor: screenBg }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View
          className="p-4 border-t border-stone-100 flex-row items-center"
          style={{ backgroundColor: dynamicTheme?.chat?.inputAreaBg || 'white' }}
        >
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('chat.messagePlaceholder')}
            placeholderTextColor={dynamicTheme?.chat?.inputText ? `${dynamicTheme.chat.inputText}80` : '#a8a29e'}
            className="flex-1 rounded-full px-4 py-3 mr-2 max-h-24"
            style={{
              backgroundColor: dynamicTheme?.chat?.inputBg || '#f5f5f4',
              color: dynamicTheme?.chat?.inputText || '#292524'
            }}
            multiline
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim()}
            className={`w-10 h-10 rounded-full items-center justify-center`}
            style={{
              backgroundColor: dynamicTheme?.chat?.sendBtnBg || '#8f7161',
            }}
          >
            <Send size={20} color={dynamicTheme?.chat?.sendBtnIcon || 'white'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
