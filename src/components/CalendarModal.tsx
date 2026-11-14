import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
  weekStartDay?: number;
}

export default function CalendarModal({ visible, onClose, onSelectDate, selectedDate, weekStartDay = 0 }: CalendarModalProps) {
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

  useEffect(() => {
    if (visible) {
      setCurrentMonth(new Date(selectedDate));
    }
  }, [visible, selectedDate]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentMonth(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentMonth(newDate);
  };

  const handleSelectDay = (day: number) => {
    const newDate = new Date(currentMonth);
    newDate.setDate(day);
    onSelectDate(newDate);
    onClose();
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Adjust empty slots for weekStartDay
    const emptySlots = (firstDay - weekStartDay + 7) % 7;

    // Empty slots for days before the first day of the month
    for (let i = 0; i < emptySlots; i++) {
      days.push(<View key={`empty-${i}`} className="w-[14.28%] aspect-square" />);
    }

    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentMonth);
      date.setDate(i);
      const isSelected =
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear();

      const isToday =
        date.getDate() === new Date().getDate() &&
        date.getMonth() === new Date().getMonth() &&
        date.getFullYear() === new Date().getFullYear();

      days.push(
        <TouchableOpacity
          key={i}
          onPress={() => handleSelectDay(i)}
          className="w-[14.28%] aspect-square items-center justify-center"
        >
          <View className={`w-9 h-9 items-center justify-center rounded-full ${isSelected ? 'bg-[#8f7161]' : ''}`}>
            <Text className={`font-bold text-center ${isSelected ? 'text-white' : isToday ? 'text-[#8f7161]' : 'text-stone-700'}`}>
              {i}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    return days;
  };

  const baseWeekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const weekDays = [...baseWeekDays.slice(weekStartDay), ...baseWeekDays.slice(0, weekStartDay)];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/50 justify-center items-center p-6">
          <TouchableWithoutFeedback>
            <View className="bg-white w-full rounded-3xl p-6 shadow-xl">
              {/* Header */}
              <View className="flex-row justify-between items-center mb-6">
                <TouchableOpacity onPress={handlePrevMonth} className="p-2">
                  <ChevronLeft size={24} color="#8f7161" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-stone-800">
                  {t('calendarModal.yearMonth', { year: currentMonth.getFullYear(), month: currentMonth.getMonth() + 1 })}
                </Text>
                <TouchableOpacity onPress={handleNextMonth} className="p-2">
                  <ChevronRight size={24} color="#8f7161" />
                </TouchableOpacity>
              </View>

              {/* Week Days */}
              <View className="flex-row mb-2 border-b border-stone-100 pb-2">
                {weekDays.map((day, index) => (
                  <View key={`${day}-${index}`} className="w-[14.28%] items-center">
                    <Text className={`text-xs font-bold ${index === 0 ? 'text-red-400' : index === 6 ? 'text-blue-400' : 'text-stone-400'}`}>
                      {day}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Calendar Grid */}
              <View className="flex-row flex-wrap">
                {renderCalendarDays()}
              </View>

              {/* Close Button */}
              <TouchableOpacity
                onPress={onClose}
                className="mt-6 self-center p-2"
              >
                <Text className="text-stone-400 font-bold">{t('calendarModal.close')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
