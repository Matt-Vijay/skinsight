# Anime.js v4 Staggering in React Native - Complete Guide

## Overview

This guide outlines the implementation of a staggered animation system for React Native applications, specifically for the Dewy-App questionnaire. The implementation bridges Anime.js's sophisticated timing calculations with React Native's performant animation system.

## Architecture

### Core Components

1. **`useAnimeStagger` Hook** - The main bridge between Anime.js and React Native
2. **`AnimatedQuestionOptions` Component** - Example implementation for questionnaire options
3. **Preset Configurations** - Pre-built animation patterns for common use cases

### Key Benefits

- **Advanced Staggering Patterns**: Grid, radial, random, wave animations
- **Performance Optimized**: Uses React Native's native driver
- **Type Safe**: Full TypeScript support with comprehensive interfaces
- **Modular Design**: Reusable across different components
- **Security Focused**: Validated inputs and safe defaults

## Installation & Setup

```bash
npm install animejs --legacy-peer-deps
```

## Basic Usage

### 1. Simple Fade-In Stagger

```tsx
import { useAnimeStagger, STAGGER_PRESETS } from '../hooks/useAnimeStagger';

const MyComponent = () => {
  const { animatedValues, startAnimation } = useAnimeStagger(
    5, // number of items
    STAGGER_PRESETS.fadeInFromBottom
  );

  useEffect(() => {
    startAnimation();
  }, []);

  return (
    <View>
      {animatedValues.map((animatedValue, index) => (
        <Animated.View
          key={index}
          style={{
            opacity: animatedValue.opacity,
            transform: [
              { scale: animatedValue.scale },
              { translateY: animatedValue.translateY }
            ]
          }}
        >
          <Text>Item {index + 1}</Text>
        </Animated.View>
      ))}
    </View>
  );
};
```

### 2. Custom Configuration

```tsx
const customConfig: AnimeStaggerConfig = {
  staggerValue: 100,
  staggerOptions: {
    from: 'center',
    grid: [3, 3],
    reversed: false,
  },
  duration: 600,
  properties: {
    opacity: [0, 1],
    scale: [0.8, 1],
    rotate: [-45, 0],
  },
  ease: 'outCubic',
  useNativeDriver: true,
};

const { animatedValues, startAnimation } = useAnimeStagger(9, customConfig);
```

## Advanced Staggering Patterns

### Grid Animations

Perfect for card layouts or option grids:

```tsx
const gridConfig: AnimeStaggerConfig = {
  staggerValue: 80,
  staggerOptions: {
    from: 'center',
    grid: [3, 4], // 3 rows, 4 columns
    axis: 'x', // Stagger along X-axis only
  },
  duration: 500,
  properties: {
    opacity: [0, 1],
    scale: [0.7, 1],
    translateX: [-50, 0],
  },
};
```

### Radial Burst

Great for circular menus or central focus elements:

```tsx
const radialConfig: AnimeStaggerConfig = {
  staggerValue: 60,
  staggerOptions: {
    from: 'center',
  },
  duration: 400,
  properties: {
    opacity: [0, 1],
    scale: [0.5, 1],
  },
};
```

### Random Entrance

For playful, organic feeling animations:

```tsx
const randomConfig: AnimeStaggerConfig = {
  staggerValue: 150,
  staggerOptions: {
    from: 'random',
    reversed: false,
  },
  duration: 700,
  properties: {
    opacity: [0, 1],
    scale: [0.3, 1],
    rotate: [-180, 0],
  },
};
```

## Integration with Existing Questionnaire

### Replacing Current RadioOption Component

Here's how to integrate the new staggering system into your existing questionnaire:

```tsx
// In QuestionnaireScreen.tsx
import AnimatedQuestionOptions from '../components/AnimatedQuestionOptions';

// Replace your current option rendering with:
const renderQuestionInputs = () => {
  const currentQ = questions[currentQuestion];
  
  if (currentQ.type === 'radio' && currentQ.options) {
    return (
      <AnimatedQuestionOptions
        options={currentQ.options.map(option => ({
          label: option,
          value: option,
          selected: answers[currentQ.id] === option
        }))}
        onSelect={(value) => handleRadioSelect(value)}
        mode="radio"
        animationPreset="fadeInFromBottom" // or "radialBurst", "waveFromLeft", etc.
        currentQuestionIndex={currentQuestion}
        gradientColors={UNSELECTED_OPTION_GRADIENT_COLORS}
      />
    );
  }
  
  if (currentQ.type === 'checkbox' && currentQ.options) {
    return (
      <AnimatedQuestionOptions
        options={currentQ.options.map(option => ({
          label: option,
          value: option,
          selected: (answers[currentQ.id] as string[] || []).includes(option)
        }))}
        onToggle={(value) => handleCheckboxToggle(value)}
        mode="checkbox"
        animationPreset="waveFromLeft"
        currentQuestionIndex={currentQuestion}
      />
    );
  }
  
  // ... rest of your existing logic
};
```

### Custom Questionnaire-Specific Animations

Create specialized animations for different question types:

```tsx
// For skin concern questions - use a gentle wave
const skinConcernConfig: AnimeStaggerConfig = {
  staggerValue: 60,
  staggerOptions: { from: 'first' },
  duration: 350,
  properties: {
    opacity: [0, 1],
    scale: [0.95, 1],
    translateY: [15, 0],
  },
  ease: 'outCubic',
};

// For product selection - use radial burst to emphasize choice
const productSelectionConfig: AnimeStaggerConfig = {
  staggerValue: 80,
  staggerOptions: { from: 'center' },
  duration: 400,
  properties: {
    opacity: [0, 1],
    scale: [0.8, 1],
    rotate: [-10, 0],
  },
  ease: 'outCubic',
};

// For boolean questions - simple but elegant
const booleanConfig: AnimeStaggerConfig = {
  staggerValue: 120,
  staggerOptions: { from: 'first' },
  duration: 300,
  properties: {
    opacity: [0, 1],
    scale: [0.9, 1],
    translateX: [-20, 0],
  },
};
```

## Performance Considerations

### Native Driver Usage

Always use the native driver when possible:

```tsx
const config: AnimeStaggerConfig = {
  // ... other properties
  useNativeDriver: true, // Enables hardware acceleration
};
```

### Memory Management

The hook automatically cleans up animations on unmount, but you can manually control them:

```tsx
const { startAnimation, stopAnimation, resetAnimation } = useAnimeStagger(count, config);

// Stop all animations
stopAnimation();

// Reset to initial state
resetAnimation();

// Update item count dynamically
updateItemCount(newCount);
```

### Large Lists

For large lists (>20 items), consider:

1. Using simpler animations
2. Reducing stagger delays
3. Implementing virtualization

```tsx
// Optimized for large lists
const largeListConfig: AnimeStaggerConfig = {
  staggerValue: 30, // Reduced delay
  duration: 250, // Shorter duration
  properties: {
    opacity: [0, 1], // Only animate opacity
  },
  useNativeDriver: true,
};
```

## Debugging & Troubleshooting

### Common Issues

1. **Animation not starting**: Ensure `startAnimation()` is called after component mount
2. **Jerky animations**: Check if `useNativeDriver` is enabled for transform properties
3. **Memory leaks**: Verify animations are properly cleaned up on unmount

### Debug Mode

Add progress tracking to monitor animation performance:

```tsx
const config: AnimeStaggerConfig = {
  // ... other properties
  onBegin: () => console.log('Animation started'),
  onUpdate: (progress) => console.log('Progress:', progress),
  onComplete: () => console.log('Animation completed'),
};
```

## Best Practices

### 1. Animation Timing

- **Fast interactions**: 200-300ms duration
- **Attention-grabbing**: 400-600ms duration
- **Decorative**: 600-1000ms duration

### 2. Stagger Values

- **Subtle**: 20-50ms between items
- **Noticeable**: 60-100ms between items
- **Dramatic**: 100-200ms between items

### 3. Easing Functions

- **Natural feel**: `outCubic`, `outQuart`
- **Bouncy**: `outBack`, `outElastic`
- **Smooth**: `inOutQuad`, `inOutCubic`

### 4. Property Combinations

```tsx
// Good: Cohesive animation
properties: {
  opacity: [0, 1],
  scale: [0.9, 1],
  translateY: [20, 0],
}

// Avoid: Too many conflicting movements
properties: {
  opacity: [0, 1],
  scale: [0.5, 1.5],
  translateX: [-100, 100],
  translateY: [-50, 50],
  rotate: [-360, 360],
}
```

## Examples for Different Question Types

### Age Input with Floating Label

```tsx
const ageInputConfig: AnimeStaggerConfig = {
  staggerValue: 0, // No stagger for single input
  duration: 400,
  properties: {
    opacity: [0, 1],
    translateY: [30, 0],
  },
  ease: 'outCubic',
};
```

### Slider Components

```tsx
const sliderConfig: AnimeStaggerConfig = {
  staggerValue: 100,
  duration: 500,
  properties: {
    opacity: [0, 1],
    scale: [0.95, 1],
  },
  ease: 'outQuart',
};
```

### Progress Indicators

```tsx
const progressConfig: AnimeStaggerConfig = {
  staggerValue: 50,
  staggerOptions: { from: 'first' },
  duration: 300,
  properties: {
    opacity: [0, 1],
    scaleX: [0, 1],
  },
};
```

## Conclusion

The Anime.js v4 staggering system provides a powerful, performant, and flexible way to create sophisticated animations in React Native. By leveraging Anime.js for timing calculations and React Native's Animated library for rendering, you get the best of both worlds: expressive animation APIs and native performance.

The modular design ensures that animations remain maintainable and reusable across your application, while the type-safe configuration prevents common animation bugs and improves developer experience.

For the Dewy-App questionnaire, this system will significantly enhance the user experience by providing smooth, professional animations that guide users through the form while maintaining excellent performance on all devices. 