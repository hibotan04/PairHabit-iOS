import React from 'react';
import { View, Text, SafeAreaView, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { Ticket, Lock as LockIcon, MoreHorizontal } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { THEME_PALETTES } from '../constants/theme';
import { Habit, Reward } from '../types';
import { db } from '../../firebaseConfig';
import { doc, deleteDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { TAB_ROUTES } from '../navigation/routes';

interface TicketScreenProps {
  goals: Reward[];
  habits: Habit[];
  themeColor: string;
  coupleId: string;
  userData: any;
  navigation: any;
  currency: string;
  totalPoints: number;
}

export default function TicketScreen({ goals, habits, themeColor, coupleId, userData, navigation, currency, totalPoints }: TicketScreenProps) {
  // const navigation = useNavigation<any>(); (Removed)
  const { t } = useTranslation();
  const isPro = userData?.isPro || false;

  const dynamicTheme = THEME_PALETTES[themeColor];
  const screenBg = dynamicTheme?.global?.bg || '#fff9fb';
  const headerBg = dynamicTheme?.header?.bg || 'white';
  const headerText = dynamicTheme?.header?.text || '#8f7161';
  const memoriesTitleColor = dynamicTheme?.memories?.title || '#ad9f97';
  const memoriesCardTitleColor = dynamicTheme?.memories?.cardTitle || '#292524';

  const tickets = goals.filter(g => g.status === 'ticket');

  // Waterfall Logic for Active Goals
  const rawActiveGoals = goals
    .filter(g => g.status === 'active' || !g.status)
    .sort((a, b) => (new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()));

  const consumedPoints = goals
    .filter(g => g.status === 'redeemed' || g.status === 'ticket')
    .reduce((sum, g) => sum + g.cost, 0);

  let remainingPoints = Math.max(0, totalPoints - consumedPoints);

  const activeGoalsWithProgress = rawActiveGoals.map(g => {
    const availableForThis = Math.max(0, remainingPoints);
    const pointsAllocated = Math.min(g.cost, availableForThis);
    const percent = Math.min(100, Math.round((pointsAllocated / g.cost) * 100));

    // Deduct this goal's cost from the pool for subsequent goals
    remainingPoints -= g.cost;

    return {
      ...g,
      percent,
      pointsAllocated
    };
  });

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: headerBg }}>
      {/* Header */}
      <View style={{ backgroundColor: headerBg, borderBottomWidth: 1, borderBottomColor: '#f5f5f4', paddingBottom: 16 }}>
        <View className="items-center py-2">
          <Text className="text-lg font-bold" style={{ color: headerText }}>{t('ticket.title')}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: screenBg, padding: 24 }}>
        {/* TICKETS SECTION */}
        <View className="mb-8">
          <Text className="text-lg font-bold mb-4" style={{ color: memoriesCardTitleColor }}>{t('ticket.ownedTickets')}</Text>
          {tickets.length === 0 ? (
            <View className="items-center justify-center py-10 bg-white rounded-3xl border border-stone-100 p-6">
              <View className="w-12 h-12 bg-stone-100 rounded-full items-center justify-center mb-3">
                <Ticket size={24} color="#a8a29e" />
              </View>
              <Text className="text-stone-500 text-center font-bold mb-4">
                {t('ticket.noTickets')}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate(TAB_ROUTES.home)}
                className="px-6 py-3 rounded-full"
                style={{ backgroundColor: themeColor }}
              >
                <Text className="text-white font-bold text-sm">{t('ticket.earnPoints')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="flex-row flex-wrap">
              {tickets.map(ticket => {
                // Advanced Rules Check
                let isLocked = false;
                let lockReason = '';
                let currentRate = 0;

                if (ticket.conditions) {
                  const { days, rate } = ticket.conditions;
                  const now = new Date();
                  let completedCount = 0;
                  let totalCount = 0;

                  for (let i = 0; i < days; i++) {
                    const d = new Date(now);
                    d.setDate(d.getDate() - i);
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${day}`;

                    habits.forEach(habit => {
                      totalCount++;
                      const record = habit.history?.[dateStr];
                      const isCompleted = typeof record === 'string' ? record === 'completed' : record?.status === 'completed';
                      if (isCompleted) completedCount++;
                    });
                  }

                  currentRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                  if (currentRate < rate) {
                    isLocked = true;
                    lockReason = t('ticket.requiredCondition', { days, rate });
                  }
                } else if (ticket.availableAt && new Date() < new Date(ticket.availableAt)) {
                  isLocked = true;
                  const unlockDate = new Date(ticket.availableAt);
                  const diffDays = Math.ceil((unlockDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  lockReason = t('ticket.lockedTime', { days: diffDays });
                }

                return (
                  <TouchableOpacity
                    key={ticket.id}
                    onPress={() => {
                      if (isLocked) {
                        Alert.alert(t('ticket.locked'), ticket.conditions
                          ? t('ticket.lockedCondition', { condition: lockReason, rate: currentRate })
                          : t('ticket.lockedUntil', { days: lockReason })
                        );
                        return;
                      }
                      navigation.navigate('Redeem', {
                        ticket,
                        coupleId,
                        themeColor,
                        isPro,
                        // currentPhotoCount passed if needed
                      });
                    }}
                    className="mb-4 mr-0 w-[48%] bg-white rounded-2xl shadow-sm overflow-hidden border border-stone-100"
                    style={{ marginRight: tickets.indexOf(ticket) % 2 === 0 ? '4%' : 0 }}
                  >
                    <View className="h-28 w-full relative bg-[#efeae8] items-center justify-center">
                      {(ticket.image || ticket.imageUrl)?.startsWith('http') || (ticket.image || ticket.imageUrl)?.startsWith('file') ? (
                        <Image source={{ uri: ticket.image || ticket.imageUrl }} className="w-full h-full" resizeMode="cover" />
                      ) : (
                        <Text className="text-4xl">{ticket.image || ticket.imageUrl || '🎫'}</Text>
                      )}

                      {/* Ticket Badge */}
                      <View className="absolute top-0 right-0 px-2 py-1 rounded-bl-lg" style={{ backgroundColor: themeColor }}>
                        <Text className="text-[10px] text-white font-bold">TICKET</Text>
                      </View>

                      {/* Lock Overlay (Covers EVERYTHING in Image Container) */}
                      {isLocked && (
                        <View className="absolute top-0 left-0 right-0 bottom-0 w-full h-full bg-black/70 items-center justify-center p-2 z-20">
                          <LockIcon color="white" size={24} />
                          <Text className="text-white text-xs font-bold mt-2 text-center">
                            {ticket.conditions ? (
                              <>
                                {lockReason}{'\n'}
                                <Text className="text-amber-400">{t('ticket.currentRate', { rate: currentRate })}</Text>
                              </>
                            ) : lockReason}
                          </Text>
                        </View>
                      )}

                    </View>

                    <View className="p-3">
                      <Text className="font-bold text-sm" style={{ color: memoriesCardTitleColor }} numberOfLines={1}>{ticket.name}</Text>
                      <Text className="text-[10px] text-stone-400 mt-1">{t('ticket.tapToUse')}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ACTIVE GOALS SECTION */}
        <View className="mb-20">
          <Text className="text-lg font-bold mb-4" style={{ color: memoriesCardTitleColor }}>{t('ticket.activeGoals')}</Text>

          <View className="relative">
            {/* Vertical Line */}{activeGoalsWithProgress.length > 0 && <View className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-stone-200" />}

            {activeGoalsWithProgress.map((goal, index) => (
              <View key={goal.id} className="flex-row items-stretch mb-4">
                {/* Timeline Marker */}
                <View className="mr-4 items-center pt-6 z-10">
                  <View className="w-10 h-10 rounded-full bg-stone-100 items-center justify-center border-2 border-white shadow-sm">
                    <Text className="font-bold text-stone-500 text-xs">{index + 1}</Text>
                  </View>
                </View>

                {/* Card */}
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => {
                    Alert.alert(
                      t('ticket.actionSelect'),
                      "",
                      [
                        { text: t('common.cancel'), style: "cancel" },
                        { text: t('common.edit'), onPress: () => navigation.navigate('AddReward', { themeColor, coupleId, isPro, rewardToEdit: goal }) },
                        {
                          text: t('common.delete'),
                          style: "destructive",
                          onPress: () => {
                            Alert.alert(
                              t('ticket.confirm'),
                              t('ticket.confirmDelete'),
                              [
                                { text: t('common.cancel'), style: "cancel" },
                                {
                                  text: t('common.delete'),
                                  style: "destructive",
                                  onPress: async () => {
                                    try {
                                      await deleteDoc(doc(db, 'couples', coupleId, 'goals', goal.id));
                                    } catch (e) {
                                      console.error("Error deleting goal:", e);
                                      Alert.alert(t('common.error'), t('ticket.deleteError'));
                                    }
                                  }
                                }
                              ]
                            );
                          }
                        }
                      ]
                    );
                  }}
                  className="flex-1 bg-white rounded-3xl p-5 shadow-sm border border-stone-100 flex-row items-center relative overflow-hidden"
                >
                  {/* Background Decoration */}
                  <View className="absolute right-0 top-0 w-24 h-24 rounded-bl-full opacity-10" style={{ backgroundColor: themeColor }} />

                  <View className="w-16 h-16 bg-stone-50 rounded-2xl items-center justify-center mr-4 shadow-sm">
                    {(goal.image || goal.imageUrl)?.startsWith('http') || (goal.image || goal.imageUrl)?.startsWith('file') ? (
                      <Image source={{ uri: goal.image || goal.imageUrl }} className="w-full h-full rounded-2xl" resizeMode="cover" />
                    ) : (
                      <Text className="text-3xl">{goal.image || goal.imageUrl || '🎁'}</Text>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-stone-800 text-lg mb-1 mr-2" numberOfLines={1}>{goal.name}</Text>
                    <View className="flex-row items-end justify-between mb-1">
                      <Text className="text-sm font-bold" style={{ color: memoriesCardTitleColor }}>
                        {t('ticket.remaining', { currency, amount: (Math.max(0, goal.cost - goal.pointsAllocated)).toLocaleString() })}
                      </Text>
                      <Text className="text-xs font-bold text-stone-400">
                        {goal.percent}%
                      </Text>
                    </View>
                    <View className="h-2 bg-stone-100 rounded-full w-full overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${goal.percent}%`,
                          backgroundColor: themeColor
                        }}
                      />
                    </View>
                  </View>
                  <View className="ml-2">
                    <Ticket size={20} color={themeColor} />
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('AddReward', { themeColor, coupleId, isPro })}
            className="mt-2 p-4 bg-white rounded-2xl items-center justify-center border border-dashed border-stone-300 active:bg-stone-50"
          >
            <Text className="text-stone-400 font-bold">{t('ticket.addReward')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView >
  );
}
