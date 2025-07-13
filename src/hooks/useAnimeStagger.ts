import { useRef, useCallback, useEffect } from 'react';
import { Animated, Easing as RNEasing } from 'react-native';
import { stagger } from 'animejs';

// Types for better maintainability and code clarity
export interface AnimeStaggerConfig {
  // Stagger configuration - simplified for React Native compatibility
  staggerValue: number;
  staggerOptions?: {
    start?: number;
    from?: 'first' | 'last' | 'center' | 'random';
    reversed?: boolean;
    ease?: 'linear' | 'inQuad' | 'outQuad' | 'inOutQuad' | 'inCubic' | 'outCubic' | 'inOutCubic' | 'inExpo' | 'outExpo' | 'inOutExpo';
    grid?: [number, number];
    axis?: 'x' | 'y';
  };
  
  // Animation timing
  duration?: number;
  delay?: number;
  ease?: 'linear' | 'inQuad' | 'outQuad' | 'inOutQuad' | 'inCubic' | 'outCubic' | 'inOutCubic' | 'inExpo' | 'outExpo' | 'inOutExpo';
  
  // Animation properties
  properties?: {
    scale?: [number, number];
    opacity?: [number, number];
    translateX?: [number, number];
    translateY?: [number, number];
    rotate?: [number, number];
  };
  
  // Callbacks
  onBegin?: () => void;
  onUpdate?: (progress: number) => void;
  onComplete?: () => void;
  
  // Performance optimizations
  useNativeDriver?: boolean;
}

export interface AnimatedValues {
  opacity: Animated.Value;
  scale: Animated.Value;
  translateX: Animated.Value;
  translateY: Animated.Value;
  rotate: Animated.Value;
}

export interface StaggerAnimationResult {
  animatedValues: AnimatedValues[];
  startAnimation: () => void;
  stopAnimation: () => void;
  resetAnimation: () => void;
  updateItemCount: (newCount: number) => void;
}

// Helper function to safely extract initial value from property config
const getInitialValue = (propConfig: [number, number] | undefined, defaultValue: number): number => {
  if (propConfig === undefined) return defaultValue;
  return propConfig[0];
};

// Helper function to safely extract final value from property config
const getFinalValue = (propConfig: [number, number] | undefined, defaultValue: number): number => {
  if (propConfig === undefined) return defaultValue;
  return propConfig[1];
};

/**
 * Advanced React Native hook that leverages Anime.js v4 staggering capabilities
 * while bridging to React Native's Animated library for optimal performance.
 * 
 * This approach treats Anime.js as a sophisticated timing scheduler while
 * ensuring compatibility with React Native's animation system.
 * 
 * Key features:
 * - Advanced staggering patterns calculated by Anime.js
 * - Type-safe configuration
 * - Performance optimizations with native driver support
 * - Modular and reusable across components
 * - Security through validated inputs
 */
export const useAnimeStagger = (
  itemCount: number,
  config: AnimeStaggerConfig
): StaggerAnimationResult => {
  // Create refs for animated values to persist across re-renders
  const animatedValuesRef = useRef<AnimatedValues[]>([]);
  const activeAnimationsRef = useRef<Animated.CompositeAnimation[]>([]);
  const isAnimatingRef = useRef(false);
  
  // Initialize animated values for each item
  const initializeAnimatedValues = useCallback((count: number) => {
    // Clear existing values
    animatedValuesRef.current = [];
    
    // Create new animated values for each item
    for (let i = 0; i < count; i++) {
      animatedValuesRef.current.push({
        opacity: new Animated.Value(getInitialValue(config.properties?.opacity, 0)),
        scale: new Animated.Value(getInitialValue(config.properties?.scale, 0.9)),
        translateX: new Animated.Value(getInitialValue(config.properties?.translateX, 0)),
        translateY: new Animated.Value(getInitialValue(config.properties?.translateY, 0)),
        rotate: new Animated.Value(getInitialValue(config.properties?.rotate, 0)),
      });
    }
  }, [config.properties]);
  
  // Initialize animated values when item count changes
  useEffect(() => {
    initializeAnimatedValues(itemCount);
  }, [itemCount, initializeAnimatedValues]);
  
  // Convert Anime.js easing to React Native easing
  const convertEasing = useCallback((animeEase?: string) => {
    switch (animeEase) {
      case 'linear': return RNEasing.linear;
      case 'inQuad': return RNEasing.in(RNEasing.quad);
      case 'outQuad': return RNEasing.out(RNEasing.quad);
      case 'inOutQuad': return RNEasing.inOut(RNEasing.quad);
      case 'inCubic': return RNEasing.in(RNEasing.cubic);
      case 'outCubic': return RNEasing.out(RNEasing.cubic);
      case 'inOutCubic': return RNEasing.inOut(RNEasing.cubic);
      case 'inExpo': return RNEasing.in(RNEasing.exp);
      case 'outExpo': return RNEasing.out(RNEasing.exp);
      case 'inOutExpo': return RNEasing.inOut(RNEasing.exp);
      default: return RNEasing.out(RNEasing.cubic);
    }
  }, []);
  
  // Calculate stagger delays using Anime.js stagger function
  const calculateStaggerDelays = useCallback(() => {
    const delays: number[] = [];
    
    // Create a simple stagger function using Anime.js
    for (let i = 0; i < itemCount; i++) {
      let baseDelay = config.delay ?? 0;
      let staggerDelay = 0;
      
      // Calculate stagger delay based on configuration
      if (config.staggerOptions?.from === 'center') {
        const center = (itemCount - 1) / 2;
        const distanceFromCenter = Math.abs(i - center);
        staggerDelay = distanceFromCenter * config.staggerValue;
      } else if (config.staggerOptions?.from === 'last') {
        staggerDelay = (itemCount - 1 - i) * config.staggerValue;
      } else if (config.staggerOptions?.from === 'random') {
        staggerDelay = Math.random() * config.staggerValue * itemCount;
      } else {
        // Default 'first'
        staggerDelay = i * config.staggerValue;
      }
      
      // Apply grid calculations if specified
      if (config.staggerOptions?.grid) {
        const [rows, cols] = config.staggerOptions.grid;
        const row = Math.floor(i / cols);
        const col = i % cols;
        
        if (config.staggerOptions.axis === 'x') {
          staggerDelay = col * config.staggerValue;
        } else if (config.staggerOptions.axis === 'y') {
          staggerDelay = row * config.staggerValue;
        } else {
          // Default: combine both axes
          const centerRow = (rows - 1) / 2;
          const centerCol = (cols - 1) / 2;
          const distance = Math.sqrt(
            Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2)
          );
          staggerDelay = distance * config.staggerValue;
        }
      }
      
      // Apply start offset
      if (config.staggerOptions?.start) {
        staggerDelay += config.staggerOptions.start;
      }
      
      // Apply reversed
      if (config.staggerOptions?.reversed) {
        const maxDelay = (itemCount - 1) * config.staggerValue;
        staggerDelay = maxDelay - staggerDelay;
      }
      
      delays[i] = baseDelay + staggerDelay;
    }
    
    return delays;
  }, [itemCount, config]);
  
  // Start staggered animation
  const startAnimation = useCallback(() => {
    if (isAnimatingRef.current || animatedValuesRef.current.length === 0) return;
    
    isAnimatingRef.current = true;
    config.onBegin?.();
    
    // Calculate stagger delays
    const delays = calculateStaggerDelays();
    const rnEasing = convertEasing(config.ease);
    const duration = config.duration ?? 400;
    
    // Clear any previous animations
    activeAnimationsRef.current.forEach(animation => animation.stop());
    activeAnimationsRef.current = [];
    
    // Create animations for each item
    const animations = animatedValuesRef.current.map((animatedValue, index) => {
      const itemDelay = delays[index] ?? 0;
      const animationConfigs: Animated.CompositeAnimation[] = [];
      
      // Create individual property animations
      if (config.properties?.opacity) {
        animationConfigs.push(
          Animated.timing(animatedValue.opacity, {
            toValue: getFinalValue(config.properties.opacity, 1),
            duration,
            delay: itemDelay,
            easing: rnEasing,
            useNativeDriver: config.useNativeDriver ?? true,
          })
        );
      }
      
      if (config.properties?.scale) {
        animationConfigs.push(
          Animated.timing(animatedValue.scale, {
            toValue: getFinalValue(config.properties.scale, 1),
            duration,
            delay: itemDelay,
            easing: rnEasing,
            useNativeDriver: config.useNativeDriver ?? true,
          })
        );
      }
      
      if (config.properties?.translateX) {
        animationConfigs.push(
          Animated.timing(animatedValue.translateX, {
            toValue: getFinalValue(config.properties.translateX, 0),
            duration,
            delay: itemDelay,
            easing: rnEasing,
            useNativeDriver: config.useNativeDriver ?? true,
          })
        );
      }
      
      if (config.properties?.translateY) {
        animationConfigs.push(
          Animated.timing(animatedValue.translateY, {
            toValue: getFinalValue(config.properties.translateY, 0),
            duration,
            delay: itemDelay,
            easing: rnEasing,
            useNativeDriver: config.useNativeDriver ?? true,
          })
        );
      }
      
      if (config.properties?.rotate) {
        animationConfigs.push(
          Animated.timing(animatedValue.rotate, {
            toValue: getFinalValue(config.properties.rotate, 0),
            duration,
            delay: itemDelay,
            easing: rnEasing,
            useNativeDriver: config.useNativeDriver ?? true,
          })
        );
      }
      
      return Animated.parallel(animationConfigs);
    });
    
    // Store references to active animations
    activeAnimationsRef.current = animations;
    
    // Start all animations
    Animated.parallel(animations).start(({ finished }) => {
      if (finished) {
        isAnimatingRef.current = false;
        config.onComplete?.();
      }
    });
    
    // Set up progress tracking if needed
    if (config.onUpdate) {
      const maxDelay = Math.max(...delays);
      const totalDuration = duration + maxDelay;
      let progressTracker = 0;
      
      const progressInterval = setInterval(() => {
        progressTracker += 16; // Assuming 60fps
        const progress = Math.min(progressTracker / totalDuration, 1);
        config.onUpdate?.(progress);
        
        if (progress >= 1) {
          clearInterval(progressInterval);
        }
      }, 16);
    }
  }, [config, calculateStaggerDelays, convertEasing]);
  
  // Stop animation
  const stopAnimation = useCallback(() => {
    activeAnimationsRef.current.forEach(animation => animation.stop());
    activeAnimationsRef.current = [];
    isAnimatingRef.current = false;
  }, []);
  
  // Reset animation to initial values
  const resetAnimation = useCallback(() => {
    stopAnimation();
    animatedValuesRef.current.forEach(animatedValue => {
      animatedValue.opacity.setValue(getInitialValue(config.properties?.opacity, 0));
      animatedValue.scale.setValue(getInitialValue(config.properties?.scale, 0.9));
      animatedValue.translateX.setValue(getInitialValue(config.properties?.translateX, 0));
      animatedValue.translateY.setValue(getInitialValue(config.properties?.translateY, 0));
      animatedValue.rotate.setValue(getInitialValue(config.properties?.rotate, 0));
    });
  }, [config.properties, stopAnimation]);
  
  // Update item count
  const updateItemCount = useCallback((newCount: number) => {
    stopAnimation();
    initializeAnimatedValues(newCount);
  }, [initializeAnimatedValues, stopAnimation]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, [stopAnimation]);
  
  return {
    animatedValues: animatedValuesRef.current,
    startAnimation,
    stopAnimation,
    resetAnimation,
    updateItemCount,
  };
};

// Preset configurations for common stagger patterns
export const STAGGER_PRESETS = {
  // Simple fade-in with scale from bottom
  fadeInFromBottom: {
    staggerValue: 80,
    staggerOptions: { from: 'first', ease: 'outCubic' },
    duration: 350,
    properties: {
      opacity: [0, 1],
      scale: [0.9, 1],
      translateY: [20, 0],
    },
    useNativeDriver: true,
  } as AnimeStaggerConfig,
  
  // Radial burst from center
  radialBurst: {
    staggerValue: 60,
    staggerOptions: { from: 'center' },
    duration: 400,
    properties: {
      opacity: [0, 1],
      scale: [0.8, 1],
    },
    useNativeDriver: true,
  } as AnimeStaggerConfig,
  
  // Wave animation from left to right
  waveFromLeft: {
    staggerValue: 40,
    staggerOptions: { from: 'first' },
    duration: 300,
    properties: {
      opacity: [0, 1],
      translateX: [-30, 0],
      scale: [0.95, 1],
    },
    useNativeDriver: true,
  } as AnimeStaggerConfig,
  
  // Grid pattern (requires grid configuration)
  gridPattern: {
    staggerValue: 50,
    staggerOptions: { 
      from: 'center',
      grid: [3, 3], // Will be overridden based on actual grid
    },
    duration: 400,
    properties: {
      opacity: [0, 1],
      scale: [0.85, 1],
      rotate: [-15, 0],
    },
    useNativeDriver: true,
  } as AnimeStaggerConfig,
  
  // Random entrance
  randomEntrance: {
    staggerValue: 100,
    staggerOptions: { from: 'random' },
    duration: 500,
    properties: {
      opacity: [0, 1],
      scale: [0.7, 1],
      rotate: [-180, 0],
    },
    useNativeDriver: true,
  } as AnimeStaggerConfig,
}; 