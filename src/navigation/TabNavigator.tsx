import React from 'react';
import { Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import MemoriesScreen from '../screens/MemoriesScreen';
import SettingsScreen from '../screens/SettingsScreenV2';
import TicketScreen from '../screens/TicketScreen';
import { Home, BarChart2, BookOpen, Settings, Ticket, User as UserIcon } from 'lucide-react-native';
import { Habit, Reward, User } from '../types';
import { THEME_PALETTES } from '../constants/theme';
import { TAB_ROUTES } from './routes';

const Tab = createBottomTabNavigator();

interface TabNavigatorProps {
  habits: Habit[];
  goals: Reward[];
  totalPoints: number;
  currency: string;
  onToggleHabit: (habitId: string, targetDate?: string) => void;
  userUid: string;
  coupleId: string;
  memories: any[];
  unreadCount: number;
  onReadMessages: () => void;
  unreadMemoriesCount: number;
  onReadMemories: () => void;
  userData: User | null;
  partnerData: User | null;
}

export default function TabNavigator({ habits, goals, totalPoints, currency, onToggleHabit, userUid, coupleId, memories, unreadCount, onReadMessages, unreadMemoriesCount, onReadMemories, userData, partnerData }: TabNavigatorProps) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: THEME_PALETTES[userData?.themeColor || '#8f7161']?.footer?.activeIcon || (userData?.themeColor || '#8f7161'),
        tabBarInactiveTintColor: THEME_PALETTES[userData?.themeColor || '#8f7161']?.footer?.inactiveIcon || '#a8a29e',
        tabBarStyle: {
          paddingTop: 5,
          backgroundColor: THEME_PALETTES[userData?.themeColor || '#8f7161']?.footer?.bg || 'white',
          borderTopColor: THEME_PALETTES[userData?.themeColor || '#8f7161']?.footer?.bg || 'white',
        },
        tabBarIcon: ({ color, size }) => {
          let IconComponent;
          if (route.name === TAB_ROUTES.home) IconComponent = Home;
          else if (route.name === TAB_ROUTES.statistics) IconComponent = BarChart2;
          else if (route.name === TAB_ROUTES.ticket) IconComponent = Ticket;
          else if (route.name === TAB_ROUTES.memories) IconComponent = BookOpen;
          else if (route.name === TAB_ROUTES.settings) IconComponent = UserIcon;

          // Default fallback
          if (!IconComponent) return null;

          return (
            <View>
              <IconComponent color={color} size={size} />
              {route.name === TAB_ROUTES.memories && unreadMemoriesCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    right: -2,
                    top: -2,
                    backgroundColor: '#ef4444',
                    borderRadius: 6,
                    width: 8,
                    height: 8,
                    borderWidth: 1.5,
                    borderColor: 'white',
                  }}
                />
              )}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name={TAB_ROUTES.home}>
        {() => <HomeScreen
          habits={habits}
          goals={goals}
          totalPoints={totalPoints}
          currency={currency}
          onToggleHabit={onToggleHabit}
          userUid={userUid}
          coupleId={coupleId}
          userData={userData}
          partnerData={partnerData}
        />}
      </Tab.Screen>
      <Tab.Screen name={TAB_ROUTES.statistics}>
        {() => <StatisticsScreen habits={habits} userUid={userUid} coupleId={coupleId} userData={userData} partnerData={partnerData} />}
      </Tab.Screen>
      <Tab.Screen name={TAB_ROUTES.ticket}>
        {(props) => <TicketScreen {...props} goals={goals} habits={habits} themeColor={userData?.themeColor || '#8f7161'} coupleId={coupleId} userData={userData} currency={currency} totalPoints={totalPoints} />}
      </Tab.Screen>
      <Tab.Screen
        name={TAB_ROUTES.memories}
        listeners={{
          tabPress: () => {
            onReadMemories();
          },
        }}
      >
        {() => <MemoriesScreen memories={memories} currency={currency} coupleId={coupleId} goals={goals} habits={habits} themeColor={userData?.themeColor || '#8f7161'} userData={userData} />}
      </Tab.Screen>
      <Tab.Screen name={TAB_ROUTES.settings}>
        {() => <SettingsScreen coupleId={coupleId} userUid={userUid} initialThemeColor={userData?.themeColor || '#8f7161'} />}
      </Tab.Screen>
    </Tab.Navigator >
  );
}
