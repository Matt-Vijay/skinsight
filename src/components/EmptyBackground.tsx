import React from 'react';
import { View } from 'react-native';

interface EmptyBackgroundProps {
  color?: string;
}

// This is a simple empty replacement for the HexagonalBackground component
const EmptyBackground: React.FC<EmptyBackgroundProps> = () => {
  return <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />;
};

export default EmptyBackground;