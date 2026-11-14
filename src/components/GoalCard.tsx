import React from 'react';
import { View, Text, Image, TouchableOpacity, Alert } from 'react-native';
import { Ticket, ChevronLeft, ChevronRight, Plus, MoreHorizontal } from 'lucide-react-native';
import { Reward } from '../types';
import { THEME_PALETTES } from '../constants/theme';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

interface GoalCardProps {
  goal: Reward;
  currentPoints: number;
  currency: string;
  index: number;
  totalGoals: number;
  onExchange: (goal: Reward) => void;
  onNext?: () => void;
  onPrev?: () => void;
  onAdd?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  themeColor?: string;
}

export default function GoalCard({ goal, currentPoints, currency, index, totalGoals, onExchange, onNext, onPrev, onAdd, onEdit, onDelete, themeColor = '#8f7161' }: GoalCardProps) {
  const { t } = useTranslation();
  // Theme Logic
  const palette = THEME_PALETTES[themeColor];

  // Default Colors (Mocha)
  let cardBg = 'white';
  let borderColor = '#f5f5f4'; // border-stone-100
  let borderWidth = 1;
  let progressBg = '#f5f5f4'; // stone-100
  let progressFill = '#8f7161'; // Mocha brown
  let buttonBg = '#8f7161';
  let buttonText = 'white';
  let percentageColor = '#8f7161';
  let textBadgeBg = '#8f7161';

  // Apply Palette
  if (palette && palette.goal) {
    cardBg = palette.goal.cardBg;
    borderColor = palette.goal.border;
    borderWidth = borderColor === 'transparent' ? 0 : 1;
    progressBg = palette.goal.progressBg;
    progressFill = palette.goal.progressFill;
    buttonBg = palette.goal.buttonBg;
    buttonText = palette.goal.buttonText;
    percentageColor = palette.goal.progressFill; // Keeping consistent with fill
    percentageColor = palette.goal.progressFill; // Keeping consistent with fill
    textBadgeBg = palette.goal.textBadgeBg || '#8f7161';
  }

  const progressSectionBg = (palette && palette.goal && palette.goal.progressSectionBg) ? palette.goal.progressSectionBg : undefined;
  const noNameShadow = (palette && palette.goal && palette.goal.noNameShadow) ? true : false;

  // Determine emoji background: use palette logic if available, otherwise default
  const emojiBg = (palette && palette.goal && palette.goal.emojiBg) ? palette.goal.emojiBg : '#ffdac1';
  const hasImage = !!(goal.image && (goal.image.startsWith('http') || goal.image.startsWith('file')));
  const adaptiveTextColor = hasImage ? 'white' : (palette?.goal?.textColor || palette?.incomplete?.text || '#8f7161');

  const progress = Math.min(100, (currentPoints / goal.cost) * 100);
  const isAchieved = currentPoints >= goal.cost;

  // Motivation Message Logic
  let motivationMsg = t('goalCard.motivations.default');
  if (progress >= 100) motivationMsg = t('goalCard.motivations.perfect');
  else if (progress >= 90) motivationMsg = t('goalCard.motivations.p90');
  else if (progress >= 80) motivationMsg = t('goalCard.motivations.p80');
  else if (progress >= 70) motivationMsg = t('goalCard.motivations.p70');
  else if (progress >= 60) motivationMsg = t('goalCard.motivations.p60');
  else if (progress >= 50) motivationMsg = t('goalCard.motivations.p50');
  else if (progress >= 40) motivationMsg = t('goalCard.motivations.p40');
  else if (progress >= 30) motivationMsg = t('goalCard.motivations.p30');
  else if (progress >= 20) motivationMsg = t('goalCard.motivations.p20');
  else if (progress >= 10) motivationMsg = t('goalCard.motivations.p10');
  else motivationMsg = t('goalCard.motivations.start');

  // Shimmer Animation
  const translateX = useSharedValue(-100);

  React.useEffect(() => {
    translateX.value = withRepeat(
      withTiming(100, { duration: 2000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${translateX.value}%` }],
    opacity: 0.5,
  }));

  const handleMorePress = () => {
    if (!onEdit && !onDelete) return;

    Alert.alert(
      t('goalCard.actionSelect'),
      "",
      [
        { text: t('common.cancel'), style: "cancel" as const },
        ...(onEdit ? [{ text: t('common.edit'), onPress: onEdit }] : []),
        ...(onDelete ? [{ text: t('common.delete'), style: "destructive" as const, onPress: onDelete }] : [])
      ]
    );
  };

  return (
    <View
      className="mx-4 rounded-3xl shadow-sm overflow-hidden"
      style={{
        backgroundColor: cardBg,
        borderColor: borderColor,
        borderWidth: borderWidth
      }}
    >
      <View className="h-48 relative">
        {goal.image && (goal.image.startsWith('http') || goal.image.startsWith('file')) ? (
          <Image
            source={{ uri: goal.image }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full items-center justify-center" style={{ backgroundColor: emojiBg }}>
            <Text className="text-[80px]">{goal.image || '🎁'}</Text>
          </View>
        )}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleMorePress}
          className="absolute width-full height-full inset-0 z-10"
          style={{ width: '100%', height: '100%' }}
        />

        {/* Overlay */}
        {(goal.image && (goal.image.startsWith('http') || goal.image.startsWith('file'))) && (
          <View pointerEvents="none" className="absolute inset-0 bg-black/20 z-0" />
        )}

        <View className="absolute bottom-4 left-4 right-4 z-20" pointerEvents="box-none">
          <View className="flex-row items-center justify-between mb-1" pointerEvents="box-none">
            <View className="flex-row items-center space-x-2">
              <Text
                className="text-xs font-bold px-2 py-0.5 rounded-full overflow-hidden"
                style={{ backgroundColor: textBadgeBg, opacity: 0.9, color: 'white' }}
              >
                GOAL {index + 1}/{totalGoals}
              </Text>
            </View>

            {/* Navigation Arrows */}
            <View className="flex-row items-center space-x-1">
              <TouchableOpacity
                onPress={onPrev}
                disabled={index === 0}
                className={`p-1 rounded-full ${index === 0 ? 'opacity-30' : 'bg-black/20'}`}
              >
                <ChevronLeft size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={index === totalGoals - 1 ? onAdd : onNext}
                disabled={index === totalGoals - 1 && !onAdd}
                className={`p-1 rounded-full bg-black/20`}
              >
                {index === totalGoals - 1 ? (
                  <Plus size={20} color="white" />
                ) : (
                  <ChevronRight size={20} color="white" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Title and message are not touchable, so they should transparently pass clicks to the z-10 layer if logic holds. 
              However, Text components in RN capture touches by default. 
              To be safe, we wrap them in a View that ignores touches or just acknowledge that tapping 'on the text' might strictly not work 
              unless we make the text itself trigger the action. 
              Let's make sure pointerEvents="none" is NOT on the text because we might want copy/paste? 
              Actually, for this use case, making them "none" is fine to ensure the card tap works. 
          */}
          <View pointerEvents="none">
            <Text className={`text-2xl font-black ${noNameShadow ? '' : 'shadow-sm'}`} numberOfLines={1} style={{ color: adaptiveTextColor }}>{goal.name}</Text>
            <View className="flex-row items-center mt-2 justify-between">
              <View className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">
                <Text className="font-bold text-sm" style={{ color: adaptiveTextColor }}>
                  {t('goalCard.remaining', { currency, amount: (Math.max(0, goal.cost - currentPoints)).toLocaleString() })}
                </Text>
              </View>
              <Text className="font-bold text-xs text-shadow" style={{ color: adaptiveTextColor }}>{motivationMsg}</Text>
            </View>
          </View>
        </View>
      </View>

      <View className="p-4" style={{ backgroundColor: progressSectionBg }}>
        <View className="flex-row justify-between items-end mb-2">
          <Text className="text-stone-500 font-bold text-xs">{t('goalCard.progress')}</Text>
          <Text className="font-bold text-lg" style={{ color: percentageColor }}>
            {Math.floor(progress)}%
          </Text>
        </View>
        <View className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: progressBg }}>
          <View
            className="h-full rounded-full"
            style={{ width: `${progress}%`, backgroundColor: progressFill }}
          >
            <Animated.View
              className="absolute inset-0 bg-white/30 w-full h-full"
              style={animatedStyle}
            />
          </View>
        </View>

        {isAchieved && (
          <TouchableOpacity
            className="mt-4 py-3 rounded-xl flex-row items-center justify-center"
            style={{ backgroundColor: buttonBg }}
            onPress={() => onExchange(goal)}
          >
            <Ticket color={buttonText} size={20} className="mr-2" />
            <Text className="font-bold ml-2" style={{ color: buttonText }}>{t('goalCard.exchangeTicket')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
