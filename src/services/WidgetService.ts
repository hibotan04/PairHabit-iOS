import SharedGroupPreferences from 'react-native-shared-group-preferences';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { Platform } from 'react-native';

const APP_GROUP_ID = 'group.com.habitpot.mobile'; // Must match iOS App Group
const SHARED_PREFS_NAME = 'HabitWidgetPrefs'; // For Android

export interface WidgetGoal {
  label: string;
  current: number;
  target: number;
}

export interface WidgetHabit {
  id: string;
  name: string;
  emoji?: string;
  completedToday: boolean;
  color: string;
  amount: number; // Habit points
  history: boolean[]; // Current Month (1st to End)
}

export interface WidgetData {
  themeColor: string;
  currency: string;
  habits: WidgetHabit[];
  goal?: WidgetGoal;
  lastUpdated: string;
  weekStartDay: number; // 0: Sunday, 1: Monday
}

// import WidgetCenter from 'react-native-widget-center'; // Removed as library was deleted

// ...

export const WidgetService = {
  async updateWidgetData(data: Omit<WidgetData, 'lastUpdated'>) {
    try {
      const dataToSave: WidgetData = {
        ...data,
        lastUpdated: new Date().toISOString(),
      };

      if (Platform.OS === 'ios') {
        try {
          const jsonString = JSON.stringify(dataToSave);
          await SharedGroupPreferences.setItem('widgetData', jsonString, APP_GROUP_ID);
          // Reload Widgets using local module
          try {
            const { reloadTimelines, reloadAllTimelines } = require('../../modules/widget-controller');
            // Optimize: Reload specific timeline (legacy ID "HabitWidget")
            reloadTimelines('HabitWidget');
            // Also call reloadAll as insurance for other widget kinds (Stats, Goal, etc.)
            reloadAllTimelines();
            console.log("Widget reload requested (specific + all).");
          } catch (e) {
            console.error("WidgetCenter reload error:", e);
          }
        } catch (e) {
          console.error("iOS SharedGroupPreferences error:", e);
        }
      } else {
        await SharedGroupPreferences.setItem('widgetData', dataToSave, APP_GROUP_ID);
        requestWidgetUpdate({
          widgetName: 'HabitWidget',
          renderWidget: async () => (null as any),
          widgetNotFound: () => { }
        });
      }
      console.log('Widget data updated successfully');
    } catch (error) {
      console.error('Error updating widget data:', error);
    }
  },
};
