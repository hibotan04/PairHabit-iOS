import React from 'react';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { HabitWidget } from './src/widgets/HabitWidget';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const widgetName = widgetInfo.widgetName;

  if (widgetName === 'HabitWidget') {
    try {
      const SharedGroupPreferences = require('react-native-shared-group-preferences');
      const APP_GROUP_ID = 'group.com.habitpot.mobile';
      const data = await SharedGroupPreferences.getItem('widgetData', APP_GROUP_ID);
      const habits = data.habits || [];

      props.renderWidget(<HabitWidget habits={habits} />);
    } catch (error) {
      console.error('Error rendering widget:', error);
      // Fallback or empty state
      props.renderWidget(<HabitWidget habits={[]} />);
    }
  }
}
