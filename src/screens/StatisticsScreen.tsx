import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Animated, Easing, InteractionManager, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Habit, User as AppUser } from '../types';
import { useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { ChevronLeft, ChevronRight, Activity, Edit2, X, Check, Bell } from 'lucide-react-native';
import { db } from '../../firebaseConfig';
import { doc, updateDoc, deleteField, setDoc } from 'firebase/firestore';
import { THEME_PALETTES } from '../constants/theme';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

interface StatisticsScreenProps {
  habits: Habit[];
  userUid?: string;
  coupleId: string;
  userData: AppUser | null;
  partnerData: AppUser | null;
}

type ViewMode = 'week' | 'month' | 'year';

export default function StatisticsScreen({ habits, userUid, coupleId, userData, partnerData }: StatisticsScreenProps) {
  const { t } = useTranslation();
  const weekDayLabels = t('statistics.jpDays', { returnObjects: true }) as string[];
  const [statsDate, setStatsDate] = useState(new Date());

  // Default to Sunday (0) if not set
  const startDay = userData?.weekStartDay || 0;
  const themeColor = userData?.themeColor || '#8f7161';
  const dynamicTheme = THEME_PALETTES[themeColor];
  const screenBg = dynamicTheme?.global?.bg || '#fff9fb';


  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [optimisticMode, setOptimisticMode] = useState<ViewMode>('month');

  const handleModeChange = (mode: ViewMode) => {
    setOptimisticMode(mode);
    InteractionManager.runAfterInteractions(() => {
      setViewMode(mode);
    });
  };

  const navigation = useNavigation<any>();
  const [editDate, setEditDate] = useState(new Date()); // Edit Modal Date State
  const [selectedHabitForEdit, setSelectedHabitForEdit] = useState<Habit | null>(null);

  // Helper: Grouping Logic (Same as Home)
  const groupedHabits = React.useMemo(() => {
    const groups: Record<string, { mine?: Habit, partner?: Habit }> = {};

    habits.forEach(h => {
      const key = h.name.trim();
      if (!groups[key]) groups[key] = {};
      if (h.ownerId === userUid) groups[key].mine = h;
      else groups[key].partner = h;
    });

    return Object.values(groups).map(g => {
      const main = g.mine || g.partner!;
      const isCoupleHabit = !!(g.mine && g.partner);

      return {
        id: g.mine?.id || g.partner?.id,
        name: main.name,
        emoji: main.emoji,
        mine: g.mine,
        partner: g.partner,
        isCoupleHabit,
        // For non-couple habits, determine type
        type: isCoupleHabit ? 'shared' : (g.mine ? 'mine' : 'partner')
      };
    });
  }, [habits, userUid]);

  // View State for Shared Habits: Map<habitName, 'mine' | 'partner' | 'both'>
  // Default to 'both'
  const [sharedViewMode, setSharedViewMode] = useState<Record<string, 'mine' | 'partner' | 'both'>>({});

  const toggleSharedView = (habitName: string, target: 'mine' | 'partner') => {
    setSharedViewMode(prev => {
      const current = prev[habitName] || 'both';

      let nextState: 'mine' | 'partner' | 'both' = current;

      if (current === 'both') {
        // Both are ON.
        if (target === 'mine') nextState = 'partner'; // Click mine -> mine off -> partner
        else nextState = 'mine'; // Click partner -> partner off -> mine
      } else if (current === 'mine') {
        // Mine is ON.
        if (target === 'mine') return prev; // Keep at least one on
        else nextState = 'both'; // Click partner -> partner on -> both
      } else { // 'partner'
        // Partner is ON.
        if (target === 'mine') nextState = 'both'; // Click mine -> mine on -> both
        else return prev; // Keep at least one on
      }

      return { ...prev, [habitName]: nextState };
    });
  };

  const getActiveHabitForStats = (groupItem: any) => {
    if (groupItem.type === 'mine') return groupItem.mine;
    if (groupItem.type === 'partner') return groupItem.partner;

    // Shared
    const mode = sharedViewMode[groupItem.name] || 'mine';
    return mode === 'mine' ? groupItem.mine : groupItem.partner;
  };


  const year = statsDate.getFullYear();
  const month = statsDate.getMonth();

  const handlePrev = () => {
    const newDate = new Date(statsDate);
    if (optimisticMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (optimisticMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setFullYear(newDate.getFullYear() - 1);
    }
    setStatsDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(statsDate);
    if (optimisticMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (optimisticMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setFullYear(newDate.getFullYear() + 1);
    }
    setStatsDate(newDate);
  };

  const getHeaderTitle = () => {
    if (optimisticMode === 'week') {
      const day = statsDate.getDay();
      const diff = (day - startDay + 7) % 7;
      const startOfWeek = new Date(statsDate);
      startOfWeek.setDate(statsDate.getDate() - diff);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${startOfWeek.getMonth() + 1}/${startOfWeek.getDate()} - ${endOfWeek.getMonth() + 1}/${endOfWeek.getDate()}`;
    } else if (optimisticMode === 'month') {
      return t('statistics.monthFormat', { year, month: month + 1 });
    } else {
      return t('statistics.yearFormat', { year });
    }
  };

  const handleToggleHistory = async (habit: Habit, dateStr: string) => {
    if (!coupleId || !userUid) {
      Alert.alert(t('common.error'), t('statistics.errorMsg'));
      return;
    }
    if (habit.ownerId !== userUid) {
      Alert.alert(t('statistics.cannotOperate'), t('statistics.cannotChangePartnerRecord'));
      return;
    }

    const habitRef = doc(db, 'couples', coupleId, 'habits', habit.id);
    const currentRecord = habit.history?.[dateStr];
    const isCompleted = typeof currentRecord === 'string' ? currentRecord === 'completed' : currentRecord?.status === 'completed';

    try {
      if (isCompleted) {
        await updateDoc(habitRef, {
          [`history.${dateStr}`]: deleteField()
        });
      } else {
        await setDoc(habitRef, {
          history: {
            [dateStr]: {
              status: 'completed',
              by: userUid,
              timestamp: new Date().toISOString()
            }
          }
        }, { merge: true });
      }
    } catch (e) {
      console.error("Error toggling history:", e);
    }
  };

  const confirmToggle = (habit: Habit, dateStr: string) => {
    // Check permission first
    if (habit.ownerId !== userUid) {
      Alert.alert(t('statistics.cannotOperate'), t('statistics.cannotChangePartnerRecord'));
      return;
    }

    const date = new Date(dateStr);
    const formattedDate = `${date.getMonth() + 1}/${date.getDate()} (${weekDayLabels[date.getDay()]})`;

    // Check current status
    const currentRecord = habit.history?.[dateStr];
    const isCompleted = typeof currentRecord === 'string' ? currentRecord === 'completed' : currentRecord?.status === 'completed';

    const actionText = isCompleted ? t('statistics.markIncomplete') : t('statistics.markComplete');
    const confirmButtonText = isCompleted ? t('statistics.setIncomplete') : t('statistics.setComplete');

    Alert.alert(
      t('statistics.changeStatus'),
      `${formattedDate}\n「${habit.name}」\n\n${actionText}`,
      [
        { text: t('common.cancel'), style: "cancel" },
        { text: confirmButtonText, onPress: () => handleToggleHistory(habit, dateStr) }
      ]
    );
  };

  // Render Cell Logic (Unified)
  const renderCell = (dateStr: string, dayDisplay: number, groupItem: any, isModal: boolean, currentMode: 'week' | 'month' | 'year') => {
    let bgClass = '#f5f5f4'; // default incomplete
    let textColor = '#d6d3d1';

    const viewModeForHabit = sharedViewMode[groupItem.name] || 'both'; // Default 'both' for shared
    const activeHabit = getActiveHabitForStats(groupItem); // Fallback for single view

    // Determine Color Logic
    const isCouple = groupItem.isCoupleHabit;

    if (isCouple && viewModeForHabit === 'both') {
      // Both View: 3-stage color
      const mineRecord = groupItem.mine?.history?.[dateStr];
      const isMineCompleted = typeof mineRecord === 'string' ? mineRecord === 'completed' : mineRecord?.status === 'completed';

      const partnerRecord = groupItem.partner?.history?.[dateStr];
      const isPartnerCompleted = typeof partnerRecord === 'string' ? partnerRecord === 'completed' : partnerRecord?.status === 'completed';

      const count = (isMineCompleted ? 1 : 0) + (isPartnerCompleted ? 1 : 0);

      if (count === 2) {
        bgClass = dynamicTheme?.completed?.bg || '#ad9f97'; // Dark/Completed
        textColor = 'white';
      } else if (count === 1) {
        // Light Theme Color
        bgClass = (themeColor === '#f0bfb1') ? '#f0bfb1' : '#d7ccc4';
        textColor = 'white';
      }
    } else {
      // Single View (Mine or Partner or Not Couple or Shared but in single mode)
      let targetHabit = activeHabit;
      if (isCouple) {
        // Explicitly choose based on mode if not 'both'
        if (viewModeForHabit === 'mine') targetHabit = groupItem.mine;
        if (viewModeForHabit === 'partner') targetHabit = groupItem.partner;
      }

      const isCompleted = targetHabit ? (
        typeof targetHabit.history?.[dateStr] === 'string'
          ? targetHabit.history?.[dateStr] === 'completed'
          : targetHabit.history?.[dateStr]?.status === 'completed'
      ) : false;

      if (isCompleted) {
        bgClass = dynamicTheme?.completed?.bg || '#ad9f97';
        textColor = 'white';
      }
    }


    // Determine if checkmark should show (Only if 'completed' in single mode, or strictly both in both mode? or just color?)
    const todayStr = new Date().toISOString().split('T')[0];
    const isTodayCell = dateStr === todayStr;

    const cellContent = (
      <View style={{
        width: currentMode === 'year' ? 10 : '100%',
        height: currentMode === 'year' ? 10 : '100%',
        borderRadius: currentMode === 'year' ? 2 : 4,
        backgroundColor: bgClass,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: isTodayCell ? 2 : (currentMode === 'year' ? 0 : 1), // Thicker border for Today
        borderColor: isTodayCell ? `${themeColor}66` : '#f5f5f4' // Theme color for Today (lighter/thinner)
      }}>
        {isModal && <Text style={{ fontSize: 10, color: textColor, fontWeight: 'bold' }}>{dayDisplay}</Text>}
      </View>
    );

    if (isModal) {
      // Modal (Edit Mode) - Only allow tap if I OWN the active habit
      const canEdit = activeHabit?.ownerId === userUid;
      return (
        <TouchableOpacity
          key={dateStr}
          onPress={() => handleToggleHistory(activeHabit, dateStr)}
          style={{ width: '14.28%', aspectRatio: 1, padding: 1.5 }}
        >
          {cellContent}
        </TouchableOpacity>
      )
    }

    if (currentMode === 'year') {
      // Heatmap cell - distinct styling
      return (
        <View key={dateStr} style={{ margin: 1 }}>
          {cellContent}
        </View>
      )
    }

    return (
      <View key={dateStr} style={{ width: '14.28%', aspectRatio: 1, padding: 1.5 }}>
        {cellContent}
      </View>
    );
  };

  const renderCalendarGrid = (groupItem: any, isModal: boolean = false, optionalMode?: ViewMode) => {
    const targetDate = isModal ? editDate : statsDate;
    const currentMode = isModal ? 'month' : (optionalMode || viewMode);
    const cells = [];

    if (currentMode === 'week') {
      const day = targetDate.getDay();
      const diff = (day - startDay + 7) % 7;
      const startOfWeek = new Date(targetDate);
      startOfWeek.setDate(targetDate.getDate() - diff);

      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        cells.push(renderCell(dateStr, d.getDate(), groupItem, isModal, 'week'));
      }
    } else if (currentMode === 'month') {
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth();
      const targetFirstDay = new Date(targetYear, targetMonth, 1).getDay();
      const targetDaysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

      const emptySlots = (targetFirstDay - startDay + 7) % 7;

      for (let i = 0; i < emptySlots; i++) {
        cells.push(<View key={`empty-${i}`} style={{ width: '14.28%', aspectRatio: 1 }} />);
      }
      for (let d = 1; d <= targetDaysInMonth; d++) {
        const dateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        cells.push(renderCell(dateStr, d, groupItem, isModal, 'month'));
      }
    }
    return cells;
  };

  // Categorize for UI
  const sharedHabits = groupedHabits.filter(g => g.type === 'shared');
  const myOnlyHabits = groupedHabits.filter(g => g.type === 'mine');
  const partnerOnlyHabits = groupedHabits.filter(g => g.type === 'partner');

  // Stats Counters
  // We calculate "Met" based on displayed user (activeHabit)
  const calculateStats = (groupItem: any) => {
    // Calculate based on ViewMode
    // But summary stats at bottom usually refer to 'Current Week' or 'Current Month'
    // Let's stick to 'Current Week' for top-level stats? Or match viewMode?
    // Defaulting to Week for the stats table
    // ...

    // Let's simplified: We only show heatmap for habits.
    // The "Total Met" at bottom of screen is agg over ALL habits correctly.
    return { met: 0, bestStreak: 0, totalDone: 0 }; // Placeholder if needed
  };

  const renderUnifiedWeekSection = () => {
    const allItems = [
      ...sharedHabits,
      ...myOnlyHabits,
      ...partnerOnlyHabits
    ];

    if (allItems.length === 0) return null;

    const day = statsDate.getDay();
    const diff = (day - startDay + 7) % 7;
    const startOfWeek = new Date(statsDate);
    startOfWeek.setDate(statsDate.getDate() - diff);

    const baseHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const headers = [...baseHeaders.slice(startDay), ...baseHeaders.slice(0, startDay)];

    return (
      <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#f5f5f4' }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <View style={{ flex: 1 }} />
          <View style={{ width: 180, flexDirection: 'row', justifyContent: 'flex-end', gap: 2, marginRight: 12 }}>
            {headers.map((h, i) => (
              <Text key={i} style={{ width: 24, textAlign: 'center', fontSize: 10, fontWeight: 'bold', color: '#a8a29e' }}>{h[0]}</Text>
            ))}
          </View>
        </View>

        {allItems.map(item => {
          const activeHabit = getActiveHabitForStats(item);
          const currentModeForThis = sharedViewMode[item.name] || 'mine';
          const isMineType = item.type === 'mine';
          const isPartnerType = item.type === 'partner';
          const isSharedType = item.type === 'shared';

          // Badge Content for Personal Habits
          const ownerIcon = isMineType ? (userData?.icon || '😊') : isPartnerType ? (partnerData?.icon || '😊') : null;

          return (
            <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 40, marginBottom: 12 }}>
              {/* Name & Indicators */}
              <View style={{ flex: 1, paddingRight: 8, flexDirection: 'row', alignItems: 'center' }}>
                {/* Emoji with Badge */}
                <View style={{ marginRight: 8, position: 'relative' }}>
                  <View style={{ width: 32, height: 32, backgroundColor: '#f5f5f4', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 16 }}>{item.emoji}</Text>
                  </View>
                  {/* Owner Badge (Only for Mine/Partner) */}
                  {ownerIcon && (
                    <View style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f5f5f4' }}>
                      <Text style={{ fontSize: 8 }}>{ownerIcon}</Text>
                    </View>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#292524' }} numberOfLines={1}>{item.name}</Text>
                  {/* Shared Toggles Inline/Below */}
                  {isSharedType && (
                    <View style={{ flexDirection: 'row', marginTop: 2, gap: 4 }}>
                      <TouchableOpacity onPress={() => toggleSharedView(item.name, 'mine')} style={{ opacity: (sharedViewMode[item.name] || 'both') === 'mine' || (sharedViewMode[item.name] || 'both') === 'both' ? 1 : 0.3 }}>
                        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#e5e5e5', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 8 }}>{userData?.icon || '😊'}</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => toggleSharedView(item.name, 'partner')} style={{ opacity: (sharedViewMode[item.name] || 'both') === 'partner' || (sharedViewMode[item.name] || 'both') === 'both' ? 1 : 0.3 }}>
                        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#e5e5e5', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 8 }}>{partnerData?.icon || '😊'}</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* Week Grid */}
              <View style={{ width: 180, flexDirection: 'row', justifyContent: 'flex-end', gap: 2, marginRight: 12 }}>
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = new Date(startOfWeek);
                  d.setDate(startOfWeek.getDate() + i);
                  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

                  // We check ACTIVE habit for checkbox interaction
                  // Permission check is inside confirmToggle
                  // But here we display checkbox state based on ACTIVE
                  // Calculate completion status based on ViewMode
                  let bgApp = '#f5f5f4'; // Incomplete
                  const viewModeForHabit = sharedViewMode[item.name] || 'both';
                  const isCouple = item.isCoupleHabit;

                  if (isCouple && viewModeForHabit === 'both') {
                    // Both Mode Logic
                    const mineRecord = item.mine?.history?.[dateStr];
                    const isMineCompleted = typeof mineRecord === 'string' ? mineRecord === 'completed' : mineRecord?.status === 'completed';

                    const partnerRecord = item.partner?.history?.[dateStr];
                    const isPartnerCompleted = typeof partnerRecord === 'string' ? partnerRecord === 'completed' : partnerRecord?.status === 'completed';

                    const count = (isMineCompleted ? 1 : 0) + (isPartnerCompleted ? 1 : 0);

                    if (count === 2) {
                      bgApp = dynamicTheme?.completed?.bg || '#ad9f97'; // Dark
                    } else if (count === 1) {
                      bgApp = (themeColor === '#f0bfb1') ? '#f0bfb1' : '#d7ccc4'; // Light
                    }
                  } else {
                    // Single Mode Logic (Mine/Partner)
                    const record = activeHabit.history?.[dateStr];
                    const isCompleted = typeof record === 'string' ? record === 'completed' : record?.status === 'completed';
                    if (isCompleted) {
                      bgApp = dynamicTheme?.completed?.bg || '#ad9f97';
                    }
                  }

                  // Determine if checkmark should show (Only if 'completed' in single mode, or strictly both in both mode? or just color?)
                  // User request: "Light for 1, Dark for 2". Checkmark might be confusing if 1 is done but checkmark shows? 
                  // In Week view, small squares usually just show color. 
                  // Let's stick to color. Checkmark is only for "Fully Done" maybe?
                  // Existing code showed white dot if completed.
                  // Let's show white dot if "My" part is done? Or if "Target" is done?
                  // In 'Both' mode, maybe show dot if count >= 1? 
                  // Or let's just stick to color for the square background, and maybe a dot if *I* did it?
                  // For now, I will mimic the Month view logic: Color is the main indicator.
                  // I will remove the small white square indicator logic for 'Both' and rely on background.
                  // For Single mode, keep existing behavior.

                  return (
                    <View key={i} style={{ width: 24, alignItems: 'center', justifyContent: 'center' }}>
                      <TouchableOpacity
                        onPress={() => confirmToggle(activeHabit, dateStr)} // Action always defaults to Mine per previous fix
                        activeOpacity={0.7}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          backgroundColor: bgApp,
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {/* Optional: Add checks if needed, but color is primary */}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // Year & Month renderers would follow similar pattern using renderCalendarGrid
  // For brevity, I'll implement Month View Card style below, using new grouping

  const renderUnifiedMonthList = () => {
    const allItems = [
      ...sharedHabits,
      ...myOnlyHabits,
      ...partnerOnlyHabits
    ];

    if (allItems.length === 0) return null;

    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {allItems.map(groupItem => {
          const activeHabit = getActiveHabitForStats(groupItem);
          const isMine = groupItem.type === 'mine';
          const isPartner = groupItem.type === 'partner';
          const isShared = groupItem.type === 'shared';

          // Calculate Stats locally for display
          let completedCount = 0;
          let totalDays = 0;
          // const startDate = new Date(year, month, 1);
          const endDate = new Date(year, month + 1, 0);
          totalDays = endDate.getDate();

          for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const r = activeHabit.history?.[dateStr];
            if (typeof r === 'string' ? r === 'completed' : r?.status === 'completed') completedCount++;
          }
          const rate = totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0;

          // Avatar Badge logic
          const ownerIcon = isMine ? (userData?.icon || '😊') : isPartner ? (partnerData?.icon || '😊') : null;

          return (
            <View key={groupItem.id} style={{ backgroundColor: 'white', borderRadius: 24, padding: 16, marginBottom: 16, width: '48%', borderWidth: 1, borderColor: '#f5f5f4' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <View style={{ flex: 1, marginRight: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {/* Emoji with Badge */}
                    <View style={{ marginRight: 6, position: 'relative' }}>
                      <Text style={{ fontSize: 13 }}>{groupItem.emoji}</Text>
                      {ownerIcon && (
                        <View style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: 4, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f5f5f4' }}>
                          <Text style={{ fontSize: 5 }}>{ownerIcon}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#292524', flex: 1, lineHeight: 14 }} numberOfLines={2}>{groupItem.name}</Text>
                  </View>

                  {/* Shared Toggle */}
                  {isShared && (
                    <View style={{ flexDirection: 'row', marginTop: 6, gap: 4 }}>
                      <TouchableOpacity onPress={() => toggleSharedView(groupItem.name, 'mine')} style={{ opacity: (sharedViewMode[groupItem.name] || 'both') === 'mine' || (sharedViewMode[groupItem.name] || 'both') === 'both' ? 1 : 0.3 }}>
                        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#e5e5e5', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 8 }}>{userData?.icon || '😊'}</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => toggleSharedView(groupItem.name, 'partner')} style={{ opacity: (sharedViewMode[groupItem.name] || 'both') === 'partner' || (sharedViewMode[groupItem.name] || 'both') === 'both' ? 1 : 0.3 }}>
                        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#e5e5e5', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 8 }}>{partnerData?.icon || '😊'}</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Edit Button */}
                {(isMine || isShared) && (
                  <TouchableOpacity
                    onPress={() => {
                      const habitToEdit = groupItem.mine;
                      if (habitToEdit) {
                        setEditDate(new Date(statsDate));
                        setSelectedHabitForEdit(habitToEdit);
                      }
                    }}
                    style={{ marginTop: 2 }}
                  >
                    <Edit2 size={12} color="#d6d3d1" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Calendar Grid */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {renderCalendarGrid(groupItem, false, 'month')}
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#fafaf9' }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#a8a29e' }}>{rate}%</Text>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: themeColor }}>{t('statistics.timesCount', { count: completedCount })}</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderUnifiedYearList = () => {
    // 1. Prepare Year Data Structure (Weeks -> Days)
    const targetYear = statsDate.getFullYear();
    const startOfYear = new Date(targetYear, 0, 1);
    const endOfYear = new Date(targetYear, 11, 31);

    const startDayOfWeek = startOfYear.getDay(); // 0=Sun
    const diffStart = (startDayOfWeek - startDay + 7) % 7;
    const calendarStart = new Date(startOfYear);
    calendarStart.setDate(startOfYear.getDate() - diffStart);

    const weeks: Date[][] = [];
    let current = new Date(calendarStart);
    while (current <= endOfYear || weeks.length < 52) {
      const weekDays: Date[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(current);
        date.setDate(current.getDate() + d);
        weekDays.push(date);
      }
      weeks.push(weekDays);
      const nextWeek = new Date(current);
      nextWeek.setDate(current.getDate() + 7);
      current = nextWeek;
      if (weeks.length >= 53) break;
    }

    const allItems = [
      ...sharedHabits,
      ...myOnlyHabits,
      ...partnerOnlyHabits
    ];

    if (allItems.length === 0) return null;

    return (
      <View style={{ paddingBottom: 80 }}>
        {allItems.map(groupItem => {
          const activeHabit = getActiveHabitForStats(groupItem);
          const isMine = groupItem.type === 'mine';
          const isPartner = groupItem.type === 'partner';
          const isShared = groupItem.type === 'shared';
          const viewModeForHabit = sharedViewMode[groupItem.name] || 'both';
          const isCouple = groupItem.isCoupleHabit;

          // Avatar Badge logic
          const ownerIcon = isMine ? (userData?.icon || '😊') : isPartner ? (partnerData?.icon || '😊') : null;
          const habitNameColor = (themeColor === '#f0bfb1') ? '#d47d76' : '#57534e';

          // Calculate Stats
          let displayCount = 0;
          let displayTotal = 0;

          weeks.forEach(week => {
            week.forEach(date => {
              if (date.getFullYear() === targetYear) {
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                if (isCouple && viewModeForHabit === 'both') {
                  displayTotal += 2;
                  const m = groupItem.mine?.history?.[dateStr];
                  const p = groupItem.partner?.history?.[dateStr];
                  if ((typeof m === 'string' ? m === 'completed' : m?.status === 'completed')) displayCount++;
                  if ((typeof p === 'string' ? p === 'completed' : p?.status === 'completed')) displayCount++;
                } else {
                  displayTotal += 1;
                  const target = getActiveHabitForStats(groupItem);
                  const r = target?.history?.[dateStr];
                  if ((typeof r === 'string' ? r === 'completed' : r?.status === 'completed')) displayCount++;
                }
              }
            })
          });

          const rate = displayTotal > 0 ? Math.round((displayCount / displayTotal) * 100) : 0;

          return (
            <View key={groupItem.id} style={{ backgroundColor: 'white', borderRadius: 24, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#f5f5f4' }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <View style={{ flex: 1, marginRight: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {/* Emoji with Badge */}
                    <View style={{ marginRight: 12, position: 'relative' }}>
                      <View style={{ width: 40, height: 40, backgroundColor: '#f5f5f4', borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 20 }}>{groupItem.emoji}</Text>
                      </View>
                      {ownerIcon && (
                        <View style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f5f5f4' }}>
                          <Text style={{ fontSize: 8 }}>{ownerIcon}</Text>
                        </View>
                      )}
                    </View>
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: habitNameColor, marginBottom: 4 }}>{groupItem.name}</Text>

                      {/* Shared Toggle */}
                      {isShared && (
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          <TouchableOpacity onPress={() => toggleSharedView(groupItem.name, 'mine')} style={{ opacity: (sharedViewMode[groupItem.name] || 'both') === 'mine' || (sharedViewMode[groupItem.name] || 'both') === 'both' ? 1 : 0.3 }}>
                            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#e5e5e5', alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontSize: 10 }}>{userData?.icon || '😊'}</Text>
                            </View>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => toggleSharedView(groupItem.name, 'partner')} style={{ opacity: (sharedViewMode[groupItem.name] || 'both') === 'partner' || (sharedViewMode[groupItem.name] || 'both') === 'both' ? 1 : 0.3 }}>
                            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#e5e5e5', alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontSize: 10 }}>{partnerData?.icon || '😊'}</Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Stats Info */}
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Activity size={16} color={themeColor} style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 14, color: themeColor, fontWeight: 'bold' }}>{rate}%</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, color: themeColor, fontWeight: 'bold' }}>{t('statistics.timesCount', { count: displayCount })}</Text>
                  </View>
                </View>
              </View>

              {/* Heatmap Grid - Fully visible without scroll */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {weeks.map((week, idx) => (
                  <View key={idx} style={{ gap: 2 }}>
                    {week.map((date, dayIdx) => {
                      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                      const isTargetYear = date.getFullYear() === targetYear;

                      let bg = '#f5f5f4';
                      if (isCouple && viewModeForHabit === 'both') {
                        const m = groupItem.mine?.history?.[dateStr];
                        const p = groupItem.partner?.history?.[dateStr];
                        const im = typeof m === 'string' ? m === 'completed' : m?.status === 'completed';
                        const ip = typeof p === 'string' ? p === 'completed' : p?.status === 'completed';
                        const count = (im ? 1 : 0) + (ip ? 1 : 0);
                        if (count === 2) bg = dynamicTheme?.completed?.bg || '#ad9f97';
                        else if (count === 1) bg = (themeColor === '#f0bfb1' ? '#f0bfb1' : '#d7ccc4');
                      } else {
                        const target = getActiveHabitForStats(groupItem);
                        const r = target?.history?.[dateStr];
                        const done = typeof r === 'string' ? r === 'completed' : r?.status === 'completed';
                        if (done) bg = dynamicTheme?.completed?.bg || '#ad9f97';
                      }

                      return (
                        <View
                          key={dayIdx}
                          style={{
                            width: 4,
                            height: 4,
                            backgroundColor: bg,
                            borderRadius: 1,
                            opacity: isTargetYear ? 1 : 0.2
                          }}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    );
  };


  const headerBg = dynamicTheme?.header?.bg || 'white';
  const headerText = dynamicTheme?.header?.text || themeColor;
  const switcherBg = dynamicTheme ? 'rgba(255,255,255,0.3)' : '#f5f5f4';

  const activeSwitcherBg = dynamicTheme?.statistics?.activeSwitcherBg || 'white';
  const activeSwitcherText = dynamicTheme?.statistics?.activeSwitcherText || themeColor;
  const inactiveSwitcherText = dynamicTheme?.statistics?.inactiveSwitcherText || (dynamicTheme ? 'rgba(255,255,255,0.8)' : '#a8a29e');


  return (
    <SafeAreaView className="flex-1" edges={['top']} style={{ backgroundColor: headerBg }}>
      {/* Fixed Header */}
      <View className="pb-4" style={{ backgroundColor: headerBg, borderBottomWidth: 1, borderBottomColor: dynamicTheme ? 'transparent' : '#f5f5f4' }}>
        <View className="items-center py-2">
          <Text className="text-lg font-bold" style={{ color: headerText }}>{t('statistics.title')}</Text>
        </View>
        <View className="flex-row justify-center mt-2 mx-6 p-1 rounded-xl" style={{ backgroundColor: switcherBg }}>
          {(['week', 'month', 'year'] as const).map((modeId) => {
            const isSelected = optimisticMode === modeId;
            const label = modeId === 'week' ? t('statistics.week') : modeId === 'month' ? t('statistics.month') : t('statistics.year');
            return (
              <TouchableOpacity
                key={modeId}
                onPress={() => handleModeChange(modeId)}
                className={`flex-1 py-1.5 items-center rounded-lg`}
                style={{ backgroundColor: isSelected ? activeSwitcherBg : 'transparent', shadowOpacity: isSelected ? 0.1 : 0 }}
              >
                <Text className={`text-base font-bold`} style={{ color: isSelected ? activeSwitcherText : inactiveSwitcherText }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView className="flex-1 bg-bg-screen p-6">
        <View className="flex-row items-center justify-center pb-4 space-x-8">
          <TouchableOpacity onPress={handlePrev} className="p-2">
            <ChevronLeft size={24} color={(themeColor === '#f0bfb1' || themeColor === '#ffe6e7') ? '#d47d76' : themeColor} />
          </TouchableOpacity>
          <View className="items-center min-w-[120px]">
            <Text className="font-bold text-lg" style={{ color: (themeColor === '#f0bfb1' || themeColor === '#ffe6e7') ? '#d47d76' : themeColor }}>
              {getHeaderTitle()}
            </Text>
          </View>
          <TouchableOpacity onPress={handleNext} className="p-2">
            <ChevronRight size={24} color={(themeColor === '#f0bfb1' || themeColor === '#ffe6e7') ? '#d47d76' : themeColor} />
          </TouchableOpacity>
        </View>

        {viewMode === 'week' ? (
          <View>
            {renderUnifiedWeekSection()}
            <View style={{ height: 40 }} />
          </View>
        ) : viewMode === 'year' ? (
          renderUnifiedYearList()
        ) : (
          /* Month View */
          <View style={{ paddingBottom: 80 }}>
            {/* Total Stats Circle - Optional (keep simple for now) */}
            {renderUnifiedMonthList()}
          </View>
        )}
      </ScrollView>

      {/* Edit Modal (Calendar) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!selectedHabitForEdit}
        onRequestClose={() => setSelectedHabitForEdit(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          {/* Resolve the latest habit object from props using the ID stored in state */}
          {(() => {
            // Find the live habit object from props to ensure UI updates on change
            const liveHabit = selectedHabitForEdit ? habits.find(h => h.id === selectedHabitForEdit.id) : null;
            if (!liveHabit) return null;

            return (
              <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 24 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 24, marginRight: 8 }}>{liveHabit.emoji}</Text>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#57534e' }}>{liveHabit.name}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedHabitForEdit(null)}>
                    <View style={{ backgroundColor: '#f5f5f4', padding: 8, borderRadius: 20 }}>
                      <X size={20} color="#a8a29e" />
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
                  <TouchableOpacity onPress={() => {
                    const d = new Date(editDate);
                    d.setMonth(d.getMonth() - 1);
                    setEditDate(d);
                  }} style={{ padding: 8 }}>
                    <ChevronLeft size={24} color="#d6d3d1" />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#57534e', marginHorizontal: 16 }}>
                    {t('statistics.monthFormat', { year: editDate.getFullYear(), month: editDate.getMonth() + 1 })}
                  </Text>
                  <TouchableOpacity onPress={() => {
                    const d = new Date(editDate);
                    d.setMonth(d.getMonth() + 1);
                    setEditDate(d);
                  }} style={{ padding: 8 }}>
                    <ChevronRight size={24} color="#d6d3d1" />
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {renderCalendarGrid({ mine: liveHabit, type: 'mine', name: liveHabit.name, emoji: liveHabit.emoji }, true, 'month')}
                </View>

                <View style={{ marginTop: 24, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#a8a29e' }}>{t('statistics.tapDateHint')}</Text>
                </View>
              </View>
            );
          })()}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
