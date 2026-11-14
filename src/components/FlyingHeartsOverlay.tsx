import React, { useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Heart } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  Easing
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface HeartItem {
  id: string;
  x: number;
  y: number;
}

export interface FlyingHeartsOverlayRef {
  addHeart: (x: number, y: number) => void;
}

const AnimatedHeart = React.memo(({ x, y, onComplete }: { x: number, y: number, onComplete: () => void }) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0.5);

  React.useEffect(() => {
    // Randomize end position slightly
    const endX = (Math.random() - 0.5) * 100;

    translateY.value = withSequence(
      withTiming(-SCREEN_HEIGHT * 0.4, { duration: 1000, easing: Easing.out(Easing.ease) }),
      withTiming(-SCREEN_HEIGHT * 0.6, { duration: 500 }, (finished) => {
        if (finished) {
          runOnJS(onComplete)();
        }
      })
    );

    translateX.value = withTiming(endX, { duration: 1500 });

    scale.value = withSequence(
      withTiming(1.5, { duration: 200 }),
      withTiming(1, { duration: 1300 })
    );

    opacity.value = withDelay(1000, withTiming(0, { duration: 500 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x + translateX.value },
      { translateY: y + translateY.value },
      { scale: scale.value }
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.heart, style]}>
      <Heart fill="#d97706" color="#d97706" size={30} />
    </Animated.View>
  );
});

const FlyingHeartsOverlay = forwardRef<FlyingHeartsOverlayRef, {}>((props, ref) => {
  const [hearts, setHearts] = useState<HeartItem[]>([]);

  const removeHeart = useCallback((id: string) => {
    setHearts(prev => prev.filter(h => h.id !== id));
  }, []);

  useImperativeHandle(ref, () => ({
    addHeart: (x: number, y: number) => {
      const id = Date.now().toString() + Math.random();
      // Add multiple hearts for effect
      const newHearts = Array.from({ length: 5 }).map((_, i) => ({
        id: id + i,
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 40
      }));
      setHearts(prev => [...prev, ...newHearts]);
    }
  }));

  if (hearts.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {hearts.map(heart => (
        <AnimatedHeart
          key={heart.id}
          x={heart.x}
          y={heart.y}
          onComplete={() => removeHeart(heart.id)}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  heart: {
    position: 'absolute',
    top: 0,
    left: 0,
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  }
});

export default FlyingHeartsOverlay;
