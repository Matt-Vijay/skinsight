import React, { useEffect, memo } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAnimeStagger, STAGGER_PRESETS, AnimeStaggerConfig } from '../hooks/useAnimeStagger';

interface AnimatedQuestionOption {
  label: string;
  value: string;
  selected?: boolean;
}

interface AnimatedQuestionOptionsProps {
  options: AnimatedQuestionOption[];
  onSelect: (value: string) => void;
  onToggle?: (value: string) => void;
  mode: 'radio' | 'checkbox';
  animationPreset?: keyof typeof STAGGER_PRESETS;
  customAnimationConfig?: AnimeStaggerConfig;
  currentQuestionIndex?: number; // To trigger re-animation on question change
  gradientColors?: [ColorValue, ColorValue];
}

/**
 * Enhanced questionnaire options component using Anime.js v4 staggering.
 * 
 * This component demonstrates the powerful staggering capabilities available
 * through the useAnimeStagger hook, providing smooth and sophisticated
 * entrance animations for questionnaire options.
 * 
 * Features:
 * - Multiple animation presets (radial, wave, grid, random)
 * - Custom animation configurations
 * - Seamless integration with existing questionnaire styles
 * - Performance optimized with native driver support
 * - Accessible and maintainable code structure
 */
const AnimatedQuestionOptions: React.FC<AnimatedQuestionOptionsProps> = memo(({
  options,
  onSelect,
  onToggle,
  mode,
  animationPreset = 'fadeInFromBottom',
  customAnimationConfig,
  currentQuestionIndex = 0,
  gradientColors = ['rgba(255, 240, 236, 0.7)', 'rgba(236, 240, 255, 0.7)']
}) => {
  // Use the anime stagger hook with either preset or custom config
  const animationConfig = customAnimationConfig || STAGGER_PRESETS[animationPreset];
  
  const {
    animatedValues,
    startAnimation,
    resetAnimation,
    updateItemCount
  } = useAnimeStagger(options.length, animationConfig);
  
  // Update item count when options change
  useEffect(() => {
    updateItemCount(options.length);
  }, [options.length, updateItemCount]);
  
  // Trigger animation when question changes or component mounts
  useEffect(() => {
    // Skip animations for the first question to avoid intro animations during navigation
    if (currentQuestionIndex === 0) {
      // For the first question, just set values to final state without animation
      resetAnimation();
      // Don't start animation for first question
      return;
    }
    
    // Reset and start animation for subsequent questions
    resetAnimation();
    
    // Small delay to ensure reset is complete
    const animationTimeout = setTimeout(() => {
      startAnimation();
    }, 50);
    
    return () => clearTimeout(animationTimeout);
  }, [currentQuestionIndex, startAnimation, resetAnimation]);
  
  const handleOptionPress = (option: AnimatedQuestionOption) => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (mode === 'radio') {
      onSelect(option.value);
    } else {
      onToggle?.(option.value);
    }
  };
  
  return (
    <View style={styles.container}>
      {options.map((option, index) => {
        const animatedValue = animatedValues[index];
        
        // Skip rendering if animated values aren't ready
        if (!animatedValue) return null;
        
        const isSelected = option.selected || false;
        
        // Calculate gradient locations based on index for visual variety
        const gradientLocations: [number, number] = [0, Math.min(1, (index + 2) / (options.length + 1))];
        
        return (
          <Animated.View
            key={option.value}
            style={[
              styles.optionContainer,
              {
                opacity: animatedValue.opacity,
                transform: [
                  { scale: animatedValue.scale },
                  { translateX: animatedValue.translateX },
                  { translateY: animatedValue.translateY },
                  { 
                    rotate: animatedValue.rotate.interpolate({
                      inputRange: [-180, 180],
                      outputRange: ['-180deg', '180deg']
                    })
                  }
                ]
              }
            ]}
          >
            <TouchableOpacity
              style={styles.touchableOption}
              onPress={() => handleOptionPress(option)}
              activeOpacity={0.8}
            >
              <View style={styles.optionShell}>
                {/* Background gradient layer */}
                <LinearGradient
                  colors={gradientColors as readonly [ColorValue, ColorValue, ...ColorValue[]]}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                  locations={gradientLocations}
                />
                
                {/* Selection overlay */}
                {isSelected && (
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      styles.selectedOverlay
                    ]}
                  />
                )}
                
                {/* Option content */}
                <View style={styles.optionContent}>
                  {/* Selection indicator for radio/checkbox mode */}
                  <View style={styles.selectionIndicator}>
                    {mode === 'radio' ? (
                      <View style={[
                        styles.radioButton,
                        isSelected && styles.radioButtonSelected
                      ]}>
                        {isSelected && <View style={styles.radioButtonInner} />}
                      </View>
                    ) : (
                      <View style={[
                        styles.checkbox,
                        isSelected && styles.checkboxSelected
                      ]}>
                        {isSelected && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </View>
                    )}
                  </View>
                  
                  {/* Option label */}
                  <Text style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
});

/**
 * Example component showcasing different animation presets
 * This demonstrates the versatility of the stagger system
 */
export const AnimationPresetsDemo: React.FC = () => {
  const sampleOptions = [
    { label: 'Option 1', value: '1' },
    { label: 'Option 2', value: '2' },
    { label: 'Option 3', value: '3' },
    { label: 'Option 4', value: '4' },
  ];
  
  const [currentPreset, setCurrentPreset] = React.useState<keyof typeof STAGGER_PRESETS>('fadeInFromBottom');
  const [questionIndex, setQuestionIndex] = React.useState(0);
  
  const presets = Object.keys(STAGGER_PRESETS) as Array<keyof typeof STAGGER_PRESETS>;
  
  const switchPreset = () => {
    const currentIndex = presets.indexOf(currentPreset);
    const nextIndex = (currentIndex + 1) % presets.length;
    setCurrentPreset(presets[nextIndex]);
    setQuestionIndex(prev => prev + 1); // Trigger re-animation
  };
  
  return (
    <View style={styles.demoContainer}>
      <Text style={styles.demoTitle}>Animation Preset: {currentPreset}</Text>
      
      <AnimatedQuestionOptions
        options={sampleOptions}
        onSelect={() => {}}
        mode="radio"
        animationPreset={currentPreset}
        currentQuestionIndex={questionIndex}
      />
      
      <TouchableOpacity style={styles.switchButton} onPress={switchPreset}>
        <Text style={styles.switchButtonText}>Switch Animation</Text>
      </TouchableOpacity>
    </View>
  );
};

/**
 * Example of custom grid animation configuration
 * This shows how to create complex stagger patterns
 */
export const CustomGridAnimation: React.FC = () => {
  const gridOptions = Array.from({ length: 9 }, (_, i) => ({
    label: `Item ${i + 1}`,
    value: `${i + 1}`
  }));
  
  const customGridConfig: AnimeStaggerConfig = {
    staggerValue: 80,
    staggerOptions: {
      from: 'center',
      grid: [3, 3], // 3x3 grid
      reversed: false,
    },
    duration: 600,
    properties: {
      opacity: [0, 1],
      scale: [0.7, 1],
      rotate: [-90, 0],
      translateY: [30, 0],
    },
    ease: 'outCubic',
    useNativeDriver: true,
  };
  
  return (
    <View style={styles.gridContainer}>
      <Text style={styles.demoTitle}>Custom Grid Animation (3x3)</Text>
      
      <View style={styles.gridWrapper}>
        <AnimatedQuestionOptions
          options={gridOptions}
          onSelect={() => {}}
          mode="checkbox"
          customAnimationConfig={customGridConfig}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 12,
  },
  optionContainer: {
    width: '100%',
  },
  touchableOption: {
    width: '100%',
  },
  optionShell: {
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 56,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedOverlay: {
    backgroundColor: '#000000',
    opacity: 0.85,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 56,
  },
  selectionIndicator: {
    marginRight: 16,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#fff',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderColor: '#fff',
    backgroundColor: '#fff',
  },
  checkmark: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#fff',
  },
  demoContainer: {
    padding: 20,
    gap: 20,
  },
  demoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  switchButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  gridContainer: {
    padding: 20,
  },
  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});

AnimatedQuestionOptions.displayName = 'AnimatedQuestionOptions';

export default AnimatedQuestionOptions; 