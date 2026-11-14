import React from 'react';
import { View, Image, Text, ActivityIndicator } from 'react-native';

const LoadingScreen = () => (
  <View className="flex-1 items-center justify-center bg-[#fff8fa]">
    <View className="items-center">
      <Image
        source={require('../../assets/7.png')}
        style={{ width: 96, height: 96, borderRadius: 20, marginBottom: 24 }}
        resizeMode="contain"
      />
      <Text className="text-2xl font-bold text-[#8f7161] tracking-widest font-heading">Pair Habit</Text>
      <ActivityIndicator size="small" color="#8f7161" style={{ marginTop: 32 }} />
    </View>
  </View>
);

export default LoadingScreen;
