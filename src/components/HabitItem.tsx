import React from 'react';
import { View, Text, TouchableOpacity, GestureResponderEvent } from 'react-native';
import { Habit } from '../types';
import { THEME_PALETTES } from '../constants/theme';
import { Check, Edit3, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

interface HabitItemProps {
  habit: Habit; // My habit (or partner's if viewing single partner habit)
  isCompleted: boolean;
  currency: string;
  onToggle: (event: GestureResponderEvent) => void;
  onEdit?: () => void;
  isMine: boolean;
  ownerIcon?: string;
  themeColor?: string;

  // Couple Mode Props
  partnerHabit?: Habit;
  isPartnerCompleted?: boolean;
  isCoupleHabit?: boolean;
  partnerIcon?: string;
}

export default function HabitItem({
  habit,
  isCompleted,
  currency,
  onToggle,
  onEdit,
  isMine,
  ownerIcon,
  themeColor = '#8f7161',
  partnerHabit,
  isPartnerCompleted = false,
  isCoupleHabit = false,
  partnerIcon
}: HabitItemProps) {
  const { t } = useTranslation();
  // Check for custom palette
  const palette = THEME_PALETTES[themeColor];

  // Logic for completion counts
  const myStatus = isCompleted;
  const partnerStatus = isPartnerCompleted;
  // If user only passes partner habit (not joined), isMine=false.
  // In that case, 'isCompleted' refers to PARTNER's completion (passed from parent).
  // But 'myStatus' usually implies 'Me'.
  // Let's rely on props:
  // If isCoupleHabit=false and isMine=false: Single card for partner. 'isCompleted' is their status.

  const completionCount = (isCoupleHabit)
    ? (myStatus ? 1 : 0) + (partnerStatus ? 1 : 0)
    : (isCompleted ? 1 : 0);

  const isBothCompleted = completionCount === 2;
  const isOneCompleted = completionCount === 1;

  // Default values
  let containerBg = '#ede0d8';
  let titleTextColor = '#8f7161';
  let badgeTextColor = '#8f7161';
  let badgeBgColor = 'white';
  let iconCircleBg = 'white';

  let checkboxBg = '#ffffff';
  let checkIconColor = '#ede0d8';
  let editIconColor = '#8f7161';

  // Apply Palette
  if (palette) {
    if (isCoupleHabit) {
      // --- COUPLE MODE ---
      if (isBothCompleted) {
        // Level 2: Fully Completed (Both)
        containerBg = palette.completed.bg;
        titleTextColor = palette.completed.text;
        badgeTextColor = palette.completed.text;
        badgeBgColor = 'rgba(255,255,255,0.3)';
        iconCircleBg = palette.completed.badgeBg;
        checkboxBg = palette.completed.checkboxBg;
        checkIconColor = palette.completed.checkmark;
        editIconColor = palette.completed.text;
      } else if (isOneCompleted) {
        // Level 1: One Person Completed (Light Theme Color)
        // Use custom intermediate colors based on theme request
        // Mocha (#8f7161) -> Lighter brown/beige
        // Sakuramochi (#f0bfb1) -> Lighter pink?
        // We use hardcoded logic or derive from palette to handle "Light Theme Color"
        // Current incomplete.bg is already quite light. We try to find a distinction.

        if (themeColor === '#f0bfb1') {
          containerBg = '#f0bfb1';
        } else {
          containerBg = '#d7ccc4';
        }

        // Text should be white to match Statistics style
        titleTextColor = 'white';
        badgeTextColor = 'white';
        badgeBgColor = 'rgba(255,255,255,0.3)';
        iconCircleBg = 'rgba(255,255,255,0.3)';
        // Checkbox/Icons
        checkboxBg = 'rgba(255,255,255,0.2)'; // or keep white? Let's use semi-transparent to blend or white
        checkIconColor = 'white'; // Icon itself
        editIconColor = 'white';
      } else {
        // Level 0: None
        containerBg = palette.incomplete.bg;
        titleTextColor = palette.incomplete.text;
        badgeTextColor = palette.incomplete.text;
        badgeBgColor = 'rgba(255,255,255,0.5)';
        iconCircleBg = palette.incomplete.badgeBg;
        checkboxBg = palette.incomplete.checkboxBg;
        checkIconColor = palette.incomplete.checkboxIcon;
        editIconColor = palette.incomplete.text;
      }
    } else {
      // --- SINGLE MODE ---
      if (isCompleted) {
        containerBg = palette.completed.bg;
        titleTextColor = palette.completed.text;
        badgeTextColor = palette.completed.text;
        badgeBgColor = 'rgba(255,255,255,0.3)';
        iconCircleBg = palette.completed.badgeBg;
        checkboxBg = palette.completed.checkboxBg;
        checkIconColor = palette.completed.checkmark;
        editIconColor = palette.completed.text;
      } else {
        containerBg = palette.incomplete.bg;
        titleTextColor = palette.incomplete.text;
        badgeTextColor = palette.incomplete.text;
        badgeBgColor = 'rgba(255,255,255,0.5)';
        iconCircleBg = palette.incomplete.badgeBg;
        checkboxBg = palette.incomplete.checkboxBg;
        checkIconColor = palette.incomplete.checkboxIcon;
        editIconColor = palette.incomplete.text;
      }
    }
  }

  return (
    <View
      className={`mx-4 mb-3 p-4 rounded-3xl shadow-sm flex-row items-center justify-between`}
      style={{ backgroundColor: containerBg }}
    >
      <View className="flex-row items-center flex-1">
        {/* Emoji & Avatar Indicators */}
        <View className="relative mr-4 items-center">
          <View
            className={`w-12 h-12 rounded-full items-center justify-center mb-1`}
            style={{ backgroundColor: iconCircleBg }}
          >
            <Text className="text-2xl">{habit.emoji}</Text>
          </View>

          {/* Couple Indicators */}
          {isCoupleHabit ? (
            <View className="flex-row items-center -space-x-1 mt-1">
              {/* My Indicator */}
              <View className={`w-5 h-5 rounded-full items-center justify-center border-2 border-white ${isCompleted ? 'opacity-100' : 'opacity-40 grayscale'}`} style={{ backgroundColor: isCompleted ? themeColor : '#e5e5e5', zIndex: 2 }}>
                <Text style={{ fontSize: 10 }}>{ownerIcon || '😊'}</Text>
                {isCompleted && (
                  <View className="absolute bottom-[-2px] right-[-2px] bg-white rounded-full p-[1px]">
                    <Check size={8} color={themeColor} strokeWidth={4} />
                  </View>
                )}
              </View>
              {/* Partner Indicator */}
              <View className={`w-5 h-5 rounded-full items-center justify-center border-2 border-white ${partnerStatus ? 'opacity-100' : 'opacity-40 grayscale'}`} style={{ backgroundColor: partnerStatus ? themeColor : '#e5e5e5', zIndex: 1 }}>
                <Text style={{ fontSize: 10 }}>{partnerIcon || '😊'}</Text>
                {partnerStatus && (
                  <View className="absolute bottom-[-2px] right-[-2px] bg-white rounded-full p-[1px]">
                    <Check size={8} color={themeColor} strokeWidth={4} />
                  </View>
                )}
              </View>
            </View>
          ) : (
            // Single Indicator (only show if it matches viewing logic)
            // Typically we show the owner's icon if it's not mine? 
            // Or if it's mine, we don't show icon usually?
            // Original logic: "ownerIcon && ..."
            ownerIcon && (
              <View
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full items-center justify-center z-10`}
                style={{ backgroundColor: '#fdfbf7' }}
              >
                <Text className="text-[10px]">{ownerIcon}</Text>
              </View>
            )
          )}
        </View>

        <View className="flex-1">
          <Text className={`font-bold text-lg`} style={{ color: titleTextColor }} numberOfLines={1}>{habit.name}</Text>
          <View
            className={`self-start px-2 py-0.5 rounded-full mt-1`}
            style={{ backgroundColor: badgeBgColor }}
          >
            <Text className={`text-xs font-bold`} style={{ color: badgeTextColor }}>
              {(isCoupleHabit ? isBothCompleted : isCompleted) ? t('habitItem.completed') : ''} +{currency}{habit.value}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row items-center">
        {isMine && onEdit && (
          <TouchableOpacity
            onPress={onEdit}
            className="p-2 mr-2"
          >
            <Edit3 size={20} color={editIconColor} />
          </TouchableOpacity>
        )}

        {/* Checkbox: Logic depends on ownership */}
        {isMine ? (
          <TouchableOpacity
            onPress={(e) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onToggle(e);
            }}
            activeOpacity={0.8}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                backgroundColor: checkboxBg,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {isCompleted ? (
                <Check size={24} color={checkIconColor} style={{ zIndex: 10 }} />
              ) : (
                <Plus size={24} color={checkIconColor} style={{ zIndex: 10 }} />
              )}
            </View>
          </TouchableOpacity>
        ) : (
          // Partner's Habit (Not joined)
          <TouchableOpacity
            onPress={onToggle}
            className="opacity-70"
          >
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              backgroundColor: isCompleted ? (themeColor === '#f0bfb1' ? '#f0bfb1' : '#d7ccc4') : checkboxBg, // Show completion color if done
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {/* If partner completed, show Check. Else show "Join" Plus Icon */}
              {isCompleted ? (
                <Check size={24} color="white" />
              ) : (
                <Plus size={24} color={checkIconColor} />
              )}
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
