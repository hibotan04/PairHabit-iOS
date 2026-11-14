import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

interface HabitWidgetProps {
  habits: Array<{ name: string; value: number; completed: boolean }>;
}

export function HabitWidget({ habits }: HabitWidgetProps) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 12,
        flexDirection: 'column',
      }}
    >
      <TextWidget
        text="HabitPot"
        style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: '#8f7161',
          marginBottom: 8,
        }}
      />

      {habits.slice(0, 3).map((habit, index) => (
        <FlexWidget
          key={index}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 6,
            backgroundColor: habit.completed ? '#fff8e1' : '#f5f5f5',
            borderRadius: 8,
            padding: 8,
          }}
        >
          <TextWidget
            text={habit.completed ? '✓' : '○'}
            style={{
              fontSize: 16,
              color: habit.completed ? '#ffb300' : '#bdbdbd',
              marginRight: 8,
            }}
          />
          <TextWidget
            text={habit.name}
            style={{
              fontSize: 14,
              color: '#424242',
              // flex: 1 is not supported in TextWidget, use width: 'match_parent' or similar if needed
              // But inside a horizontal FlexWidget, it might behave differently.
              // Let's try width: 'match_parent' or just remove flex.
              // Actually, FlexWidget children can use layout_weight if supported, but here let's just remove flex
              // and maybe wrap in another FlexWidget if we need expansion.
              // For now, just removing flex to fix type error.
            }}
          />
        </FlexWidget>
      ))}

      {habits.length === 0 && (
        <TextWidget
          text="No habits yet"
          style={{
            fontSize: 12,
            color: '#9e9e9e',
            fontStyle: 'italic',
          }}
        />
      )}
    </FlexWidget>
  );
}
