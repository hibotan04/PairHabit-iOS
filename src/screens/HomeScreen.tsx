import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Image, GestureResponderEvent, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Habit, Reward, TimelineItem, User } from '../types';
import { THEME_PALETTES } from '../constants/theme';
import GoalCard from '../components/GoalCard';
import HabitItem from '../components/HabitItem';
import FlyingHeartsOverlay, { FlyingHeartsOverlayRef } from '../components/FlyingHeartsOverlay';
import { Plus, ChevronLeft, ChevronRight, Share2, UserPlus } from 'lucide-react-native';
import { db } from '../../firebaseConfig';
import { doc, updateDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';
import Animated, { LinearTransition, FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSequence, withDelay } from 'react-native-reanimated';

interface HomeScreenProps {
  habits: Habit[];
  goals: Reward[];
  totalPoints: number;
  currency: string;
  onToggleHabit: (habitId: string, targetDate?: string) => void;
  userUid?: string;
  coupleId: string;
  userData: User | null;
  partnerData: User | null;
}

import CalendarModal from '../components/CalendarModal';
import { WidgetService } from '../services/WidgetService';
import { useTranslation } from 'react-i18next';

export default function HomeScreen({
  habits,
  goals,
  totalPoints,
  currency,
  onToggleHabit,
  userUid,
  coupleId,
  userData,
  partnerData
}: HomeScreenProps) {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const heartsRef = useRef<FlyingHeartsOverlayRef>(null);

  const themeColor = userData?.themeColor || '#8f7161';
  const isPro = userData?.isPro || false;

  // Widget Updates
  React.useEffect(() => {
    const updateWidget = async () => {
      // 1. Prepare Habit Data
      const widgetHabits = habits
        .filter(h => h.ownerId === userUid) // Filter: My habits only
        .slice(0, 5)
        .map(h => {
          const history = [];
          const today = new Date();
          const year = today.getFullYear();
          const month = today.getMonth();
          const daysInMonth = new Date(year, month + 1, 0).getDate();

          for (let day = 1; day <= daysInMonth; day++) {
            const d = new Date(year, month, day);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const record = h.history?.[dateStr];
            const isCompleted = typeof record === 'string' ? record === 'completed' : record?.status === 'completed';
            history.push(isCompleted);
          }

          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          const record = h.history?.[todayStr];
          const isCompletedToday = typeof record === 'string' ? record === 'completed' : record?.status === 'completed';

          const palette = ['#A388E6', '#6CB3FF', '#74C991', '#E78C89', '#F4D265'];
          const color = palette[habits.indexOf(h) % palette.length];

          return {
            id: h.id,
            name: h.name,
            emoji: h.emoji,
            completedToday: isCompletedToday,
            color: color,
            amount: h.value || 0,
            history: history
          };
        });

      // 2. Prepare Goal Data
      const activeGoal = goals
        .filter(g => g.status === 'active' || !g.status)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];

      let widgetGoal;
      if (activeGoal) {
        const legacyConsumed = goals
          .filter(g => g.status === 'redeemed' || g.status === 'ticket')
          .reduce((sum, g) => sum + g.cost, 0);

        const availablePoints = totalPoints - legacyConsumed;

        widgetGoal = {
          label: activeGoal.name,
          current: Math.floor(Math.min(availablePoints, activeGoal.cost)),
          target: Math.floor(activeGoal.cost)
        };
      }

      // 3. Update
      await WidgetService.updateWidgetData({
        themeColor,
        currency,
        habits: widgetHabits,
        goal: widgetGoal,
        weekStartDay: userData?.weekStartDay ?? 0
      });
    };

    updateWidget();
  }, [habits, goals, totalPoints, themeColor]);


  // Date State
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [showCalendar, setShowCalendar] = React.useState(false);

  // Reset date to today on focus
  useFocusEffect(
    React.useCallback(() => {
      setSelectedDate(new Date());
    }, [])
  );

  const handlePrevDate = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDate = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const getDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const targetDateStr = getDateString(selectedDate);
  const isToday = getDateString(new Date()) === targetDateStr;

  // Filter active goals
  const activeGoals = goals
    .filter(g => g.status === 'active' || !g.status)
    .sort((a, b) => {
      const getTime = (d: any) => {
        if (!d) return 0;
        if (d instanceof Date) return d.getTime();
        if (typeof d === 'object' && d.toDate) return d.toDate().getTime();
        return new Date(d).getTime();
      };
      const tA = getTime(a.createdAt);
      const tB = getTime(b.createdAt);
      return tA - tB;
    });

  const tickets = goals.filter(g => g.status === 'ticket');

  const [currentGoalIndex, setCurrentGoalIndex] = React.useState(0);
  const safeIndex = Math.min(Math.max(0, currentGoalIndex), Math.max(0, activeGoals.length - 1));
  const currentGoal = activeGoals.length > 0 ? activeGoals[safeIndex] : null;

  const consumedPoints = goals
    .filter(g => g.status === 'ticket' || g.status === 'redeemed')
    .reduce((sum, g) => sum + g.cost, 0);

  let previousGoalsCost = 0;
  for (let i = 0; i < safeIndex; i++) {
    previousGoalsCost += activeGoals[i].cost;
  }
  const availablePoints = Math.max(0, totalPoints - consumedPoints - previousGoalsCost);

  // --- HABIT GROUPING LOGIC ---
  const groupedHabits = React.useMemo(() => {
    const groups: Record<string, { mine?: Habit, partner?: Habit }> = {};

    habits.forEach(h => {
      const key = h.name.trim(); // Match by name
      if (!groups[key]) groups[key] = {};

      if (h.ownerId === userUid) {
        groups[key].mine = h;
      } else {
        groups[key].partner = h; // If partner has multiples of same name, this might overwrite, but usually unique names per user
      }
    });

    console.log("Debug: Grouping Logic Run", {
      totalHabits: habits.length,
      groupsFound: Object.keys(groups).length,
      userUid
    });

    return Object.values(groups).map(g => {
      const main = g.mine || g.partner!;
      const isCoupleHabit = !!(g.mine && g.partner);

      // Function to check completion for a habit
      const checkCompleted = (habit?: Habit) => {
        if (!habit) return false;
        const record = habit.history?.[targetDateStr];
        return typeof record === 'string' ? record === 'completed' : record?.status === 'completed';
      };

      const isMineCompleted = checkCompleted(g.mine);
      const isPartnerCompleted = checkCompleted(g.partner);

      return {
        ...main, // Base props (id, name, emoji etc) taken from mine or partner
        id: g.mine?.id || g.partner?.id, // ID preference: Mine
        displayHabit: g.mine || g.partner!, // The habit object to pass to HabitItem as primary
        partnerHabit: g.partner,
        isCoupleHabit,
        isMineCompleted,
        isPartnerCompleted,
        // Sorting helpers
        isMine: !!g.mine,
        isAnyCompleted: isMineCompleted || isPartnerCompleted,
        isAllCompleted: isCoupleHabit ? (isMineCompleted && isPartnerCompleted) : (isMineCompleted || isPartnerCompleted) // simplified
      };
    }).sort((a, b) => {
      // Sort Logic: Uncompleted first
      // If we are "incomplete", show first.
      // Def of incomplete for user: I haven't done it. 
      // User likely wants to see things *they* need to do.

      // If I have it and haven't done it -> Priority 1
      // If I don't have it (partner only) -> Priority 2 (Prompt to join)
      // If I have done it -> Priority 3

      const getPriority = (item: any) => {
        if (!item.isMine) return 2; // Partner only
        if (!item.isMineCompleted) return 1; // My task todo
        return 3; // Done
      };

      const pA = getPriority(a);
      const pB = getPriority(b);

      if (pA !== pB) return pA - pB;

      return 0;
    });
  }, [habits, userUid, targetDateStr]);


  const handleJoinHabit = (partnerHabit: Habit) => {
    Alert.alert(
      t('home.joinHabit'),
      t('home.joinHabitConfirm', { name: partnerHabit.name }),
      [
        { text: t('common.cancel'), style: "cancel" },
        {
          text: t('common.join'),
          onPress: async () => {
            if (!coupleId || !userUid) return;
            try {
              await addDoc(collection(db, 'couples', coupleId, 'habits'), {
                name: partnerHabit.name,
                emoji: partnerHabit.emoji,
                value: partnerHabit.value,
                ownerId: userUid,
                createdAt: new Date().toISOString(),
                history: {}
              });
              Alert.alert(t('home.joinedHabit'), t('home.joinedHabitMsg'));
            } catch (e) {
              console.error("Error joining habit:", e);
              Alert.alert(t('common.error'), t('home.joinError'));
            }
          }
        }
      ]
    );
  };

  const handleSortToggle = (habitId: string, isMine: boolean) => {
    // Wrapper to direct to correct handler
    if (isMine) {
      // Toggle completion
      if (isToday) {
        // Only show hearts if toggling to complete today
        // We need to check current status, but here we just pass ID.
        // Helper in render logic handles heart trigger, let's keep it simple here.
        onToggleHabit(habitId, targetDateStr);
      } else {
        onToggleHabit(habitId, targetDateStr);
      }
    } else {
      // Join flow
      const target = habits.find(h => h.id === habitId);
      if (target) handleJoinHabit(target);
    }
  };

  const handleExchangeTicket = async (goal: Reward) => {
    Alert.alert(
      t('home.exchangeTicket'),
      t('home.exchangeTicketConfirm', { name: goal.name }),
      [
        { text: t('common.cancel'), style: "cancel" },
        {
          text: t('home.exchangeTicket'),
          onPress: async () => {
            try {
              const goalRef = doc(db, 'couples', coupleId, 'goals', goal.id);

              const now = new Date();
              let availableAt = now.toISOString();
              if (goal.requiredDays && goal.requiredDays > 0) {
                const futureDate = new Date(now);
                futureDate.setDate(futureDate.getDate() + goal.requiredDays);
                availableAt = futureDate.toISOString();
              }

              await updateDoc(goalRef, {
                status: 'ticket',
                exchangedAt: now.toISOString(),
                availableAt: availableAt
              });
              Alert.alert(t('home.exchangeComplete'), t('home.exchangeCompleteMsg'));
            } catch (e) {
              console.error("Error exchanging ticket:", e);
              Alert.alert(t('common.error'), t('home.exchangeError'));
            }
          }
        }
      ]
    );
  };

  const handleInvitePartner = async () => {
    try {
      await Share.share({
        message: t('home.inviteMessage', { coupleId }),
      });
    } catch (error) {
      console.error(error);
    }
  };

  const dynamicTheme = THEME_PALETTES[themeColor];
  const screenBg = dynamicTheme?.global?.bg || '#fff9fb';
  const headerBg = dynamicTheme?.header?.bg || 'white';
  const headerText = dynamicTheme?.header?.text || '#8f7161';

  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 300, easing: Easing.linear }),
        withTiming(1, { duration: 300, easing: Easing.linear }),
        withTiming(0.6, { duration: 300, easing: Easing.linear }),
        withTiming(1, { duration: 300, easing: Easing.linear }),
        withTiming(1, { duration: 3000 })
      ),
      -1,
      false
    );
  }, []);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: headerBg }} edges={['top']}>
      <ScrollView
        style={{ flex: 1, backgroundColor: screenBg }}
        stickyHeaderIndices={[0]}
      >
        <View style={{ paddingHorizontal: 24, paddingBottom: 16, paddingTop: 16, backgroundColor: headerBg, borderBottomWidth: 1, borderBottomColor: '#f5f5f4', flexDirection: 'row', alignItems: 'center', position: 'relative' }}>
          <View>
            <Text className="text-xs font-bold tracking-wider mb-1" style={{ color: headerText }}>{t('home.totalScore')}</Text>
            <View className="flex-row items-end">
              <Text className="text-xl font-bold mr-1" style={{ color: headerText }}>{currency}</Text>
              <Text className="text-3xl font-black tracking-tight" style={{ color: headerText }}>{totalPoints.toLocaleString()}</Text>
            </View>
          </View>

          {!partnerData && (
            <Animated.View style={[animatedButtonStyle, { position: 'absolute', right: 24, top: 12 }]}>
              <TouchableOpacity
                onPress={handleInvitePartner}
                className="flex-row items-center px-5 py-3 rounded-full active:opacity-90"
                style={{ backgroundColor: themeColor === '#f0bfb1' ? '#d47d76' : '#8f7161' }}
              >
                <UserPlus size={20} color="white" />
                <Text className="ml-2 text-sm font-bold text-white">{t('home.inviteButton')}</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        <View className="py-4">
          {/* Goal Card */}
          {currentGoal ? (
            <View>
              <GoalCard
                goal={currentGoal}
                currentPoints={availablePoints}
                currency={currency}
                index={safeIndex}
                totalGoals={activeGoals.length}
                onExchange={handleExchangeTicket}
                onNext={() => setCurrentGoalIndex(prev => Math.min(activeGoals.length - 1, prev + 1))}
                onPrev={() => setCurrentGoalIndex(prev => Math.max(0, prev - 1))}
                onAdd={() => navigation.navigate('AddReward', { themeColor, coupleId, isPro })}
                onEdit={() => navigation.navigate('AddReward', { themeColor, coupleId, isPro, rewardToEdit: currentGoal })}
                onDelete={() => {
                  Alert.alert(
                    t('home.deleteReward'),
                    t('home.deleteRewardConfirm'),
                    [
                      { text: t('common.cancel'), style: "cancel" },
                      {
                        text: t('common.delete'),
                        style: "destructive",
                        onPress: async () => {
                          try {
                            await deleteDoc(doc(db, 'couples', coupleId, 'goals', currentGoal.id));
                            setCurrentGoalIndex(prev => Math.max(0, prev - 1));
                          } catch (e) {
                            console.error("Error deleting goal:", e);
                            Alert.alert(t('common.error'), t('home.deleteError'));
                          }
                        }
                      }
                    ]
                  );
                }}
                themeColor={themeColor}
              />
              <View className="mb-2" />
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => navigation.navigate('AddReward', { themeColor, coupleId, isPro })}
              className="mx-4 p-8 rounded-3xl items-center justify-center border-2 border-dashed border-stone-200 active:opacity-70 bg-white/50"
            >
              {goals.length > 0 ? (
                <View className="items-center">
                  <Text className="text-3xl mb-2">🎉</Text>
                  <Text className="font-bold text-center text-lg mb-1 text-stone-500">{t('home.allGoalsAchieved')}</Text>
                  <Text className="font-bold text-center text-sm opacity-80 text-stone-400">{t('home.allGoalsAchievedSub')}</Text>
                </View>
              ) : (
                <View className="items-center">
                  <Plus color="#d6d3d1" size={32} />
                  <Text className="font-bold mt-2 text-stone-300">{t('home.setReward')}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Date Header */}
          <View className="flex-row items-center justify-center py-4 space-x-8">
            <TouchableOpacity onPress={handlePrevDate} className="p-2">
              <ChevronLeft size={24} color={(themeColor === '#f0bfb1' || themeColor === '#ffe6e7') ? '#d47d76' : themeColor} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCalendar(true)} className="items-center">
              <Text className="font-bold text-lg" style={{ color: (themeColor === '#f0bfb1' || themeColor === '#ffe6e7') ? '#d47d76' : themeColor }}>
                {selectedDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNextDate} className="p-2">
              <ChevronRight size={24} color={(themeColor === '#f0bfb1' || themeColor === '#ffe6e7') ? '#d47d76' : themeColor} />
            </TouchableOpacity>
          </View>

          <CalendarModal
            visible={showCalendar}
            onClose={() => setShowCalendar(false)}
            onSelectDate={setSelectedDate}
            selectedDate={selectedDate}
          />

          {/* Habit List */}
          <View className="pb-20">
            {groupedHabits.map(item => {
              // item is the composite object we created in groupedHabits
              // ownerIcon calculation
              // If it's single, owner is owner.
              // If couple, we usually don't show ownerIcon on top, but we pass it for single indicator fallback.
              // The logic inside HabitItem uses ownerIcon if singleton.

              const ownerIcon = item.isMine ? (userData?.icon || '😊') : (partnerData?.icon || '😊');
              const partnerIcon = partnerData?.icon || '😊';

              return (
                <Animated.View
                  key={item.id} // use the resolved ID
                  layout={LinearTransition.duration(200)}
                  entering={FadeIn}
                  exiting={FadeOut}
                >
                  <HabitItem
                    habit={item.displayHabit}
                    isCompleted={item.isMineCompleted}
                    currency={currency}
                    onToggle={(event) => {
                      if (item.isMine) {
                        // My habit toggling
                        if (!item.isMineCompleted && isToday) {
                          const { pageX, pageY } = event.nativeEvent;
                          heartsRef.current?.addHeart(pageX, pageY);
                        }
                        onToggleHabit(item.displayHabit.id, targetDateStr);
                      } else {
                        // Partner habit join
                        handleJoinHabit(item.displayHabit);
                      }
                    }}
                    isMine={item.isMine}
                    ownerIcon={ownerIcon}
                    themeColor={themeColor}

                    // Couple Prop Passing
                    partnerHabit={item.partnerHabit}
                    isPartnerCompleted={item.isPartnerCompleted}
                    isCoupleHabit={item.isCoupleHabit}
                    partnerIcon={partnerIcon}

                    onEdit={() => {
                      if (!item.isMine && !item.isCoupleHabit) {
                        // Partner only, can't edit
                        Alert.alert(t('home.cannotOperate'), t('home.cannotEditPartnerHabit'));
                        return;
                      }
                      // If couple habit, we edit MY habit (which is item.displayHabit since isMine=true)
                      navigation.navigate('AddHabit', { coupleId, habit: item.displayHabit, themeColor });
                    }}
                  />
                </Animated.View>
              );
            })}

            <TouchableOpacity
              onPress={() => navigation.navigate('AddHabit', { coupleId, themeColor })}
              className="mx-4 mt-4 p-4 bg-white rounded-2xl border border-dashed border-stone-300 items-center flex-row justify-center active:bg-stone-50"
            >
              <Plus color="#a8a29e" size={20} className="mr-2" />
              <Text className="text-stone-500 font-bold">{t('home.addHabit')}</Text>
            </TouchableOpacity>

            {groupedHabits.length === 0 && (
              <View className="items-center py-8">
              </View>
            )}
          </View>

        </View>
      </ScrollView>
      <FlyingHeartsOverlay ref={heartsRef} />
    </SafeAreaView>
  );
}
