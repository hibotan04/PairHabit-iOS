import { NativeModules } from 'react-native';

const WidgetController = NativeModules.HabitWidgetController;

export function reloadAllTimelines() {
  if (WidgetController && WidgetController.reloadAllTimelines) {
    return WidgetController.reloadAllTimelines();
  } else {
    console.warn("HabitWidgetController not linked or available via NativeModules.");
  }
}

export function reloadTimelines(kind: string) {
  if (WidgetController && WidgetController.reloadTimelines) {
    return WidgetController.reloadTimelines(kind);
  } else {
    console.warn("HabitWidgetController not linked or available.");
  }
}
