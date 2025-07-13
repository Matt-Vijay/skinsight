// This is a top-level comment to help refresh linter state.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  LayoutAnimation,
  UIManager,
  Easing,
  SafeAreaView,
  StatusBar as ReactNativeStatusBar,
  Image,
  ImageSourcePropType,
  Linking,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, StackActions, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Asset } from 'expo-asset';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../config/supabase';
import { COLORS } from '../../components/AuthComponents';
import { QUESTIONNAIRE_ITEMS, QuestionItem } from '../../types/questionnaireTypes';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import BirthDatePicker from '../../components/questionnaire/BirthDatePicker';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';
import Svg, { Path, Stop, LinearGradient as SvgLinearGradient, Defs, ClipPath, Use, Circle, Rect, Pattern, RadialGradient } from 'react-native-svg';
import { 
  Activity,
  AirVent,
  AlertCircle,
  ArrowLeft, 
  BadgeCheck,
  Ban, 
  Beaker,
  Blend,
  Brush,
  Building2,
  Check,
  CheckCircle,
  CircleDot,
  CircleDotDashed,
  Clock,
  Compass,
  Diamond,
  Dice5,
  Dot,
  Droplet,
  Droplets,
  EllipsisVertical,
  Eraser,
  FileQuestion,
  Filter,
  FlaskConical,
  Flower, 
  GitCompare,
  GripVertical,
  Heart,
  HeartCrack,
  HeartPlus,
  HeartPulse,
  HelpCircle,
  LayoutGrid,
  Layers,
  Leaf,
  Milk,
  MoreHorizontal,
  Pill, 
  Pipette,
  Scan,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldMinus,
  ShieldOff,
  ShieldPlus,
  Sliders,
  SoapDispenserDroplet,
  Sparkles,
  SprayCan,
  Sun, 
  Target,
  Thermometer,
  ThumbsDown,
  ThumbsUp,
  TimerReset,
  Users,
  Waves,
  XCircle,
  Zap,
  CircleX,
  DiamondPlus,
  Laugh
} from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location'; // Added for location permissions
import LottieView from 'lottie-react-native';
import { BlurView } from 'expo-blur';

// NEW: Import our anime.js stagger system for enhanced animations
// import { useAnimeStagger, STAGGER_PRESETS, AnimeStaggerConfig } from '../../hooks/useAnimeStagger';
import AnimatedQuestionOptions from '../../components/AnimatedQuestionOptions';
import { AuthStackParamList } from '../../navigation/AuthNavigator'; // ADDED IMPORT
import {
  saveQuestionnaireAnswers,
  loadQuestionnaireAnswers,
  saveQuestionnaireProgress,
  loadQuestionnaireProgress,
  clearQuestionnaireCache,
} from '../../services/questionnaireCache';
// import { submitQuestionnaireData } from '../services/submissionService';
import { logger } from '@/config/logger';

const GradientLaughIcon = () => (
  <Svg height="28" width="28" viewBox="0 0 24 24">
    <Defs>
      <SvgLinearGradient id="laughGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#D4A2A2" />
        <Stop offset="100%" stopColor="#8C9ECB" />
      </SvgLinearGradient>
    </Defs>
    <Circle cx="12" cy="12" r="10" stroke="url(#laughGradient)" strokeWidth="1.5" fill="none" />
    <Path d="M18 13a6 6 0 0 1-6 5 6 6 0 0 1-6-5h12Z" stroke="url(#laughGradient)" strokeWidth="1.5" fill="none" />
    <Path d="M9 9h.01" stroke="url(#laughGradient)" strokeWidth="2" strokeLinecap="round" />
    <Path d="M15 9h.01" stroke="url(#laughGradient)" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const BackgroundBlobs = () => (
  <View style={[StyleSheet.absoluteFill, { justifyContent: 'center' }]}>
    <View style={{ transform: [{ translateY: -80 }] }}>
      <View style={[styles.blob1, { transform: [{ translateY: -40 }] }]} />
      <View style={[styles.blob2, { transform: [{ translateY: 40 }] }]} />
    </View>
  </View>
);

// Create animated components
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle); // Added for checkmark circle
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Custom LayoutAnimation config for smoother fade
const customFadeAnimation = {
  duration: 500, // Default duration for create/update
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  delete: {
    duration: 500, // Explicitly set a longer duration for delete
    type: LayoutAnimation.Types.linear, // Use linear timing for delete
    property: LayoutAnimation.Properties.opacity, // Focus on fading out deleted items
  },
};

// Window dimensions
const { width, height } = Dimensions.get('window');

// Gradient colors for progress bar
const GRADIENT_COLORS = ['#51D3FC', '#44A3FB', '#6776FB', '#9E38FD'] as const;
const UNSELECTED_OPTION_GRADIENT_COLORS = ['rgba(255, 240, 236, 0.7)', 'rgba(236, 240, 255, 0.7)'] as const; // Updated for subtlety and RGBA

const MIN_PROGRESS_PERCENT = 5; // Progress for the first question
const MAX_PROGRESS_PERCENT_BEFORE_SUBMIT = 95; // Progress when ON the last question

// NEW: Define the vertical space an item takes up for animations
const ITEM_VERTICAL_SPACE = 60; // Adjusted: Approx. (22*2 padding + 12 margin) + buffer

// IDs of questions that should allow scrolling
const SCROLLABLE_QUESTION_IDS = ['skincare_products', 'primary_cause_factor', 'referral_source', 'skin_concerns', 'skin_type'];

// --- Conditional Slider Configurations ---
interface ConditionalSliderConfig {
  id: string; // Unique key for storing the answer
  label: string;
  type: 'numeric' | 'categorical';
  min: number;
  max: number;
  step: number;
  valueLabels?: string[]; // For categorical sliders to display labels
  unit?: string; // e.g., 'hrs', 'mins'
}

const CONDITIONAL_SLIDER_CONFIGS: { [key: string]: ConditionalSliderConfig } = {
  'Poor diet': {
    id: 'poor_diet_portions',
    label: 'Sugary/processed portions per day',
    type: 'numeric', min: 0, max: 10, step: 1, unit: 'portions'
  },
  'Poor sleep': {
    id: 'poor_sleep_hours',
    label: 'Hours of sleep per night',
    type: 'numeric', min: 0, max: 12, step: 0.5, unit: 'hrs'
  },
  'Lack of exercise': {
    id: 'lack_of_exercise_minutes',
    label: 'Daily exercise (minutes)',
    type: 'numeric', min: 0, max: 180, step: 15, unit: 'mins'
  },
  'Stress': {
    id: 'stress_level_value',
    label: 'Stress Level',
    type: 'categorical',
    min: 0, max: 4, step: 1,
    valueLabels: ['None', 'Low', 'Moderate', 'High', 'Very High']
  },
  'Sun exposure': {
    id: 'sun_exposure_minutes',
    label: 'Daily sun exposure (minutes)',
    type: 'numeric', min: 0, max: 240, step: 15, unit: 'mins'
  },
  // 'Hormonal changes': No slider
  // 'Not sure': No slider
};
// --- End Conditional Slider Configurations ---

import {
  tiktokLogo,
  instagramLogo,
  youtubeLogo,
  googleLogo,
  facebookLogo,
  locationMap,
} from '../../assets/images';

// Cached icon mappings for referral source to prevent reloading
const CACHED_REFERRAL_SOURCE_IMAGE_MAP: { [key: string]: ImageSourcePropType } = {
  'TikTok': tiktokLogo,
  'Instagram': instagramLogo,
  'Youtube': youtubeLogo,
  'Google': googleLogo,
  'Facebook': facebookLogo,
};

// Location map image
const LOCATION_MAP_IMAGE = locationMap;

// Material icon mappings for referral sources
const MATERIAL_REFERRAL_SOURCE_ICON_MAP: { [key: string]: any } = {
  'Friends or family': Users,
  'Other': Layers,
};

// Material icon mappings for other app types
const MATERIAL_TRIED_OTHER_APPS_ICON_MAP: { [key: string]: any } = {
  'No': ThumbsDown,
  'Yes': ThumbsUp,
};

// Material icon mappings for skin types
const MATERIAL_SKIN_TYPE_ICON_MAP: { [key: string]: any } = {
  'Oily': Waves,
  'Dry': Leaf,
  'Combination': Blend,
  'Normal': Diamond,
  'Not sure': HelpCircle,
};

// Using Material icons only

// Material icon mapping for skincare products
const MATERIAL_SKINCARE_PRODUCTS_ICON_MAP: { [key: string]: any } = {
  'None': Ban,
  'Cleanser': SoapDispenserDroplet,
  'Toner': Milk,
  'Moisturizer': Droplets,
  'Sunscreen': Sun,
  'Serum': Pipette,
  'Exfoliant': Sparkles,
  'Spot treatment': DiamondPlus, // Using Diamond since DiamondPlus isn't available
  'Other': Layers,
};

// Material icon mapping for skin concerns
const MATERIAL_SKIN_CONCERNS_ICON_MAP: { [key: string]: any } = {
  'Clear breakouts': HeartPlus,
  'Fade dark spots': Dice5,
  'Calm redness': ShieldPlus,
  'Smooth texture': LayoutGrid,
  'Hydrate/glow': Droplets,
  'Anti-aging': TimerReset,
  'Balance oil': Scale,
  'Explore skincare': Search,
};

// Material icon mapping for restful sleep frequency
const MATERIAL_RESTFUL_SLEEP_ICON_MAP: { [key: string]: any } = {
  '5-7': GripVertical,
  '3-4': EllipsisVertical,
  '1-2': Dot,
  'Rarely/Never': HeartCrack,
};

// Material icon mapping for main daily exposure
const MATERIAL_DAILY_EXPOSURE_ICON_MAP: { [key: string]: any } = {
  'Indoors (A/C, heat)': AirVent,
  'City/Pollution': Building2,
  'Outdoors/Sun': Sun,
  'Mixed': Blend,
};

// Material icon mapping for post-cleanse skin feel
const MATERIAL_POST_CLEANSE_SKIN_FEEL_ICON_MAP: { [key: string]: any } = {
  'Tight/Dry': Leaf,
  'Normal': Diamond,
  'Oily': Waves,
  'Mixed/Combo': Blend,
};

// Material icon mapping for skin sensitivity
const MATERIAL_SKIN_SENSITIVITY_ICON_MAP: { [key: string]: any } = {
  'Not sensitive at all': ShieldPlus,
  'Slightly sensitive': ShieldMinus,
  'Moderately sensitive': ShieldAlert,
  'Very sensitive': ShieldOff,
};

// Helper function to calculate target progress percentage
const calculateTargetProgress = (currentQuestionIndex: number, totalQuestions: number): number => {
  if (totalQuestions <= 0) return 0; // Should not happen

  if (totalQuestions === 1) {
    // If only one question, show progress like it's the first step, or a mid-point
    return MIN_PROGRESS_PERCENT; 
  }

  // Ensure index is within bounds for calculation logic
  const boundedIndex = Math.max(0, Math.min(currentQuestionIndex, totalQuestions - 1));

  const progressRange = MAX_PROGRESS_PERCENT_BEFORE_SUBMIT - MIN_PROGRESS_PERCENT;
  const totalSteps = totalQuestions - 1; // N-1 intervals from first to last question

  if (totalSteps === 0) { // Should be covered by totalQuestions === 1, but defensive
      return MIN_PROGRESS_PERCENT;
  }

  const calculatedProgress = MIN_PROGRESS_PERCENT + (boundedIndex / totalSteps) * progressRange;
  return calculatedProgress;
};

// NEW: Icon for options (example)
// import { Feather } from '@expo/vector-icons'; 

// Constants for AsyncStorage keys
const QUESTIONNAIRE_ANSWERS_KEY = 'questionnaire_answers';
const QUESTIONNAIRE_PROGRESS_KEY = 'questionnaire_progress';

// In-memory session storage for questionnaire data (clears on app restart/reload) - MOVED to questionnaireCache.ts

// Functions for session-based questionnaire caching (in-memory only) - MOVED to questionnaireCache.ts

// Component for radio button selection
const RadioOption = React.memo(({
  label,
  selected,
  onSelect,
  isNewStyle,
  itemIndex,
  totalItems,
  iconName,
  customIconColor,
  imageSource,
  currentQuestionIndex,
  iconSize
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  isNewStyle?: boolean;
  itemIndex: number;
  totalItems: number;
  iconName?: any;
  customIconColor?: string;
  imageSource?: ImageSourcePropType;
  currentQuestionIndex?: number;
  iconSize?: number;
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const selectionAnim = React.useRef(new Animated.Value(selected ? 1 : 0)).current;
  
  // Create entry animation values
  const entryOpacity = React.useRef(new Animated.Value(0)).current;
  const entryScale = React.useRef(new Animated.Value(0.9)).current;
  
  // Run entry animation when component mounts OR when question changes
  useEffect(() => {
    // If it's the first question OR if we want no intro animations, don't animate.
    if (currentQuestionIndex === 0) {
        entryOpacity.setValue(1);
        entryScale.setValue(1);
        return;
    }
    
    // Reset animation values
    entryOpacity.setValue(0);
    entryScale.setValue(0.9);
    
    // Staggered animation based on item index with minimal delays
    const delay = 20 + (itemIndex * 25); // Reduced delays significantly
    
    Animated.parallel([
      Animated.timing(entryOpacity, {
        toValue: 1,
        duration: 250, // Reduced duration
        delay: delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      }),
      Animated.timing(entryScale, {
        toValue: 1,
        duration: 250, // Reduced duration
        delay: delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      })
    ]).start();
  }, [itemIndex, currentQuestionIndex]);

  useEffect(() => {
    Animated.timing(selectionAnim, {
      toValue: selected ? 1 : 0,
      duration: 100, 
      useNativeDriver: false, 
    }).start();
  }, [selected, selectionAnim]);

  const MemoIcon = React.useMemo(() => {
    if (imageSource) {
      return (
        <Image 
          source={imageSource} 
          style={styles.logoImage} 
          fadeDuration={0}
          resizeMode="contain"
        />
      );
    }
    if (iconName) {
      // Render the appropriate Lucide icon based on the name with consistent styling
      const IconComponent = iconName;
      return <IconComponent 
        size={iconSize || 24} 
        color={customIconColor || "#000000"} 
        strokeWidth={1.5} 
      />;
    }
    return null;
  }, [imageSource, iconName, customIconColor, iconSize]);

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.96,
      duration: 60, // Reduced duration for faster scale down
      useNativeDriver: true,
    }).start();
  };
  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 80, // Reduced duration for faster scale up
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!selected) {
      onSelect();
    }
  };

  if (isNewStyle) {
    // Ensure values are safe - handle edge cases
    const safeItemIndex = itemIndex || 0;
    const safeTotalItems = totalItems || 1;
    const gradientLocations = [0, Math.min(1, (safeItemIndex + 2) / (safeTotalItems + 1))] as const;

    const iconElement = imageSource || iconName ? (
      <View style={styles.iconCircleWrapper}>
        {MemoIcon}
      </View>
    ) : null;

    const animatedTextColor = selectionAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['#000000', '#FFFFFF'], 
    });
    
    // Define styles in a safe way that can't produce text nodes
    const contentContainerStyle: Array<any> = [
      styles.newOptionButtonContent, 
      { backgroundColor: 'transparent' },
      { minHeight: 44 } // Use a fixed safe value instead of the potentially undefined reference
    ];
    
    // Use a simplified approach to add padding
    if (iconElement) {
        contentContainerStyle.push({ paddingVertical: 16 });
    } else {
        // Options without icons need extra padding to match the height of options with icons
        // Icon wrapper is 44px, text is ~20px, so we need extra padding to compensate
        contentContainerStyle.push({ paddingVertical: 28 });
    }

    return (
      <TouchableOpacity
        style={{ width: '100%', backgroundColor: 'transparent' }}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Animated.View 
          style={[
            styles.animatedButtonShell, 
            { 
              transform: [
                { scale: scaleAnim },
                { scale: entryScale } // Use the entry animation scale
              ],
              opacity: entryOpacity // Use the entry animation opacity
            }
          ]}
        >
          <LinearGradient
            colors={UNSELECTED_OPTION_GRADIENT_COLORS}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill} 
            locations={gradientLocations}
          />
          <Animated.View
            style={[
              StyleSheet.absoluteFill, 
              {
                backgroundColor: '#000000',
                opacity: selectionAnim, 
              }
            ]}
          />
          <View style={contentContainerStyle}>
            {iconElement}
            <Animated.Text style={[
              styles.newOptionButtonText, 
              { color: animatedTextColor }  
            ]}>
              {typeof label === 'string' ? label : 'Option'}
            </Animated.Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  // Old style fallback
  return (
    <TouchableOpacity
      style={styles.radioContainer}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View style={{ flexDirection: 'row', alignItems: 'center', transform: [{ scale: scaleAnim }] }}>
        <View style={[styles.radioButton, selected && styles.radioButtonSelected]}>
          {selected && <View style={styles.radioButtonInner} />}
        </View>
        {iconName && (
          <View style={{ marginRight: 8 }}>
            {/* Use Lucide icons for old style too with consistent styling */}
            {React.createElement(iconName, {
              size: 24,
              color: customIconColor || "#333333",
              strokeWidth: 1.5
            })}
          </View>
        )}
        <Text style={styles.radioLabel}>{typeof label === 'string' ? label : 'Option'}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
});

// Component for checkbox selection
const CheckboxOption = React.memo(({
  label,
  selected,
  onToggle,
  isNewStyle,
  itemIndex,
  totalItems,
  iconName, // New prop
  customIconColor, // New prop
  imageSource, // New prop
  currentQuestionIndex,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
  isNewStyle?: boolean;
  itemIndex: number;
  totalItems: number;
  iconName?: any; // Updated type
  customIconColor?: string; // New type
  imageSource?: ImageSourcePropType; // New type
  currentQuestionIndex?: number;
}) => {
  // --- Animated scale for press feedback (similar to RadioOption) ---
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const selectionAnim = React.useRef(new Animated.Value(selected ? 1 : 0)).current;
  
  // Create entry animation values
  const entryOpacity = React.useRef(new Animated.Value(0)).current;
  const entryScale = React.useRef(new Animated.Value(0.9)).current;
  
  // Run entry animation when component mounts
  useEffect(() => {
    if (currentQuestionIndex === 0) {
        entryOpacity.setValue(1);
        entryScale.setValue(1);
        return;
    }
    // Staggered animation based on item index
    const delay = 100 + (itemIndex * 70); // Longer delay for more visible effect
    
    Animated.parallel([
      Animated.timing(entryOpacity, {
        toValue: 1,
        duration: 400,
        delay: delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      }),
      Animated.timing(entryScale, {
        toValue: 1,
        duration: 400,
        delay: delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      })
    ]).start();
  }, [currentQuestionIndex]);

  useEffect(() => {
    Animated.timing(selectionAnim, {
      toValue: selected ? 1 : 0,
      duration: 100,
      useNativeDriver: false,
    }).start();
  }, [selected, selectionAnim]);

  const MemoIcon = React.useMemo(() => {
    if (imageSource) {
      return (
        <Image 
          source={imageSource} 
          style={styles.logoImage} 
          fadeDuration={0}
          resizeMode="contain"
        />
      );
    }
    if (iconName) {
      // Render the appropriate Lucide icon with consistent styling
      const IconComponent = iconName;
      return <IconComponent 
        size={24} 
        color={customIconColor || "#000000"} 
        strokeWidth={1.5} 
      />;
    }
    return null;
  }, [imageSource, iconName, customIconColor]);

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.96,
      duration: 60,
      useNativeDriver: true,
    }).start();
  };
  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 80,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // For checkbox, onToggle directly handles selection state
    onToggle(); 
  };

  if (isNewStyle) {
    // Safety first: ensure all values are defined
    const safeItemIndex = itemIndex || 0;
    const safeTotalItems = totalItems || 1;
    const gradientLocations = [0, Math.min(1, (safeItemIndex + 2) / (safeTotalItems + 1))] as const;

    const iconElement = imageSource || iconName ? (
      <View style={styles.iconCircleWrapper}>
        {MemoIcon}
      </View>
    ) : null;

    const animatedTextColor = selectionAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['#000000', '#FFFFFF'],
    });

    // Consistent content container style with safe values
    const contentContainerStyle: Array<any> = [
      styles.newOptionButtonContent, 
      { backgroundColor: 'transparent' },
      { minHeight: 44 } // Fixed safe value
    ];
    
    if (iconElement) {
      contentContainerStyle.push({ paddingVertical: 16 });
    }

    return (
      <TouchableOpacity
        style={{ width: '100%', backgroundColor: 'transparent' }}
        onPress={handlePress} // Use the new handlePress
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1} // No flash
      >
        <Animated.View 
          style={[
            styles.animatedButtonShell, 
            { 
              transform: [
                { scale: scaleAnim },
                { scale: entryScale } // Use the entry animation scale
              ],
              opacity: entryOpacity // Use the entry animation opacity
            }
          ]}
        >
          {/* Layer 1: Unselected Background (Gradient) */}
          <LinearGradient
            colors={UNSELECTED_OPTION_GRADIENT_COLORS}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
            locations={gradientLocations}
          />
          {/* Layer 2: Selected Background (Black) - animated opacity */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: '#000000',
                opacity: selectionAnim,
              }
            ]}
          />
          {/* Layer 3: Content (Icon + Text) */}
          <View style={contentContainerStyle}>
            {iconElement}
            <Animated.Text style={[
              styles.newOptionButtonText,
              { color: animatedTextColor }
            ]}>
              {typeof label === 'string' ? label : 'Option'}
            </Animated.Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  // Old style fallback for CheckboxOption
  return (
    <TouchableOpacity
      style={styles.checkboxContainer}
      onPress={onToggle} // Old style doesn't have the new animation interaction
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected && <Check size={16} color="#fff" fill="#fff" strokeWidth={2} />}
      </View>
      <Text style={styles.checkboxLabel}>{typeof label === 'string' ? label : 'Option'}</Text>
    </TouchableOpacity>
  );
});

// --- Conditional Slider Component ---
const ConditionalSliderComponent = ({ 
  config, 
  value, 
  onValueChange 
}: {
  config: ConditionalSliderConfig;
  value: number | undefined;
  onValueChange: (newValue: number) => void;
}) => {
  const displayValue = config.type === 'categorical' && config.valueLabels && value !== undefined
    ? config.valueLabels[value]
    : `${value ?? '-'}${config.unit ? ` ${config.unit}` : ''}`;

  return (
    <View style={styles.conditionalSliderContainer}>
      <Text style={styles.conditionalSliderLabel}>{config.label}</Text>
      <Slider
        style={styles.sliderControlFullWidth} // Style updated below
        minimumValue={config.min}
        maximumValue={config.max}
        step={config.step}
        value={value ?? config.min} // Default to min if undefined
        onValueChange={onValueChange}
        minimumTrackTintColor="#000000"
        maximumTrackTintColor="#D0D0D0"
        thumbTintColor="#000000"
      />
      <Text style={styles.sliderValueText}>{displayValue}</Text> 
      {/* Value text is now below the slider */}
    </View>
  );
};
// --- End Conditional Slider Component ---

// Interface for curve point calculations
interface PointCoordinates {
  x: number;
  y: number;
}

interface CurveCalculationResult {
  pathData: string;
  filledPathData: string; // New field for the filled path
  dot1Position: PointCoordinates;
  dot2Position: PointCoordinates;
  dot3Position: PointCoordinates;
}

// Add a helper function for an increasing cubic curve (growth)
const calculateGrowthCurveAndPoints = (): CurveCalculationResult => {
  // Using a cubic-like curve that resembles S-shape (slow-fast-slow)
  const containerWidth = 300; // Width of the SVG container
  
  // Determine dot diameter for positioning calculations
  const dotDiameter = 40; // Width/height of dots in pixels
  const dotRadius = dotDiameter / 2;
  
  // Define margins to ensure equal spacing on both sides
  const leftMargin = 36; // Increased from 30 to move curve right
  const rightMargin = 24; // Decreased right margin to balance
  
  // Calculate line width based on container width minus margins
  const lineWidth = containerWidth - (leftMargin + rightMargin);
  
  // Start and end X positions with adjusted margins
  const startX = leftMargin;
  const endX = containerWidth - rightMargin;
  
  // Add 4px to the endpoint so the path extends a bit further
  const extendedEndX = endX + 4;
  
  const height = 145; // Total height for the curve
  const baseY = 220; // Moved down by additional 20px (from 200 to 220)
  
  // Number of points to generate for smooth curve
  const numPoints = 30;
  const xRange = extendedEndX - startX; // Use extended end point
  
  let pathPoints = [];
  pathPoints.push(`M${startX},${baseY}`); // Start point
  
  // Create objects to store dot positions
  const dot1Position: PointCoordinates = { x: 0, y: 0 };
  const dot2Position: PointCoordinates = { x: 0, y: 0 };
  const dot3Position: PointCoordinates = { x: 0, y: 0 };
  
  // Calculate the exact curve points at desired percentages using cubic function
  const calculatePointAtPercentage = (percentage: number): PointCoordinates => {
    const t = percentage;
    const x = startX + t * xRange;
    
    // Further shift the curve for more flatness at beginning and end
    const shiftedT = Math.pow(t, 0.65);
    
    // Enhanced cubic function with same bowing but using shifted t value
    const cubicFactor = -2 * Math.pow(shiftedT, 3) + 3 * Math.pow(shiftedT, 2);
    
    // Increase bowing power for steeper middle section
    const enhancedFactor = Math.pow(cubicFactor, 2.7);
    
    // Calculate y position (invert because SVG y-axis points down)
    const y = baseY - (height * enhancedFactor);
    
    return { x, y };
  };
  
  // Generate points using cubic function
  for (let i = 1; i <= numPoints; i++) {
    const t = i / numPoints;
    const point = calculatePointAtPercentage(t);
    pathPoints.push(`L${point.x},${point.y}`);
  }
  
  // Calculate exact points for dots at precise percentages
  const point1Percent = 0.0; // Put first dot exactly at the start of the line
  const point3Percent = 1.0; // Put third dot exactly at the end of the line 
  const point2Percent = 0.55; // Keep second point at 55% along the line
  
  Object.assign(dot1Position, calculatePointAtPercentage(point1Percent));
  Object.assign(dot2Position, calculatePointAtPercentage(point2Percent));
  Object.assign(dot3Position, calculatePointAtPercentage(point3Percent));
  
  // Create a filled path for the area under the curve (integral effect)
  let filledPathPoints = [];
  
  // Start with a vertical line down from the first point
  const firstPointY = baseY; // Starting point's Y coordinate
  // Calculate the position of the x-axis in absolute terms
  const xAxisPositionY = 260; // Set to 260 to stop at the x-axis
  
  // Move starting point slightly to the left
  const extendedStartX = startX - 3;
  
  filledPathPoints.push(`M${extendedStartX},${firstPointY}`); // Start at the initial point
  filledPathPoints.push(`L${extendedStartX},${xAxisPositionY}`); // Draw straight down to x-axis level
  
  // Now add the bottom horizontal line to connect with the ending point
  filledPathPoints.push(`L${extendedEndX},${xAxisPositionY}`); // Bottom right, using extended end
  
  // Now go up to the end of the curve, maintaining vertical alignment with the bottom corner
  filledPathPoints.push(`L${extendedEndX},${dot3Position.y}`); // Go up to the end of curve
  
  // Now add the actual curve path in reverse
  const reversedCurvePoints = [...pathPoints];
  reversedCurvePoints.shift(); // Remove the first M command
  // Reverse the points and add them
  for (let i = reversedCurvePoints.length - 1; i >= 0; i--) {
    // Extract coordinates from the L commands
    const point = reversedCurvePoints[i];
    const pointMatch = point.match(/L([\d.]+),([\d.]+)/);
    if (pointMatch) {
      const x = parseFloat(pointMatch[1]);
      const y = parseFloat(pointMatch[2]);
      filledPathPoints.push(`L${x},${y}`); // Add each point in reverse
    }
  }
  
  filledPathPoints.push('Z'); // Close the path
  
  return {
    pathData: pathPoints.join(' '),
    filledPathData: filledPathPoints.join(' '), // Add the filled path data
    dot1Position,
    dot2Position,
    dot3Position
  };
};

// Add a helper function for a decreasing cubic curve (decay)
const calculateDecayCurveAndPoints = (): CurveCalculationResult => {
  // Using a cubic-like curve that resembles inverted S-shape (slow-fast-slow)
  const containerWidth = 300; // Width of the SVG container
  
  // Determine dot diameter for positioning calculations
  const dotDiameter = 40; // Width/height of dots in pixels
  const dotRadius = dotDiameter / 2;
  
  // Define margins to ensure equal spacing on both sides
  const leftMargin = 36; // Increased from 30 to move curve right
  const rightMargin = 24; // Decreased right margin to balance
  
  // Calculate line width based on container width minus margins
  const lineWidth = containerWidth - (leftMargin + rightMargin);
  
  // Start and end X positions with adjusted margins
  const startX = leftMargin;
  const endX = containerWidth - rightMargin;
  
  // Add 4px to the endpoint so the path extends a bit further
  const extendedEndX = endX + 4;
  
  const height = 145; // Total height for the curve
  const baseY = 220; // Moved down by additional 20px (from 200 to 220)
  
  // Number of points to generate for smooth curve
  const numPoints = 30;
  const xRange = extendedEndX - startX; // Use extended end point
  
  let pathPoints = [];
  // Start at high position for decay curve
  pathPoints.push(`M${startX},${baseY - height * 0.9}`); // Start point - start high
  
  // Create objects to store dot positions
  const dot1Position: PointCoordinates = { x: 0, y: 0 };
  const dot2Position: PointCoordinates = { x: 0, y: 0 };
  const dot3Position: PointCoordinates = { x: 0, y: 0 };
  
  // Calculate the exact curve points at desired percentages using cubic function
  const calculatePointAtPercentage = (percentage: number): PointCoordinates => {
    const t = percentage;
    const x = startX + t * xRange;
    
    // Shift the t-value to create more flatness at start and less at end
    const shiftedT = Math.pow(t, 1.4);
    
    // Enhanced cubic function for decay with more pronounced bowing
    // Base cubic function: 2t³ - 3t² + 1
    const cubicFactor = 2 * Math.pow(shiftedT, 3) - 3 * Math.pow(shiftedT, 2) + 1;
    
    // Slightly reduce bowing power for the decay curve (2.7 -> 2.5)
    const enhancedFactor = Math.pow(cubicFactor, 2.5);
    
    // Calculate y position (invert because SVG y-axis points down)
    // Start high, end low
    const y = baseY - (height * 0.9 * enhancedFactor);
    
    return { x, y };
  };
  
  // Generate points using cubic function
  for (let i = 1; i <= numPoints; i++) {
    const t = i / numPoints;
    const point = calculatePointAtPercentage(t);
    pathPoints.push(`L${point.x},${point.y}`);
  }
  
  // Calculate exact points for dots at precise percentages
  const point1Percent = 0.0; // Put first dot exactly at the start of the line
  const point3Percent = 1.0; // Put third dot exactly at the end of the line 
  const point2Percent = 0.55; // Keep second point at 55% along the line
  
  Object.assign(dot1Position, calculatePointAtPercentage(point1Percent));
  Object.assign(dot2Position, calculatePointAtPercentage(point2Percent));
  Object.assign(dot3Position, calculatePointAtPercentage(point3Percent));
  
  // Create a filled path for the area under the curve (integral effect)
  let filledPathPoints = [];
  
  // Start with a vertical line down from the first point
  const firstPointY = dot1Position.y; // Starting point's Y coordinate (now higher)
  // Calculate the position of the x-axis in absolute terms
  const xAxisPositionY = 260; // Set to 260 to stop at the x-axis
  
  // Move starting point 3px to the left
  const extendedStartX = startX - 3;
  
  filledPathPoints.push(`M${extendedStartX},${firstPointY}`); // Start at the initial point
  filledPathPoints.push(`L${extendedStartX},${xAxisPositionY}`); // Draw straight down to x-axis level
  
  // Now add the bottom horizontal line to connect with the ending point
  filledPathPoints.push(`L${extendedEndX},${xAxisPositionY}`); // Bottom right, using extended end
  
  // Now go up to the end of the curve, maintaining vertical alignment with the bottom corner
  filledPathPoints.push(`L${extendedEndX},${dot3Position.y}`); // Go up to the end of curve
  
  // Now add the actual curve path in reverse
  const reversedCurvePoints = [...pathPoints];
  reversedCurvePoints.shift(); // Remove the first M command
  // Reverse the points and add them
  for (let i = reversedCurvePoints.length - 1; i >= 0; i--) {
    // Extract coordinates from the L commands
    const point = reversedCurvePoints[i];
    const pointMatch = point.match(/L([\d.]+),([\d.]+)/);
    if (pointMatch) {
      const x = parseFloat(pointMatch[1]);
      const y = parseFloat(pointMatch[2]);
      filledPathPoints.push(`L${x},${y}`); // Add each point in reverse
    }
  }
  
  filledPathPoints.push('Z'); // Close the path
  
  return {
    pathData: pathPoints.join(' '),
    filledPathData: filledPathPoints.join(' '), // Add the filled path data
    dot1Position,
    dot2Position,
    dot3Position
  };
};

// Function to just return the path data (for backward compatibility)
const createExponentialPath = (): string => {
  return calculateGrowthCurveAndPoints().pathData;
};

// Define smallDotStyle for smaller dots in the graph
const smallDotStyle = {
  width: 20,
  height: 20,
  borderRadius: 10,
  borderWidth: 2,
};

// Notification Permission Dialog with animations
const NotificationPermissionDialog = ({ onContinue, questionId, onPermissionResult }: { onContinue: () => void; questionId?: string; onPermissionResult: (granted: boolean) => void; }) => {
  // Animation values
  const entryAnim = useRef(new Animated.Value(0)).current;
  const gradientRotationAnim = useRef(new Animated.Value(0)).current;
  
  // Keep track of ongoing animations to properly stop them
  const entryAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const gradientAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  
  // Check if this is the location permission slide
  const isLocationSlide = questionId === 'notification_permission';
  
  useEffect(() => {
    // Stop any ongoing animations first
    if (entryAnimationRef.current) {
      entryAnimationRef.current.stop();
      entryAnimationRef.current = null;
    }
    if (gradientAnimationRef.current) {
      gradientAnimationRef.current.stop(); 
      gradientAnimationRef.current = null;
    }
    
    // Reset animations to 0 each time this component appears
    entryAnim.setValue(0);
    gradientRotationAnim.setValue(0);
    
    // Add a small delay to ensure the main screen fade-in completes first
    setTimeout(() => {
      // Sequential animations: first fade in, then animate gradient
      entryAnimationRef.current = Animated.sequence([
        // Improved fade-in with cubic bezier
        Animated.timing(entryAnim, {
          toValue: 1,
          duration: 800, // Slightly faster for better UX
          delay: 100, // Reduced delay since we already have setTimeout
          useNativeDriver: true,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
        
        // Delay before starting gradient animation
        Animated.delay(100)
      ]);
      
      entryAnimationRef.current.start(() => {
        // Start a gradient animation that rotates 180 degrees (not 360)
        gradientAnimationRef.current = Animated.loop(
          Animated.sequence([
            // Animate from 0 to 0.5 (180 degrees)
            Animated.timing(gradientRotationAnim, {
              toValue: 0.5, 
              duration: 8000, // 8 seconds for half rotation
              useNativeDriver: false,
              easing: Easing.linear, // Use linear for smoother gradient movement
            }),
            // Animate back from 0.5 to 0
            Animated.timing(gradientRotationAnim, {
              toValue: 0,
              duration: 8000, // 8 seconds for return
              useNativeDriver: false,
              easing: Easing.linear, // Use linear for smoother gradient movement
            })
          ])
        );
        
        gradientAnimationRef.current.start();
      });
    }, 100); // Small delay to let main screen animation complete
    
    return () => {
      // Cleanup animations on unmount or questionId change
      if (entryAnimationRef.current) {
        entryAnimationRef.current.stop();
      }
      if (gradientAnimationRef.current) {
        gradientAnimationRef.current.stop();
      }
    };
  }, [questionId]); // Add questionId as dependency to restart animation when question changes
  
  // Simplify gradient animation to just move horizontally with limited rotation
  const gradientStart = {
    x: gradientRotationAnim.interpolate({
      inputRange: [0, 0.5],
      outputRange: [0, 1] // Simple left to right for half rotation
    }),
    y: 0 // Keep y fixed
  };
  
  const gradientEnd = {
    x: gradientRotationAnim.interpolate({
      inputRange: [0, 0.5],
      outputRange: [1, 0] // Simple right to left, opposite of start
    }),
    y: 1 // Keep y fixed
  };
  
  return (
    <>
      {/* Actual notification dialog */}
      <View style={isLocationSlide ? styles.notificationWrapperLocation : styles.notificationWrapper}>
        <Animated.View
          style={[
            {
              opacity: entryAnim,
              transform: [
                { scale: entryAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.85, 1.0] // More subtle scale animation
                })}
              ]
            }
          ]}
        >
          <AnimatedLinearGradient
            colors={['#FFD0D0', '#C9D7F8']} // Fixed colors, not animated
            style={[
              isLocationSlide ? styles.notificationLocationBox : styles.notificationPermissionBox
            ]}
            start={gradientStart}
            end={gradientEnd}
          >
            <Text style={[
              isLocationSlide ? styles.notificationLocationTitle : styles.notificationPermissionTitle
            ]}>
              {isLocationSlide ? 'Skinsight Would Like to Access Your Location' : 'Skinsight would like to send you notifications'}
            </Text>
            
           
            
            {/* Map placeholder area for location slide */}
            {isLocationSlide && (
              <View style={styles.mapPlaceholderContainer}>
                <Image 
                  source={LOCATION_MAP_IMAGE}
                  style={styles.mapImage}
                  resizeMode="contain" // Changed from "cover" to "contain"
                  onError={(error) => logger.error('Image load error:', error)}
                  onLoad={() => logger.debug('Image loaded successfully')}
                />
              </View>
            )}
            
            {/* Different button layouts for location vs notification */}
            {isLocationSlide ? (
              // Location permission: 2 horizontal buttons
              <View style={styles.notificationButtonContainer}>
                <TouchableOpacity 
                  style={styles.notificationDontAllowButton} 
                  onPress={() => {
                    onPermissionResult(false);
                    onContinue();
                  }}
                >
                  <Text style={styles.notificationDontAllowText}>Don't Allow</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.notificationAllowButton} 
                  onPress={async () => {
                    try {
                      if (isLocationSlide) {
                        logger.debug('Requesting location permission...');
                        const { status } = await Location.requestForegroundPermissionsAsync();
                        const granted = status === 'granted';
                        onPermissionResult(granted);
                        logger.debug('Location permission status:', status);
                        if (status === 'granted') {
                          logger.debug('Location permission granted by user.');
                        } else {
                          logger.debug('Location permission denied by user.');
                        }
                      } else {
                        const { status } = await Notifications.requestPermissionsAsync();
                        const granted = status === 'granted';
                        onPermissionResult(granted);
                        if (status === 'granted') {
                          logger.debug('Notification permission granted');
                        }
                      }
                    } catch (error) {
                      logger.debug('Error requesting permission:', error);
                      onPermissionResult(false);
                    }
                    onContinue();
                  }}
                >
                  <Text style={styles.notificationAllowText}>Allow</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Notification permission: 2 horizontal buttons
              <View style={styles.notificationButtonContainer}>
                <TouchableOpacity 
                  style={styles.notificationDontAllowButton} 
                  onPress={() => {
                    onPermissionResult(false);
                    onContinue();
                  }}
                >
                  <Text style={styles.notificationDontAllowText}>Don't Allow</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.notificationAllowButton} 
                  onPress={async () => {
                    try {
                      if (isLocationSlide) {
                        // This case should ideally not be reached if the logic is correct,
                        // but as a fallback, request location permissions.
                        logger.debug('Requesting location permission (fallback)...');
                        const { status } = await Location.requestForegroundPermissionsAsync();
                        const granted = status === 'granted';
                        onPermissionResult(granted);
                        logger.debug('Location permission status (fallback):', status);
                      } else {
                        const { status } = await Notifications.requestPermissionsAsync();
                        const granted = status === 'granted';
                        onPermissionResult(granted);
                        if (status === 'granted') {
                          logger.debug('Notification permission granted');
                        }
                      }
                    } catch (error) {
                      logger.debug('Error requesting permission:', error);
                      onPermissionResult(false);
                    }
                    onContinue();
                  }}
                >
                  <Text style={styles.notificationAllowText}>Allow</Text>
                </TouchableOpacity>
              </View>
            )}
          </AnimatedLinearGradient>
        </Animated.View>
      </View>
    </>
  );
};

// Floating Label Input component
const FloatingLabelInput = ({ 
  label, 
  value, 
  onChangeText, 
  colors 
}: { 
  label: string; 
  value: string; 
  onChangeText: (text: string) => void; 
  colors: readonly [string, string];
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedIsFocused = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedIsFocused, {
      toValue: (isFocused || value) ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [animatedIsFocused, isFocused, value]);

  const labelStyle = {
    position: 'absolute' as const,
    left: 20,
    top: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [25, 10]  // Moved down 2px from previous value of 6
    }),
    fontSize: 16, // Keep font size constant
    color: 'rgba(0, 0, 0, 0.5)', // Keep consistent color for placeholder/label
  };

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={styles.floatingInputGradient}
    >
      <Animated.Text style={[styles.floatingInputLabel, labelStyle]}>
        {label}
      </Animated.Text>
      <TextInput
        style={[
          styles.floatingInput,
          { 
            paddingTop: 30, // Reduced slightly for better vertical centering with larger font
            fontSize: 19 // Matching the base fontSize from style
          }
        ]}
        value={value}
        onChangeText={(text) => onChangeText(text.toUpperCase())} // Auto convert to uppercase
        autoCapitalize="characters" // Also helps with auto capitalization
        autoCorrect={false} // Disable autocorrect
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholderTextColor="transparent"
      />
    </LinearGradient>
  );
};

// Main ProgressIndicator component that selects the appropriate graph type based on selection
const ProgressIndicator = ({ answers, currentQuestionIndex }: { answers: any, currentQuestionIndex: number }) => {
  // Use a fixed timeframe of "3-5 weeks" instead of calculating a dynamic one
  const timeframe = "3-5 weeks";
  
  // Determine which type of graph to show based on the user's skin concern selection
  // Now skin_concerns is a single string value from radio button, not an array
  const userPrimaryConcern = answers?.skin_concerns || '';
  
  // Determine which graph type to use and the appropriate title
  const [graphType, graphTitle] = (() => {
    // Default to increasing (growth) graph with general title
    let type = 'growth';
    let title = 'Skin Health';
    
    // Check for specific concerns that should show a decreasing graph
    if (userPrimaryConcern) {
      if (userPrimaryConcern.toLowerCase().includes('breakout') || 
          userPrimaryConcern.toLowerCase().includes('acne')) {
        return ['decay', 'Breakouts'];
      } else if (userPrimaryConcern.toLowerCase().includes('redness')) {
        return ['decay', 'Redness'];
      } else if (userPrimaryConcern.toLowerCase().includes('oil')) {
        return ['decay', 'Excess Oil'];
      } else if (userPrimaryConcern.toLowerCase().includes('dark') || 
                 userPrimaryConcern.toLowerCase().includes('spot')) {
        return ['decay', 'Dark Spots'];
      } else if (userPrimaryConcern.toLowerCase().includes('texture')) {
        return ['decay', 'Skin Texture'];
      } else if (userPrimaryConcern.toLowerCase().includes('hydrate') || 
                 userPrimaryConcern.toLowerCase().includes('glow')) {
        return ['growth', 'Skin Hydration'];
      } else if (userPrimaryConcern.toLowerCase().includes('aging')) {
        return ['decay', 'Fine Lines'];
      }
    }
    
    return [type, title];
  })();
  
  // Calculate the appropriate curve based on the graph type
  const [curveData, setCurveData] = useState(() => 
    graphType === 'decay' ? calculateDecayCurveAndPoints() : calculateGrowthCurveAndPoints()
  );
  
  // Animation values for fade-in of the dots
  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(1)).current; // Start fully visible

  // Animation for the curve path drawing - start at 0 (invisible)
  const pathLength = useRef(new Animated.Value(0)).current;

  // Animation for dot 3 color change - separate from opacity
  const dot3ColorChange = useRef(new Animated.Value(0)).current; // 0: muted, 1: vibrant
  
  // Animation for dot 3 position - will follow the line (after curveData is defined)
  const [dot3Position, setDot3Position] = useState({ x: curveData.dot1Position.x, y: curveData.dot1Position.y });
  
  // Create interpolated values for dot 3 border color - now using gradient colors matching the line
  const dot3BorderColor = pathLength.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FFD0D0', '#B8D0FF'] // Match the line gradient, brightened the blue end
  });
  
  // Create a numerical value for the clip width (not animated value directly)
  const [clipWidth, setClipWidth] = useState(0);
  
  // Add a new animated value for vertical lines in the ProgressIndicator component
  const verticalLinesAnim = useRef(new Animated.Value(0)).current; // 0: lines not visible, 1: fully drawn
  
  // At the start of the ProgressIndicator component
  // Create a state to track the clip height for vertical lines
  const [lineClipHeight, setLineClipHeight] = useState(0);
  
  // Use effect to update dot 3 position based on animation progress and graph type
  useEffect(() => {
    // Track whether the dot 3 color change has been triggered
    let dot3ColorTriggered = false;
    
    const id = pathLength.addListener(({value}) => {
      // Calculate the exact point along the curve at the current animation progress
      if (value === 0) {
        // At the very start, place at the same position as dot 1
        setDot3Position({ x: curveData.dot1Position.x, y: curveData.dot1Position.y });
        setClipWidth(curveData.dot1Position.x); // Set clip width to exactly the dot's position
      } else {
        // Use the appropriate curve calculation based on graph type
        const t = value; // Normalized progress
        const xRange = curveData.dot3Position.x - curveData.dot1Position.x;
        
        // Calculate x position using linear interpolation
        const x = curveData.dot1Position.x + t * xRange;
        
        // Calculate y position based on the graph type
        let y: number;
        if (graphType === 'decay') {
          // For decay (decreasing) curve
          const baseY = 220;
          const height = 145;
          // Apply t-shift for decay curve to match the main curve calculation
          const shiftedT = Math.pow(t, 1.4);
          // Enhanced cubic function for decay
          const cubicFactor = 2 * Math.pow(shiftedT, 3) - 3 * Math.pow(shiftedT, 2) + 1;
          // Slightly reduce bowing power (2.7 -> 2.5)
          const enhancedFactor = Math.pow(cubicFactor, 2.5);
          y = baseY - (height * 0.9 * enhancedFactor);
        } else {
          // For growth (increasing) curve
          const baseY = 220;
          const height = 145;
          
          // Apply more extreme t-shift for growth curve to match the main curve calculation
          const shiftedT = Math.pow(t, 0.65);
          
          // Enhanced cubic function for growth
          const cubicFactor = -2 * Math.pow(shiftedT, 3) + 3 * Math.pow(shiftedT, 2);
          // Increase bowing power for steeper middle section
          const enhancedFactor = Math.pow(cubicFactor, 2.7);
          y = baseY - (height * enhancedFactor);
        }
        
        setDot3Position({ x, y });
        
        // Add a small offset to make the line appear to come from the center of the dot
        setClipWidth(x + 1); // Set clip width to slightly ahead of the dot's position
      }
      
      // Always keep dot3 fully visible when line is drawing
      dot3Opacity.setValue(1);
      
      // Color change now happens automatically through the dot3BorderColor interpolation
      // that's tied directly to pathLength
    });
    
    return () => {
      pathLength.removeListener(id);
    };
  }, [pathLength, curveData, dot3Opacity, graphType]);
  
  // Use effect to animate vertical lines
  useEffect(() => {
    if (currentQuestionIndex === 0) {
      verticalLinesAnim.setValue(1);
      setLineClipHeight(185);
      return;
    }
    // Create the animation for vertical lines
    const lineAnimation = Animated.timing(verticalLinesAnim, {
      toValue: 1,
      duration: 1200, // Slightly faster than the main curve animation
      delay: 200, // Start slightly after the dot1 appears
      useNativeDriver: true,
      easing: Easing.out(Easing.quad)
    });
    
    // Update clip height as animation progresses
    const listener = verticalLinesAnim.addListener(({value}) => {
      setLineClipHeight(value * 185); // 0 to 230px based on animation progress
    });
    
    // Start animation
    lineAnimation.start();
    
    // Clean up listener on unmount
    return () => {
      verticalLinesAnim.removeListener(listener);
    };
  }, [verticalLinesAnim, currentQuestionIndex]);
  
  // Modify the animation sequence useEffect
  useEffect(() => {
    if (currentQuestionIndex === 0) {
      dot1Opacity.setValue(1);
      pathLength.setValue(1);
      return;
    }
    // Only fade in dot 1
    Animated.timing(dot1Opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
      delay: 200,
    }).start();
    
    // Animate the curve path - from invisible to visible in left-to-right direction
    const pathAnimation = Animated.timing(pathLength, {
      toValue: 1,
      duration: 1800,
      delay: 100,
      useNativeDriver: false,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1)
    });
    
    // Add listener for haptic feedback when animation reaches week 5
    const hapticListener = pathLength.addListener(({value}) => {
      // Trigger haptic when animation is very close to complete (at week 5)
      if (value > 0.98 && value < 0.99) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Changed to light impact for a short click
      }
    });
    
    // Start animation
    pathAnimation.start();
    
    // Clean up listener when component unmounts
    return () => {
      pathLength.removeListener(hapticListener);
    };
  }, [currentQuestionIndex]);
  
  // Path gets drawn as pathLength increases from 0 to 1
  const pathTotalLength = 1000; // Approximate path length
  
  return (
    <View style={styles.progressIndicatorContainer}>
      <View style={styles.timeframeContainer}>
        <Text style={styles.timeframeText}>
          Most people like you see visible improvements in <Text style={styles.timeframeHighlight}>{timeframe}</Text>
        </Text>
        
        <View style={styles.graphDivider} />
        <Text style={styles.graphTitle}>{graphTitle}</Text>
      
        {/* Exponential Graph with Points */}
        <View style={styles.graphContainer}>
          {/* The smooth exponential curve using SVG */}
          <View style={styles.curveBackground}>
            <Svg height="300" width="400" style={[styles.svgContainer, { overflow: 'visible' }]}>
              <Defs>{/* Avoid stray text node */}
                <SvgLinearGradient id="subtleGradient" x1="0%" y1="0%" x2="100%" y2="0%"><Stop offset="0%" stopColor="#FFD0D0" /><Stop offset="100%" stopColor="#B8D0FF" /></SvgLinearGradient>
                <SvgLinearGradient id="areaGradient" x1="0%" y1="0%" x2="100%" y2="0%"><Stop offset="0%" stopColor="#FFD0D0" stopOpacity="0.25" /><Stop offset="100%" stopColor="#B8D0FF" stopOpacity="0.25" /></SvgLinearGradient>
                <SvgLinearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset="0%" stopColor="#8B9CB3" stopOpacity="0" /><Stop offset="30%" stopColor="#8B9CB3" stopOpacity="0.7" /><Stop offset="100%" stopColor="#8B9CB3" stopOpacity="0.7" /></SvgLinearGradient>
                <ClipPath id="clip"><Path d={`M0,0 H${clipWidth} V300 H0 Z`} /></ClipPath>
                <ClipPath id="lineClip"><Path d={`M0,${260 - lineClipHeight} H400 V260 H0 Z`} /></ClipPath>
              </Defs>
              
              {/* Filled area under the curve - now uses matching gradient */}
              <Path
                d={curveData.filledPathData}
                fill="url(#areaGradient)"
                strokeWidth="0"
                clipPath="url(#clip)"
              />
              
              {/* Path that will be drawn by the dot */}
              <Path
                d={curveData.pathData}
                stroke="url(#subtleGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                clipPath="url(#clip)"
              />
              
              {/* Vertical dotted lines for weeks - animated from bottom to top */}
              {[1, 2, 3, 4, 5].map((week) => {
                // Calculate the x position for each week
                const weekRatio = (week - 1) / 4; // 0 for week 1, 0.25 for week 2, etc.
                let xPosition = curveData.dot1Position.x + (curveData.dot3Position.x - curveData.dot1Position.x) * weekRatio;
                
                // Shift first line back by 5px
                if (week === 1) {
                  xPosition -= 3;
                }
                
                return (
                  <Path
                    key={`week-line-${week}`}
                    d={`M${xPosition},260 V30`}  // Full height vertical line
                    stroke="url(#lineGradient)"
                    strokeWidth={1}
                    strokeDasharray="2,3"  // Dotted line pattern
                    opacity={0.8}
                    clipPath="url(#lineClip)" // Use the vertical line clip path for animation
                  />
                );
              })}

              {/* Horizontal dotted lines at peak and minimum y-values */}
              {(() => {
                // Peak y-value (top of the curve)
                const peakY = graphType === 'decay' ? curveData.dot1Position.y : curveData.dot3Position.y;
                // Minimum y-value (bottom of the curve or baseline)
                const minY = graphType === 'decay' ? curveData.dot3Position.y : curveData.dot1Position.y;
                
                return (
                  <>
                    {/* Peak horizontal line */}
                    <Path
                      d={`M32,${peakY} H${curveData.dot3Position.x + 10}`} // Shifted from 30 to 32
                      stroke="url(#lineGradient)"
                      strokeWidth={1}
                      strokeDasharray="2,3"
                      opacity={0.8}
                      clipPath="url(#clip)" // Follows the main curve animation
                    />
                    
                    {/* Minimum horizontal line */}
                    <Path
                      d={`M32,${minY} H${curveData.dot3Position.x + 10}`} // Shifted from 30 to 32
                      stroke="url(#lineGradient)"
                      strokeWidth={1}
                      strokeDasharray="2,3"
                      opacity={0.8}
                      clipPath="url(#clip)" // Follows the main curve animation
                    />
                  </>
                );
              })()}
            </Svg>
            
            {/* First dot (starting point) */}
            <Animated.View 
              style={[
                styles.graphPoint,
                { 
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  opacity: dot1Opacity, 
                  position: 'absolute',
                  left: curveData.dot1Position.x - 10, // Center the smaller dot (half of 20px)
                  top: curveData.dot1Position.y - 10, // Center the smaller dot (half of 20px)
                  backgroundColor: '#FFFFFF',
                  borderColor: '#FFD0D0', // Match the start of the gradient
                  shadowColor: '#FFD0D0',
                  shadowOpacity: 0.6,
                  elevation: 8,
                  zIndex: 10, // Ensure first dot is above the path
                }
              ]}
            />
            
            {/* Moving dot - travels with the line as it's drawn */}
            <Animated.View 
              style={[
                styles.graphPoint,
                {
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  opacity: dot3Opacity, 
                  position: 'absolute',
                  left: dot3Position.x - 10, // Center the smaller dot (half of 20px)
                  top: dot3Position.y - 10, // Center the smaller dot (half of 20px)
                  backgroundColor: '#FFFFFF',
                  borderColor: dot3BorderColor, // Now uses color that changes with position
                  shadowColor: dot3BorderColor, // Shadow also changes with position
                  shadowOpacity: 0.6,
                  elevation: 8,
                  zIndex: 20, // Make sure the moving dot is above everything
                }
              ]}
            />
            
            {/* X-axis line */}
            <View style={styles.xAxisLine}></View>
            
            {/* X-axis week labels - Only show weeks 1 and 5, with Week 5 always visible */}
            <View style={styles.xAxisLabelsContainer}> 
              {[1, 5].map((week) => {
                // Calculate the x position for each week
                const weekRatio = (week - 1) / 4; // 0 for week 1, 1 for week 5
                let xPosition = curveData.dot1Position.x + (curveData.dot3Position.x - curveData.dot1Position.x) * weekRatio;
                
                // Shift first label position back by 5px to match the line
                if (week === 1) {
                  xPosition -= 5;
                }
                
                // Adjust centering for each label with additional 10px left shift
                const labelOffset = (week === 1 ? 24 : 26) + 3;
                
                return (
                  <Text 
                    key={`week-label-${week}`}
                    style={[
                      styles.weekLabel, 
                      { 
                        position: 'absolute', 
                        left: xPosition - labelOffset, // Improved centering with label-specific offset + 10px left shift
                        // Week 5 label is always visible, Week 1 label follows the animation
                        opacity: week === 5 ? 1 : (xPosition <= clipWidth ? 1 : 0)
                      }
                    ]}
                  >
                    Week {week}
                  </Text>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

// --- Privacy Shield Indicator Component ---
const PrivacyShieldIndicator = ({ currentQuestionIndex }: { currentQuestionIndex: number }) => {
  // Animation values for separate elements
  const outlinePathAnim = useRef(new Animated.Value(0)).current; // For drawing the outline
  const innerPathAnim = useRef(new Animated.Value(0)).current; // For drawing the inner outline
  const fillOpacity = useRef(new Animated.Value(0)).current; // For the gradient fill
  const animatedHexStrokeWidth = useRef(new Animated.Value(0)).current; // For hexagon line drawing
  const checkmarkAnim = useRef(new Animated.Value(0)).current; // For checkmark drawing animation
  
  // REMOVED: iconAppearAnim and associated checkmark constants/interpolations

  // Path length approximation for shield
  const outerPathLength = 800; 
  const innerPathLength = 750; 
  const CHECKMARK_PATH_LENGTH = 55; // Updated for M152,153 L164,165 L188,141
  
  // REMOVED: Constants for Checkmark Icon (CHECKMARK_GREEN, radii, etc.)
  // REMOVED: Path lengths for checkmark components

  useEffect(() => {
    if (currentQuestionIndex === 0) {
        outlinePathAnim.setValue(1);
        innerPathAnim.setValue(1);
        fillOpacity.setValue(1);
        animatedHexStrokeWidth.setValue(1);
        checkmarkAnim.setValue(1);
        return;
    }

    const drawOuterOutline = Animated.timing(outlinePathAnim, { toValue: 1, duration: 500, useNativeDriver: false, easing: Easing.inOut(Easing.ease) });
    const drawInnerOutline = Animated.timing(innerPathAnim, { toValue: 1, duration: 500, useNativeDriver: false, easing: Easing.inOut(Easing.ease) });
    const fadeInMainFill = Animated.timing(fillOpacity, { toValue: 1, duration: 300, useNativeDriver: false, easing: Easing.inOut(Easing.ease) });
    const drawHexLines = Animated.timing(animatedHexStrokeWidth, { toValue: 1, duration: 500, useNativeDriver: false, easing: Easing.inOut(Easing.ease) });
    const animateCheckmark = Animated.timing(checkmarkAnim, { toValue: 1, duration: 400, delay: 200, useNativeDriver: false, easing: Easing.out(Easing.cubic) });


    // REMOVED: animateCheckmarkIcon animation timing

    Animated.sequence([
      Animated.parallel([drawOuterOutline, drawInnerOutline]),
      Animated.parallel([fadeInMainFill, drawHexLines, animateCheckmark])
      // REMOVED: delay and animateCheckmarkIcon from sequence
    ]).start(() => {
      // Haptic after shield fill/hex is done (original haptic for shield completion can be here or after outlines)
      // For now, keeping the haptic after the main shield visual is complete.
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); 
    });
    
    return () => {};
  }, [currentQuestionIndex]);
  
  const outerStrokeDashoffset = outlinePathAnim.interpolate({ inputRange: [0, 1], outputRange: [outerPathLength, 0] });
  const innerStrokeDashoffset = innerPathAnim.interpolate({ inputRange: [0, 1], outputRange: [innerPathLength, 0] });
  const checkmarkStrokeDashoffset = checkmarkAnim.interpolate({ inputRange: [0, 1], outputRange: [CHECKMARK_PATH_LENGTH, 0] });


  // REMOVED: Interpolations for checkmark icon animation

  const shieldPath = "M170,35 C190,38 230,45 280,70 C280,210 225,290 170,315 C115,290 60,210 60,70 C110,45 150,38 170,35 Z";
  const innerShieldPath = "M170,42 C188,45 225,52 270,75 C270,205 218,280 170,302 C122,280 70,205 70,75 C115,52 152,45 170,42 Z";
  
  const s = 12; 
  const hexWidth = s * Math.sqrt(3); 
  const hexActualHeight = 2 * s; 
  const verticalRowOffset = s * 1.5; 
  const patternTileWidth = hexWidth; 
  const patternTileHeight = 2 * verticalRowOffset; 
  const singleHexPathD = `M${hexWidth / 2},0 L${hexWidth},${s / 2} L${hexWidth},${s * 1.5} L${hexWidth / 2},${hexActualHeight} L0,${s * 1.5} L0,${s / 2} Z`;

  const finalOutlineStrokeWidth = 1.5; 

  return (
    <View style={[styles.privacyShieldContainer, { marginTop: -30 }]}>
      <View style={[styles.shieldAnimationContainer, { backgroundColor: 'transparent', borderWidth: 0, paddingVertical: 0 }]}>
        <Svg width="380" height="420" viewBox="0 0 340 380">
          <Defs>{/* Avoid stray text node */}
            <SvgLinearGradient id="outlineGradient" x1="0%" y1="0%" x2="100%" y2="100%"><Stop offset="0%" stopColor="#FFA8A8" stopOpacity="0.9" /><Stop offset="100%" stopColor="#A8C5FF" stopOpacity="0.9" /></SvgLinearGradient>
            <SvgLinearGradient id="fillGradient" x1="0%" y1="0%" x2="100%" y2="100%"><Stop offset="0%" stopColor="#FFD0D0" stopOpacity="0.3" /><Stop offset="100%" stopColor="#B8D0FF" stopOpacity="0.3" /></SvgLinearGradient>
            <SvgLinearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%"><Stop offset="0%" stopColor="#FFD0D0" stopOpacity="0.7" /><Stop offset="100%" stopColor="#B8D0FF" stopOpacity="0.7" /></SvgLinearGradient>
            <Pattern 
              id="staggeredSpacedHexPattern" 
              patternUnits="userSpaceOnUse" 
              width={patternTileWidth} 
              height={patternTileHeight} 
            >{/* Avoid stray text node */}<AnimatedPath d={singleHexPathD} fill="none" stroke="url(#hexGradient)" strokeWidth={animatedHexStrokeWidth} /><AnimatedPath d={singleHexPathD} transform={`translate(${hexWidth / 2}, ${verticalRowOffset})`} fill="none" stroke="url(#hexGradient)" strokeWidth={animatedHexStrokeWidth} /></Pattern>
            <ClipPath id="shieldClip"><Path d={shieldPath} /></ClipPath>
            <ClipPath id="innerAreaClip"><Path d={innerShieldPath} /></ClipPath>
          </Defs>
          
          {/* Shield Fill and Pattern */}    
          <AnimatedPath d={shieldPath} fill="url(#staggeredSpacedHexPattern)" clipPath="url(#innerAreaClip)" opacity={fillOpacity} />
          <AnimatedPath d={shieldPath} fill="url(#fillGradient)" clipPath="url(#shieldClip)" opacity={fillOpacity} />

          {/* White Circle in the Middle-Higher Part */}
          <AnimatedCircle
            cx="170" // Horizontal center of viewBox (0-340)
            cy="150" // A bit higher than the shield's vertical center (shield y-center is 175)
            r="45"   // Radius reflects user's update
            fill="white"
            opacity={fillOpacity} // Fade in with the shield fill
          />
          <AnimatedCircle
            cx="170" // Horizontal center of viewBox (0-340)
            cy="150" // A bit higher than the shield's vertical center (shield y-center is 175)
            r="45"   // Radius reflects user's update
            fill="rgba(188, 255, 230, 0.27)"
            opacity={fillOpacity} // Fade in with the shield fill
          />

          {/* Outer Green Circle Outline */}
          <AnimatedCircle
            cx="170"
            cy="150"
            r="45" // Same radius as the white circle
            fill="none" // Transparent fill
            stroke="#4CEB34" // Green color (76, 235, 52)
            strokeWidth="1"
            opacity={fillOpacity} // Fade in with the shield
          />

          {/* Inner Green Circle Outline (6px gap) */}
          <AnimatedCircle
            cx="170"
            cy="150"
            r="39" // 45 (outer radius) - 6 (gap) = 39
            fill="none" // Transparent fill
            stroke="#4CEB34" // Updated inner circle color
            strokeWidth="1"
            opacity={fillOpacity} // Fade in with the shield
          />

          {/* Animated Green Checkmark */}
          <AnimatedPath
            d="M152,153 L164,165 L188,141" // Updated path for style and centering
            stroke="#4CEB34"
            strokeWidth="9" // Increased stroke width for bolder look
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={CHECKMARK_PATH_LENGTH}
            strokeDashoffset={checkmarkStrokeDashoffset}
          />

          {/* REMOVED: Clearing Circle, Glow Circle, Checkmark Circle, Checkmark Path */}

          {/* Shield Outlines */}
          <AnimatedPath d={shieldPath} fill="none" stroke="url(#outlineGradient)" strokeWidth={finalOutlineStrokeWidth} strokeDasharray={outerPathLength} strokeDashoffset={outerStrokeDashoffset}/>
          <AnimatedPath d={innerShieldPath} fill="none" stroke="url(#outlineGradient)" strokeWidth={finalOutlineStrokeWidth} strokeDasharray={innerPathLength} strokeDashoffset={innerStrokeDashoffset}/>

        </Svg>
      </View>
    </View>
  );
};

// Create an AnimatedProductOption component to properly handle animations for skincare_products
const AnimatedProductOption = React.memo(({ 
  option, 
  index, 
  totalItems, 
  isSelected, 
  onToggle, 
  currentQuestionIndex
}: {
  option: string;
  index: number;
  totalItems: number;
  isSelected: boolean;
  onToggle: () => void;
  currentQuestionIndex: number;
}) => {
  // Animation values - matching RadioOption exactly
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const selectionAnim = React.useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const entryOpacity = React.useRef(new Animated.Value(0)).current;
  const entryScale = React.useRef(new Animated.Value(0.9)).current;
  
  // Get Material icon based on option
  const materialIconName = MATERIAL_SKINCARE_PRODUCTS_ICON_MAP[option];
  
  // Update selection animation when isSelected changes
  React.useEffect(() => {
    Animated.timing(selectionAnim, {
      toValue: isSelected ? 1 : 0,
      duration: 100, 
      useNativeDriver: false, 
    }).start();
  }, [isSelected, selectionAnim]);
  
  // Run animation when component mounts
  React.useEffect(() => {
    if (currentQuestionIndex === 0) {
        entryOpacity.setValue(1);
        entryScale.setValue(1);
        return;
    }
    const delay = 20 + (index * 25); // Reduced staggered delay for quicker appearance
    
    Animated.parallel([
      Animated.timing(entryOpacity, {
        toValue: 1,
        duration: 250, // Reduced duration
        delay: delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      }),
      Animated.timing(entryScale, {
        toValue: 1,
        duration: 250, // Reduced duration
        delay: delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      })
    ]).start();
  }, [entryOpacity, entryScale, index, currentQuestionIndex]);
  
  // Press feedback handlers - matching RadioOption exactly
  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.96,
      duration: 60,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 80,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  // Animated colors - matching RadioOption
  const animatedTextColor = selectionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#000000', '#FFFFFF'], 
  });
  
  return (
    <Animated.View 
      style={{
        width: '100%', 
        opacity: entryOpacity,
        transform: [
          { scale: scaleAnim },
          { scale: entryScale }
        ],
        backgroundColor: 'transparent'
      }}
    >
      <TouchableOpacity
        style={[styles.animatedButtonShell]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1} // No additional opacity change since we handle it manually
      >
        <LinearGradient
          colors={UNSELECTED_OPTION_GRADIENT_COLORS}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
          locations={[0, Math.min(1, (index + 2) / (totalItems + 1))]}
        />
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: '#000000',
              opacity: selectionAnim,
            }
          ]}
        />
        <View style={[styles.newOptionButtonContent, materialIconName ? { paddingVertical: 16 } : {}]}>
          {materialIconName && (
            <View style={styles.iconCircleWrapper}>
              {React.createElement(materialIconName, {
                size: 24,
                color: "#000000", // Always black regardless of selection
                strokeWidth: 1.5
              })}
            </View>
          )}
          <Animated.Text style={[
            styles.newOptionButtonText,
            { color: animatedTextColor }
          ]}>
            {option}
          </Animated.Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// Create an AnimatedConcernOption component to properly handle animations for skin_concerns
const AnimatedConcernOption = React.memo(({ 
  option, 
  index, 
  totalItems, 
  isSelected, 
  onSelect, 
  currentQuestionIndex
}: {
  option: string;
  index: number;
  totalItems: number;
  isSelected: boolean;
  onSelect: () => void;
  currentQuestionIndex: number;
}) => {
  // Animation values - matching RadioOption exactly
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const selectionAnim = React.useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const entryOpacity = React.useRef(new Animated.Value(0)).current;
  const entryScale = React.useRef(new Animated.Value(0.9)).current;
  
  // Get Material icon based on option
  const materialIconName = MATERIAL_SKIN_CONCERNS_ICON_MAP[option];
  
  // Update selection animation when isSelected changes
  React.useEffect(() => {
    Animated.timing(selectionAnim, {
      toValue: isSelected ? 1 : 0,
      duration: 100, 
      useNativeDriver: false, 
    }).start();
  }, [isSelected, selectionAnim]);
  
  // Run animation when component mounts
  React.useEffect(() => {
    if (currentQuestionIndex === 0) {
        entryOpacity.setValue(1);
        entryScale.setValue(1);
        return;
    }
    const delay = 20 + (index * 25); // Reduced staggered delay for quicker appearance
    
    Animated.parallel([
      Animated.timing(entryOpacity, {
        toValue: 1,
        duration: 250, // Reduced duration
        delay: delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      }),
      Animated.timing(entryScale, {
        toValue: 1,
        duration: 250, // Reduced duration
        delay: delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      })
    ]).start();
  }, [entryOpacity, entryScale, index, currentQuestionIndex]);
  
  // Press feedback handlers - matching RadioOption exactly
  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.96,
      duration: 60,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 80,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect();
  };

  // Animated colors - matching RadioOption
  const animatedTextColor = selectionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#000000', '#FFFFFF'], 
  });
  
  return (
    <Animated.View 
      style={{
        width: '100%', 
        opacity: entryOpacity,
        transform: [
          { scale: scaleAnim },
          { scale: entryScale }
        ],
        backgroundColor: 'transparent'
      }}
    >
      <TouchableOpacity
        style={[styles.animatedButtonShell]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1} // No additional opacity change since we handle it manually
      >
        <LinearGradient
          colors={UNSELECTED_OPTION_GRADIENT_COLORS}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
          locations={[0, Math.min(1, (index + 2) / (totalItems + 1))]}
        />
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: '#000000',
              opacity: selectionAnim,
            }
          ]}
        />
        <View style={[styles.newOptionButtonContent, materialIconName ? { paddingVertical: 16 } : {}]}>
          {materialIconName && (
            <View style={styles.iconCircleWrapper}>
              {React.createElement(materialIconName, {
                size: 24,
                color: "#000000", // Always black regardless of selection
                strokeWidth: 1.5
              })}
            </View>
          )}
          <Animated.Text style={[
            styles.newOptionButtonText,
            { color: animatedTextColor }
          ]}>
            {option}
          </Animated.Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// Create an AnimatedBooleanOption component to properly handle animations for boolean questions
const AnimatedBooleanOption = React.memo(({ 
  value, 
  index,
  isSelected, 
  onSelect,
  currentQuestionIndex
}: {
  value: boolean;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  currentQuestionIndex: number;
}) => {
  const text = value ? 'Yes' : 'No';
  const BooleanIcon = value ? ThumbsUp : ThumbsDown;
  
  const entryOpacity = React.useRef(new Animated.Value(0)).current;
  const entryScale = React.useRef(new Animated.Value(0.9)).current;
  
  // Run animation when component mounts AND when currentQuestionIndex changes
  React.useEffect(() => {
    // Reset animation values before animating
    entryOpacity.setValue(0);
    entryScale.setValue(0.9);
    
    const delay = 20 + (index * 25); // Reduced staggered delay for quicker appearance
    
    Animated.parallel([
      Animated.timing(entryOpacity, {
        toValue: 1,
        duration: 250, // Reduced duration
        delay: delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      }),
      Animated.timing(entryScale, {
        toValue: 1,
        duration: 250, // Reduced duration
        delay: delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      })
    ]).start();
  }, [entryOpacity, entryScale, index, currentQuestionIndex]);
  
  return (
    <Animated.View
      style={{
        opacity: entryOpacity,
        transform: [{ scale: entryScale }]
      }}
    >
      <TouchableOpacity
        style={styles.newOptionButtonShell} 
        onPress={onSelect}
        activeOpacity={0.7}
      >
                  {isSelected ? (
           <View style={[
             styles.newOptionButtonContent, 
             styles.newOptionButtonSelectedBackground,
             { paddingVertical: 14 } // Reduced padding for boolean options
           ]}>
              <View style={styles.iconCircleWrapper}>
                <BooleanIcon size={24} color="#000000" strokeWidth={1.5} />
              </View>
              <Text style={[styles.newOptionButtonText, styles.newOptionButtonTextSelected]}>{text}</Text>
            </View>
          ) : (
            <LinearGradient 
              colors={UNSELECTED_OPTION_GRADIENT_COLORS} 
              start={{x:0, y:1}} end={{x:1,y:0}} 
              style={[
                styles.newOptionButtonContent,
                { paddingVertical: 14 } // Reduced padding for boolean options
              ]}
            > 
              <View style={styles.iconCircleWrapper}>
                <BooleanIcon size={24} color="#000000" strokeWidth={1.5} />
              </View>
              <Text style={styles.newOptionButtonText}>{text}</Text> 
            </LinearGradient>
          )}
      </TouchableOpacity>
    </Animated.View>
  );
});

// NEW: Smooth Boolean Option Component - Now with proper press feedback like RadioOption
const SmoothBooleanOption = React.memo(({ 
  value, 
  index,
  isSelected, 
  onSelect,
  currentQuestionIndex
}: {
  value: boolean;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  currentQuestionIndex: number;
}) => {
  const text = value ? 'Yes' : 'No';
  const BooleanIcon = value ? ThumbsUp : ThumbsDown;
  
  // Animation values - matching RadioOption exactly
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const selectionAnim = React.useRef(new Animated.Value(isSelected ? 1 : 0)).current; // Initialize with correct selection state
  const entryOpacity = React.useRef(new Animated.Value(0)).current;
  const entryScale = React.useRef(new Animated.Value(0.9)).current;
  const lastQuestionIndex = React.useRef(currentQuestionIndex);
  const [hasAnimated, setHasAnimated] = React.useState(false);
  
  // Reset animation state when question changes
  React.useEffect(() => {
    if (lastQuestionIndex.current !== currentQuestionIndex) {
      lastQuestionIndex.current = currentQuestionIndex;
      setHasAnimated(false);
      // Initialize selection animation with the correct state from the start
      selectionAnim.setValue(isSelected ? 1 : 0);
    }
  }, [currentQuestionIndex, isSelected]);
  
  // Update selection animation when isSelected changes - but only after entry animation
  React.useEffect(() => {
    if (hasAnimated) {
      Animated.timing(selectionAnim, {
        toValue: isSelected ? 1 : 0,
        duration: 100, 
        useNativeDriver: false, 
      }).start();
    }
  }, [isSelected, selectionAnim, hasAnimated]);
  
  // Handle the animation with proper stagger timing
  React.useEffect(() => {
    if (!hasAnimated) {
      // If it's the first question, don't animate - set values immediately
      if (currentQuestionIndex === 0) {
        entryOpacity.setValue(1);
        entryScale.setValue(1);
        setHasAnimated(true);
        return;
      }
      
      entryOpacity.setValue(0);
      entryScale.setValue(0.9);
      
      const delay = 20 + (index * 25);
      
      Animated.parallel([
        Animated.timing(entryOpacity, {
          toValue: 1,
          duration: 250,
          delay: delay,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        }),
        Animated.timing(entryScale, {
          toValue: 1,
          duration: 250,
          delay: delay,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        })
      ]).start(() => {
        setHasAnimated(true);
        // No need to set selection state here anymore since it's already initialized correctly
      });
    }
  }, [entryOpacity, entryScale, index, hasAnimated, currentQuestionIndex]);
  
  // Press feedback handlers - matching RadioOption exactly
  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.96,
      duration: 60,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 80,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect();
  };

  // Animated colors - matching RadioOption
  const animatedTextColor = selectionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#000000', '#FFFFFF'], 
  });

  return (
    <Animated.View
      style={{
        opacity: entryOpacity,
        transform: [
          { scale: scaleAnim },
          { scale: entryScale }
        ]
      }}
    >
      <TouchableOpacity
        style={styles.newOptionButtonShell} 
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1} // No additional opacity change since we handle it manually
      >
        <LinearGradient
          colors={UNSELECTED_OPTION_GRADIENT_COLORS}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
          locations={[0, Math.min(1, (index + 2) / (2 + 1))]} // 2 total boolean options
        />
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: '#000000',
              opacity: selectionAnim,
            }
          ]}
        />
        <View style={[
          styles.newOptionButtonContent,
          { paddingVertical: 14 }
        ]}>
          <View style={styles.iconCircleWrapper}>
            <BooleanIcon size={24} color="#000000" strokeWidth={1.5} />
          </View>
          <Animated.Text style={[
            styles.newOptionButtonText,
            { color: animatedTextColor }
          ]}>
            {text}
          </Animated.Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

  // Main Questionnaire Screen
const QuestionnaireScreen = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isInitialMount = useRef(true);
  // Explicitly type the navigation object for the AuthStack
  const navigation = useNavigation<StackNavigationProp<AuthStackParamList>>();
  
  const [questions, setQuestions] = useState<QuestionItem[]>(QUESTIONNAIRE_ITEMS);

  // Animation value for footer position
  const footerTranslateY = useRef(new Animated.Value(0)).current;
  
  // Animation values
  const buttonColorAnim = useRef(new Animated.Value(0)).current;
  const gradientAnimValue = useRef(new Animated.Value(0)).current;
  
  // NEW: Animated value for smooth progress bar animation
  const progressAnimValue = useRef(new Animated.Value(calculateTargetProgress(0, QUESTIONNAIRE_ITEMS.length))).current;
  
  // Ref to track progress bar animation frame for cancellation
  const progressAnimationRef = useRef<number | null>(null);
  
  // Light debouncing instead of heavy transition blocking
  const lastNavigationTime = useRef(0);
  const NAVIGATION_DEBOUNCE_MS = 200; // Short debounce period
  
  // Track actual progress width for smooth animation - now derived from animated value
  const [progressWidth, setProgressWidth] = useState<number>(() => 
    calculateTargetProgress(0, QUESTIONNAIRE_ITEMS.length) // Initialize with calculated progress for the first question
  );
  
  // Add independent queston counter that doesn't rely on currentQuestion
  const [displayQuestionCount, setDisplayQuestionCount] = useState(1);
  
  // State for current question index
  const [currentQuestion, setCurrentQuestion] = useState(0);
  
  // State for storing all answers
  const [answers, setAnswers] = useState<any>(() => {
    let initialAge: string | undefined = undefined;
    let initialBirthDateDetails: { year: string; month: string; day: string; } | null = null;

    if (QUESTIONNAIRE_ITEMS[0]?.id === 'age') {
      // Use current date as default
      const today = new Date();
      const defaultYear = today.getFullYear();
      const defaultMonth0Indexed = today.getMonth(); // 0-indexed month
      const defaultDay = today.getDate();

      // For age, set to 0 since birth date is today
      initialAge = "0";
      initialBirthDateDetails = {
        year: String(defaultYear),
        month: String(defaultMonth0Indexed),
        day: String(defaultDay),
      };
    }

    return {
      birthDateDetails: initialBirthDateDetails,
      age: initialAge,
      // Ensure other potential initial answer fields are not lost if they exist
      // For now, assuming only these are critical for initialization logic
    };
  });
  
  // State for loading
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State to prevent saving answers before cache is loaded
  const [isLoaded, setIsLoaded] = useState(false);
  
  // NEW: State for under 13 overlay
  const [isUnder13, setIsUnder13] = useState(false);
  
  // State for validation errors
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Add state to track the current button state
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);
  
  // State to hold the current fade animation instance
  const [currentAnimation, setCurrentAnimation] = useState<Animated.CompositeAnimation | null>(null);
  
  
  
  
  // State to track if referral images are preloaded
  const [imagesPreloaded, setImagesPreloaded] = useState(false);
  
  // Animation value for background fade when notification shows
  const backgroundFadeAnim = useRef(new Animated.Value(0)).current;
  
  // ScrollView ref to control scroll position
  const scrollViewRef = useRef<ScrollView>(null);
  
  // NEW: State for individual option opacities for the cause factor question
  const [causeFactorOpacities, setCauseFactorOpacities] = useState<{ [key: string]: Animated.Value }>({});
  const causeFactorOpacitiesRef = useRef<{ [key: string]: Animated.Value }>({}); // Ref to avoid stale closures
  
  // NEW: State for individual option translateY for the cause factor question
  const [causeFactorTranslateYs, setCauseFactorTranslateYs] = useState<{ [key: string]: Animated.Value }>({});
  const causeFactorTranslateYsRef = useRef<{ [key: string]: Animated.Value }>({}); // Ref to avoid stale closures
  
  // NEW: State to store the measured height of a radio item for precise animation
  const [measuredItemHeight, setMeasuredItemHeight] = useState<number | null>(null);
  
  // NEW: State to store the measured Y positions of radio items
  const [causeFactorPositionsY, setCauseFactorPositionsY] = useState<{ [key: string]: number }>({});
  const causeFactorPositionsYRef = useRef<{ [key: string]: number }>({}); // Ref for positions

  // NEW: Refs for each animated option view - Use 'any' to bypass strict typing issue
  const optionViewRefs = useRef<{ [key: string]: any }>({});
  
  // Animation values for MCQ option entry animations are defined below
  
  // NEW: State for the configuration of the active conditional slider
  const [activeConditionalSliderConfig, setActiveConditionalSliderConfig] = useState<ConditionalSliderConfig | null>(null);
  // NEW: Animated value for the conditional slider's visibility
  const conditionalSliderAnim = useRef(new Animated.Value(0)).current; // 0: hidden, 1: visible
  
  // Create a local ref for progress that doesn't trigger re-renders when form selections change
  const progressRef = useRef({
    width: calculateTargetProgress(0, QUESTIONNAIRE_ITEMS.length), // Initialize with calculated progress
    currentQuestion: 1,
    totalQuestions: QUESTIONNAIRE_ITEMS.length,
  });
  
  const handleResetQuestionnaire = useCallback(async () => {
    try {
      // Clear all cached data
      await clearQuestionnaireCache();
      await AsyncStorage.removeItem('isUnder13Locked');
      
      // Reset all state variables to their initial values
      setAnswers({});
      setCurrentQuestion(0);
      setDisplayQuestionCount(1);
      setIsUnder13(false);
      setValidationError(null);
      
      // Reset the progress bar
      const initialProgress = calculateTargetProgress(0, QUESTIONNAIRE_ITEMS.length);
      progressAnimValue.setValue(initialProgress);
      setProgressWidth(initialProgress);
      
      Alert.alert(
        "Questionnaire Reset",
        "Your previous answers have been cleared. You can now start over.",
        [{ text: "OK" }]
      );
    } catch (error) {
      logger.error('Failed to reset questionnaire:', error);
      Alert.alert('Error', 'Could not reset the questionnaire. Please try reinstalling the app.');
    }
  }, []);
  
  // Load cached answers and progress on component mount
  useEffect(() => {
    const loadCachedData = async () => {
      try {
        const under13Locked = await AsyncStorage.getItem('isUnder13Locked');
        if (under13Locked === 'true') {
          setIsUnder13(true);
          return; // Early exit, user is locked out.
        }

        const [cachedAnswers, cachedProgress] = await Promise.all([
          loadQuestionnaireAnswers(),
          loadQuestionnaireProgress()
        ]);
        
        if (cachedAnswers) {
          setAnswers((prevAnswers: any) => ({
            ...prevAnswers,
            ...cachedAnswers
          }));
        }
        
        if (cachedProgress && cachedProgress.currentQuestion >= 0) {
          const questionIndex = Math.min(cachedProgress.currentQuestion, QUESTIONNAIRE_ITEMS.length - 1);
          setCurrentQuestion(questionIndex);
          setDisplayQuestionCount(questionIndex + 1);
          
          // Update progress bar to match loaded question
          const targetProgress = calculateTargetProgress(questionIndex, QUESTIONNAIRE_ITEMS.length);
          progressAnimValue.setValue(targetProgress);
          setProgressWidth(targetProgress);
        }
      } catch (error) {
        logger.warn('Error loading cached questionnaire data:', error);
      }
    };
    
    loadCachedData().finally(() => setIsLoaded(true));

    // Set up deep link listener for resetting the questionnaire
    const handleDeepLink = (event: { url: string }) => {
      if (event.url.includes('dewyapp://reset-questionnaire')) {
        handleResetQuestionnaire();
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if the app was opened with a deep link
    Linking.getInitialURL().then(url => {
      if (url && url.includes('dewyapp://reset-questionnaire')) {
        handleResetQuestionnaire();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [handleResetQuestionnaire]);
  
  // Add listener to sync progressWidth state with animated value
  useEffect(() => {
    const listener = progressAnimValue.addListener(({ value }) => {
      setProgressWidth(value);
    });

    return () => {
      progressAnimValue.removeListener(listener);
    };
  }, [progressAnimValue]);
  
  // Save answers to cache whenever they change
  useEffect(() => {
    if (isLoaded && Object.keys(answers).length > 0) {
      saveQuestionnaireAnswers(answers);
    }
  }, [answers, isLoaded]);
  
  // Save progress to cache whenever current question changes
  useEffect(() => {
    saveQuestionnaireProgress(currentQuestion);
  }, [currentQuestion]);
  
  // Initialize animation values for option entry animations
  useEffect(() => {
    progressRef.current.currentQuestion = currentQuestion + 1;
    
    // Reset scroll position to top whenever question changes
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [currentQuestion, questions]);
  
  // When question changes, this will handle the animation of choice items
  useEffect(() => {
    progressRef.current.currentQuestion = currentQuestion + 1;
    
    // Reset scroll position to top whenever question changes
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [currentQuestion, questions]);
  
  // Preload referral source images and location map to prevent delayed appearance
  useEffect(() => {
    const preloadImages = async () => {
      try {
        // Get all image sources from the cached map
        const imageSources = Object.values(CACHED_REFERRAL_SOURCE_IMAGE_MAP);
        
        // Add the location map image to preload list
        imageSources.push(LOCATION_MAP_IMAGE);
     
        
        // Convert require() sources to Asset objects and preload them
        const preloadPromises = imageSources.map(async (imageSource) => {
          try {
            // For require() sources (which are numbers), we need to get the asset and download it
            if (typeof imageSource === 'number') {
              const asset = Asset.fromModule(imageSource);
              await asset.downloadAsync();
              logger.debug('Image preloaded successfully:', asset.uri);
              return asset;
            }
            return null;
          } catch (imageError) {
            logger.warn('Failed to preload image:', imageError);
            return null;
          }
        });
        
        // Wait for all images to be preloaded
        await Promise.all(preloadPromises);
        logger.debug('All images preloaded successfully');
        setImagesPreloaded(true);
      } catch (preloadError) {
        logger.warn('Error preloading images:', preloadError);
        // Set to true even on error to prevent blocking the UI
        setImagesPreloaded(true);
      }
    };
    
    // Start preloading immediately when component mounts
    preloadImages();
  }, []); // Empty dependency array - only run once on mount
  
  // NEW: Check if grouped slider question is answered
  const isGroupedSliderAnswered = (question: QuestionItem) => {
    if (!question.subQuestions) return false;
    return question.subQuestions.every(subQ => answers[subQ.id] !== undefined && answers[subQ.id] !== '');
  };

  // UPDATED: isCurrentQuestionAnswered to handle grouped_column_select
  const isCurrentQuestionAnswered = () => {
    const currentQ = questions[currentQuestion];
    // const answer = answers[currentQ.id]; // Not directly used for grouped types

    // These question types don't require an answer, just showing information or are optional
    if (currentQ.type === 'progress_indicator' || 
        currentQ.type === 'notification_permission' ||
        currentQ.type === 'plan_generation' ||
        currentQ.type === 'referral_code') {
      return true;
    }

    if (currentQ.type === 'grouped_column_select') { // Changed from grouped_slider
      return isGroupedSliderAnswered(currentQ); // Reusing the logic, checks for defined, non-empty string
    }

    // For number input, ensure it's a valid number
    if (currentQ.type === 'number') {
      if (answers[currentQ.id] === undefined || answers[currentQ.id] === '') return false;
      
      // For age question specifically, validate the range
      if (currentQ.id === 'age') {
        // The button should be enabled for all ages to allow the COPPA check to happen on "Continue".
        // However, we disable it for very recent years which are obvious mis-clicks.
        if (answers.birthDateDetails?.year) {
          const year = parseInt(answers.birthDateDetails.year, 10);
          if (!isNaN(year) && year > 2020) {
            return false; // It's a likely mis-click, disable continue.
          }
        }
        // Otherwise, the button is enabled. The actual age < 13 check is in `goToNextQuestion`.
        return true;
      }
      
      return !isNaN(Number(answers[currentQ.id]));
    }
    
    // For checkbox, ensure at least one option is selected
    if (currentQ.type === 'checkbox') {
      return answers[currentQ.id] && answers[currentQ.id].length > 0;
    }
    
    // For boolean with details, ensure details are provided if yes is selected
    if (currentQ.type === 'boolean' && currentQ.hasDetails && answers[currentQ.id] === true) {
      const details = answers[`${currentQ.id}_details`];
      return details !== undefined && details !== '';
    }
    
    // For other types, just ensure an answer exists
    return answers[currentQ.id] !== undefined && answers[currentQ.id] !== '';
  };
  
  // Function to smoothly animate progress bar with React Native Animated API
  const animateProgressBar = (newTargetWidth: number) => {
    // Cancel any ongoing animation to prevent glitching
    if (progressAnimationRef.current) {
      cancelAnimationFrame(progressAnimationRef.current);
      progressAnimationRef.current = null;
    }
    
    // Simple state-based animation for testing
    const startWidth = progressWidth;
    const duration = 250; // Increased from 200ms to 250ms for slightly slower animation
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease out cubic)
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
      const easedProgress = easeOutCubic(progress);
      
      const currentWidth = startWidth + (newTargetWidth - startWidth) * easedProgress;
      setProgressWidth(currentWidth);
      
      if (progress < 1) {
        progressAnimationRef.current = requestAnimationFrame(animate);
      } else {
        progressAnimationRef.current = null;
      }
    };
    
    progressAnimationRef.current = requestAnimationFrame(animate);
    
    // Update the ref for immediate access
    progressRef.current.width = newTargetWidth;
  };
  
  // Direct keyboard position management
  useEffect(() => {
    // Set a fixed offset for where the button should be when keyboard is open
    const KEYBOARD_BUTTON_POSITION = -300; // Fixed position from bottom
    
    // Reset any existing animation to avoid conflicts
    footerTranslateY.setValue(0);
    
    // Single event handler to directly position the footer
    const keyboardChangeHandler = (e: any, isShowing: boolean) => {
      // Cancel any ongoing animations to prevent conflicts
      footerTranslateY.stopAnimation();
      
      // Set the final target position - either at the bottom or fixed position
      const targetPosition = isShowing ? KEYBOARD_BUTTON_POSITION : 0;
      
      // Only animate if it's not the initial load (currentQuestion > 0) to avoid intro animations
      if (currentQuestion > 0) {
        Animated.timing(footerTranslateY, {
          toValue: targetPosition,
          duration: 250,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease)
        }).start();
      } else {
        // For the first question, set immediately without animation
        footerTranslateY.setValue(targetPosition);
      }
    };
    
    // Add listeners - iOS uses Will events, Android uses Did events
    const keyboardShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => keyboardChangeHandler(e, true)
    );
    
    const keyboardHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => keyboardChangeHandler(e, false)
    );
    
    // Clean up listeners
    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  const handlePermissionResult = (questionId: string, granted: boolean) => {
    if (questionId === 'notification_permission_intro') {
        setAnswers((prev: any) => ({ ...prev, notifications_enabled: granted }));
    } else if (questionId === 'notification_permission') {
        setAnswers((prev: any) => ({ ...prev, location_enabled: granted }));
    }
  };

  // Update when question is answered
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // On initial mount, just set the button state without animation
      const isAnswered = isCurrentQuestionAnswered();
      if (isAnswered !== isButtonEnabled) {
        setIsButtonEnabled(isAnswered);
        buttonColorAnim.setValue(isAnswered ? 1 : 0);
        if (currentQuestion === questions.length - 1) {
          gradientAnimValue.setValue(isAnswered ? 1 : 0);
        }
      }
      return;
    }

    const isAnswered = isCurrentQuestionAnswered();
    if (isAnswered !== isButtonEnabled) {
      setIsButtonEnabled(isAnswered);
      
      // Animate button color on subsequent updates
      Animated.timing(buttonColorAnim, {
        toValue: isAnswered ? 1 : 0,
        duration: 100,
        useNativeDriver: false,
      }).start();
      
      // Animate gradient if it's the last question
      if (currentQuestion === questions.length - 1) {
        Animated.timing(gradientAnimValue, {
          toValue: isAnswered ? 1 : 0,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }
    }
  }, [answers, currentQuestion]);
  
  // Update current question in progress ref
  useEffect(() => {
    progressRef.current.currentQuestion = currentQuestion + 1;
    
    // Create new animation values for current question options
    const currentQ = questions[currentQuestion];
    
      // Start animations with staggered delay for the options
  // Only animate if not the first question to avoid intro animations
  if (currentQ.options && currentQuestion > 0) {
    const animations = currentQ.options.map((option, index) => {
      // Create local animations for each option
      const opacity = new Animated.Value(0);
      const scale = new Animated.Value(0.95);
      
      // Setup the animations with staggered delays
      return Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 350,
          delay: 100 + (index * 30), // Staggered delay (base 100ms + 30ms per item)
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 350,
          delay: 100 + (index * 30), // Same delay for consistency
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        })
      ]);
    });
    
    // Run all animations in parallel
    Animated.parallel(animations.flat()).start();
  }
  
  // Reset scroll position to top whenever question changes
  if (scrollViewRef.current) {
    scrollViewRef.current.scrollTo({ y: 0, animated: false });
  }
}, [currentQuestion, questions]);

  // Function to handle radio selection
  const handleRadioSelect = (option: string) => {
    const currentQ = questions[currentQuestion];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (currentQ.id === 'primary_cause_factor' && currentQ.options) {
      const newlySelectedOption = option;
      const previouslySelectedOption = answers[currentQ.id];
      const optionsArray = currentQ.options;
      const selectedIndex = optionsArray.findIndex(opt => opt === newlySelectedOption);
      const animationDuration = 300;

      const mainOptionAnimations: Animated.CompositeAnimation[] = [];

      // --- Conditional Slider Logic --- 
      const newSliderConfig = CONDITIONAL_SLIDER_CONFIGS[newlySelectedOption];
      const oldSliderConfig = previouslySelectedOption ? CONDITIONAL_SLIDER_CONFIGS[previouslySelectedOption] : null;

      // If switching from a selection that had a slider, or deselecting from one
      if (oldSliderConfig && (oldSliderConfig.id !== newSliderConfig?.id || !newSliderConfig)) {
        Animated.timing(conditionalSliderAnim, {
          toValue: 0, duration: animationDuration - 100, useNativeDriver: true
        }).start(() => {
          if (activeConditionalSliderConfig?.id === oldSliderConfig.id) { // Ensure we are hiding the correct one
            setActiveConditionalSliderConfig(null);
          }
        });
        // Clear the old slider's answer from the main answers object
        if (answers[oldSliderConfig.id] !== undefined) {
          const newAnswers = { ...answers };
          delete newAnswers[oldSliderConfig.id];
          // No, don't set answers here yet, do it after main option selection logic
        }
      }
      // --- End Conditional Slider Logic ---

      if (previouslySelectedOption === newlySelectedOption) {
        // DESELECTING the current option
        optionsArray.forEach((opt) => { // Animate main radio options
          if (causeFactorOpacitiesRef.current[opt] && causeFactorTranslateYsRef.current[opt]) {
            mainOptionAnimations.push(
              Animated.timing(causeFactorOpacitiesRef.current[opt], { toValue: 1, duration: animationDuration, useNativeDriver: true }),
              Animated.timing(causeFactorTranslateYsRef.current[opt], { toValue: 0, duration: animationDuration, useNativeDriver: true })
            );
          }
        });
        setAnswers((prev: any) => {
          const updatedAnswers = { ...prev };
          delete updatedAnswers[currentQ.id];
          if (oldSliderConfig) delete updatedAnswers[oldSliderConfig.id]; // Also clear slider answer on deselect
          return updatedAnswers;
        });
        setActiveConditionalSliderConfig(null); // Ensure slider config is cleared
        // Slider visibility is already handled above if oldSliderConfig existed

      } else {
        // SELECTING a new option (or first option)
        optionsArray.forEach((opt, index) => { // Animate main radio options
          const opacityAnimValue = causeFactorOpacitiesRef.current[opt];
          const translateYAnimValue = causeFactorTranslateYsRef.current[opt];
          if (opacityAnimValue && translateYAnimValue) {
            const firstOptionY = causeFactorPositionsYRef.current[optionsArray[0]];
            const currentOptionY = causeFactorPositionsYRef.current[opt]; // Y of the option being iterated
            const selectedOptionActualY = causeFactorPositionsYRef.current[newlySelectedOption];
            const canUseMeasuredPosition = firstOptionY !== undefined && selectedOptionActualY !== undefined;

            let targetOpacity: number;
            let targetTranslateY: number;

            if (opt === newlySelectedOption) { // Current iterated option IS the one selected
              targetOpacity = 1;
              targetTranslateY = canUseMeasuredPosition ? firstOptionY - selectedOptionActualY : -(selectedIndex * ITEM_VERTICAL_SPACE);
            } else { // Current iterated option is NOT the one selected (it's an "other" option)
              targetOpacity = 0;
              targetTranslateY = 0; // Fades in place
            }
            mainOptionAnimations.push(
              Animated.timing(opacityAnimValue, { toValue: targetOpacity, duration: animationDuration, useNativeDriver: true }),
              Animated.timing(translateYAnimValue, { toValue: targetTranslateY, duration: animationDuration, useNativeDriver: true })
            );
          }
        });

        setAnswers((prevAnswers: any) => {
          const updatedAnswers = { ...prevAnswers, [currentQ.id]: newlySelectedOption };
          if (oldSliderConfig && oldSliderConfig.id !== newSliderConfig?.id) {
            delete updatedAnswers[oldSliderConfig.id];
          }
          if (newSliderConfig) {
            updatedAnswers[newSliderConfig.id] = newSliderConfig.min;
          }
          return updatedAnswers;
        });
        
        // Activate new slider if applicable - NOW SEQUENTIAL
        // The actual setActiveConditionalSliderConfig call moved AFTER main option animation completes
        // The animation for conditionalSliderAnim will be triggered from the callback of mainOptionAnimations.start()

      }

      if (mainOptionAnimations.length > 0) {
        Animated.parallel(mainOptionAnimations).start(() => {
          // Animation complete callback for main radio options
          if (previouslySelectedOption !== newlySelectedOption && newSliderConfig) {
            setActiveConditionalSliderConfig(newSliderConfig);
            Animated.timing(conditionalSliderAnim, { 
              toValue: 1, duration: animationDuration, useNativeDriver: true, easing: Easing.out(Easing.quad), delay: 300 
            }).start();
          } else if (!newSliderConfig && activeConditionalSliderConfig) {
             // This case handles if we selected an option that *doesn't* have a slider,
             // ensuring any existing slider (which might be fading out due to earlier logic)
             // has its config cleared if it hasn't already.
             // The fade out for the slider itself is handled earlier if oldSliderConfig exists.
             setActiveConditionalSliderConfig(null);
          }
        });
      } else if (newSliderConfig && previouslySelectedOption !== newlySelectedOption) {
        // Case: No main option animations (e.g., first selection, no items to fade out),
        // but a new slider needs to be shown.
        setActiveConditionalSliderConfig(newSliderConfig);
        Animated.timing(conditionalSliderAnim, { 
          toValue: 1, duration: animationDuration, useNativeDriver: true, easing: Easing.out(Easing.quad), delay: 300 
        }).start();
      } else if (!newSliderConfig && activeConditionalSliderConfig) {
        // Case: No main option animations, and no new slider, ensure config is cleared.
        // Fade out logic for an *old* slider would have already run.
        setActiveConditionalSliderConfig(null);
      }

    } else {
      // For all other radio questions, just select the option.
      setAnswers({ ...answers, [currentQ.id]: option });
    }
  };
  
  // Function to handle checkbox selection
  const handleCheckboxToggle = (option: string) => {
    const currentQ = questions[currentQuestion];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentSelections = answers[currentQ.id] || [];
    
    // If "None" is selected, clear all other selections
    if (option === 'None') {
      setAnswers({ ...answers, [currentQ.id]: ['None'] });
      return;
    }
    
    // If selecting something else, remove "None" if it was selected
    const newSelections = currentSelections.filter((item: string) => item !== 'None');
    
    // Toggle selection
    let finalSelections;
    if (newSelections.includes(option)) {
      finalSelections = newSelections.filter((item: string) => item !== option);
    } else {
      finalSelections = [...newSelections, option];
    }
    
    setAnswers({ ...answers, [currentQ.id]: finalSelections });
  };
  
  // Function to handle text input (will now also be used by BirthDatePicker callback for age)
  const handleBirthDateChange = useCallback((details: { year: string; month: string; day: string; age: number }) => {
    // Once the user is flagged as under 13, we should not allow them to change the date.
    if (isUnder13) {
      return;
    }

    setAnswers((prevAnswers: any) => {
      const { year, month, day, age } = details;
      // The 'month' from the picker is 0-indexed, which is what the Date constructor expects.
      const birthDate = new Date(parseInt(year, 10), parseInt(month, 10), parseInt(day, 10));
      
      // Update age and the detailed birth date components, including the ISO string
      return {
        ...prevAnswers,
        age: String(age),
        birthDateDetails: { 
          year, 
          month, 
          day,
          isoString: birthDate.toISOString() // Add the ISO string here
        }
      };
    });
    if (validationError) {
      setValidationError(null); // Clear validation error when date is updated
    }
  }, [validationError, isUnder13]);

  // Function to handle the actual question transition and animation
  const transitionToQuestion = (newQuestionIndex: number) => {
    setValidationError(null); // Clear any existing validation error
    setCurrentQuestion(newQuestionIndex);
    
    // Immediately animate progress bar to match new question
    const targetProgress = calculateTargetProgress(newQuestionIndex, questions.length);
    animateProgressBar(targetProgress);
  };

  // Function to handle generic text input (for non-age questions)
  const handleGenericTextInput = useCallback((questionId: string, text: string) => {
    setAnswers((prevAnswers: any) => ({ ...prevAnswers, [questionId]: text }));
    // If there was a validation error specific to this field (not currently implemented for generic text), clear it.
  }, []);
  
  // Function to handle other text input
  const handleOtherTextInput = (text: string) => {
    const currentQ = questions[currentQuestion];
    setAnswers({ 
      ...answers, 
      [`${currentQ.id}_other`]: text 
    });
  };
  
  // Function to handle boolean selection
  const handleBooleanSelect = (value: boolean) => {
    const currentQ = questions[currentQuestion];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Remove LayoutAnimation that was causing progress indicator rerenders
    setAnswers({ ...answers, [currentQ.id]: value });
  };
  
  // Function to handle details text input
  const handleDetailsInput = (text: string) => {
    const currentQ = questions[currentQuestion];
    setAnswers({ 
      ...answers, 
      [`${currentQ.id}_details`]: text 
    });
  };
  
  // Function to validate age input
  const validateAge = (ageStr: string): boolean => {
    const age = parseInt(ageStr, 10);
    if (isNaN(age) || age < 13 || age > 99) {
      setValidationError('You must be at least 13 years old to use this app.');
      return false;
    }
    setValidationError(null);
    return true;
  };
  
  // Progress bar component that responds to notification state
  const ProgressBar = ({ current, total, progress, isDarkerMode = false }: { 
    current: number; 
    total: number; 
    progress: number;
    isDarkerMode?: boolean;
  }) => {
    return (
      <View style={[
        styles.progressContainer,
        { backgroundColor: currentProgressBgColor }
      ]}>
        <View
          style={[
            styles.progressFill, 
            { 
              width: `${progressWidth}%`
            }
          ]}
        />
      </View>
    );
  };
  
  // Function to go to the next question
  const goToNextQuestion = async () => {
    logger.debug('[QuestionnaireScreen] Continue button pressed.');
    const isAnswered = isCurrentQuestionAnswered();
    logger.debug(`[QuestionnaireScreen] isCurrentQuestionAnswered() returned: ${isAnswered}`);
    // Only check if current question is answered, remove debouncing for responsiveness
    if (!isAnswered) {
      logger.debug('[QuestionnaireScreen] Exiting goToNextQuestion because question is not answered.');
      return;
    }

    // Get the current question object from the existing 'questions' array and 'currentQuestion' index
    const activeQuestion = questions[currentQuestion];

    // Validate age specifically for the 'age' question
    if (activeQuestion.id === 'age') {
      const ageStr = answers['age']; // Access 'answers' state directly
      const age = parseInt(ageStr, 10);
      if (!isNaN(age) && age < 13) {
        setIsUnder13(true);
        await AsyncStorage.setItem('isUnder13Locked', 'true');
        return;
      }
      if (!validateAge(ageStr)) { // 'validateAge' will use/set 'validationError' state
        return; // Stop if validation fails
      }
    }
    logger.debug(`[QuestionnaireScreen] Checking navigation condition. currentQuestion: ${currentQuestion}, questions.length: ${questions.length}`);
    if (currentQuestion < questions.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const nextIndex = currentQuestion + 1;
      setDisplayQuestionCount(prev => Math.min(questions.length, prev + 1));
      transitionToQuestion(nextIndex);
    } else {
      logger.debug('[QuestionnaireScreen] Reached end of questionnaire. Calling submitQuestionnaire...');
      await submitQuestionnaire();
    }
  };
  
  // Function to go to the previous question
  const goToPreviousQuestion = () => {
    // If at first question, go back to Welcome screen
    if (currentQuestion === 0) {
      navigation.goBack();
      return;
    }

    const prevIndex = currentQuestion - 1;
    setDisplayQuestionCount(prev => Math.max(1, prev - 1));
    transitionToQuestion(prevIndex);
  };
  
  // Function to submit the questionnaire
  const submitQuestionnaire = async () => {
    logger.debug('[QuestionnaireScreen] submitQuestionnaire called.');
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const submissionId = uuidv4();

    const submissionData = {
      id: submissionId,
      gender: answers.gender ? [answers.gender] : null,
      skin_type: answers.skin_type ? [answers.skin_type] : null,
      birthdate: answers.birthDateDetails && answers.birthDateDetails.isoString ? answers.birthDateDetails.isoString.split('T')[0] : null,
      primary_skin_goal: answers.skin_concerns ? [answers.skin_concerns] : null,
      issue_duration: answers.issue_duration_actual ? [answers.issue_duration_actual] : null,
      issue_frequency: answers.flareup_frequency_actual ? [answers.flareup_frequency_actual] : null,
      skincare_products: answers.skincare_products || null,
      skin_sensitivity: answers.skin_sensitivity ? [answers.skin_sensitivity] : null,
      restful_sleeps_per_week: answers.restful_sleep_frequency ? [answers.restful_sleep_frequency] : null,
      main_daily_exposure: answers.main_daily_exposure ? [answers.main_daily_exposure] : null,
      post_cleanse_skin: answers.post_cleanse_skin_feel ? [answers.post_cleanse_skin_feel] : null,
      flared_up_skin_feels: answers.flare_skin_feel ? [answers.flare_skin_feel] : null,
      where_heard_about_dewy: answers.referral_source ? [answers.referral_source] : null,
      tried_other_skincare_apps: answers.tried_other_apps,
      referral_code: answers.referral_code ? [answers.referral_code] : null,
      enabled_notifications: answers.notifications_enabled,
      enabled_location: answers.location_enabled,
      completed_at: new Date().toISOString(),
    };

    logger.debug('[QuestionnaireScreen] Preparing to submit data:', submissionData);

    try {
      const { data, error } = await supabase
        .from('anonymous_questionnaires')
        .insert([submissionData])
        .select();

      logger.debug(`[QuestionnaireScreen] Supabase response: error=${JSON.stringify(error)}, data=${JSON.stringify(data)}`);

      if (error) {
        logger.error('Failed to submit anonymous questionnaire', { error });
        Alert.alert('Submission Error', 'Could not save your questionnaire. Please try again.');
        setIsSubmitting(false);
        return;
      }

      logger.debug('Anonymous questionnaire submitted successfully', { submissionId });

      await clearQuestionnaireCache();
      logger.debug('[QuestionnaireScreen] Cache cleared. Navigating to FaceScanScreen...');
      navigation.navigate('FaceScanScreen', {
        submissionId: submissionId,
      });
      logger.debug('[QuestionnaireScreen] Navigation dispatched.');

    } catch (error) {
      logger.error('An unexpected error occurred during questionnaire submission', { error });
      Alert.alert('An Unexpected Error', 'Something went wrong. Please restart the app and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // NEW: Function to handle column selection for grouped_column_select
  const handleColumnSelect = useCallback((subQuestionId: string, option: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentQNode = questions[currentQuestion]; // Define currentQNode at the start of the callback

    setAnswers((prevAnswers: any) => {
      const updatedAnswers = { ...prevAnswers, [subQuestionId]: option };

      // Clear validation error if applicable
      if (validationError && currentQNode?.type === 'grouped_column_select') {
        let bothAnswered = true;
        if (currentQNode.subQuestions) {
          for (const subQ of currentQNode.subQuestions) {
            if (!updatedAnswers[subQ.id] || updatedAnswers[subQ.id] === '') {
              bothAnswered = false;
              break;
            }
          }
        }
        if (bothAnswered) {
          setValidationError(null); // This will trigger a re-render if validationError changes
        }
      }
      return updatedAnswers;
    });
  }, [validationError, currentQuestion, questions]);
  
  // Function to render question inputs
  const renderQuestionInputs = () => {
    const currentQ = questions[currentQuestion];

    return (
      <View 
        style={[styles.questionInputsContainer]}
      >
        {/* Ensure that only components, not raw strings, are rendered */}
        {currentQ.type === 'notification_permission' ? (
          <View style={styles.placeholderContainer}>
            {/* Use the NotificationPermissionDialog component directly - background will be darkened from parent */}
            <NotificationPermissionDialog onContinue={goToNextQuestion} questionId={currentQ.id} onPermissionResult={(granted) => handlePermissionResult(currentQ.id, granted)} />
          </View>
        ) : currentQ.type === 'referral_code' ? (
          <View style={styles.referralCodeContainer}>
            <View style={{width: '100%'}}>
              <FloatingLabelInput
                value={answers[currentQ.id] || ''}
                onChangeText={(text) => handleGenericTextInput(currentQ.id, text)}
                label="Referral Code"
                colors={UNSELECTED_OPTION_GRADIENT_COLORS}
              />
            </View>
          </View>
        ) : currentQ.type === 'plan_generation' ? (
          <View style={styles.planGenerationContainer}>
            <View style={styles.allDoneContainer}>
              <Text style={[styles.subheadingText, { fontSize: 26, marginRight: 0, marginBottom: 0 }]}>All done!</Text>
              <View style={{ marginLeft: 8 }}>
                <GradientLaughIcon />
              </View>
            </View>
            
            <Text style={[styles.planGenerationTitle, { fontSize: 28, fontWeight: '400', color: '#000000', textAlign: 'center', paddingHorizontal: 20, transform: [{ translateY: -5 }], marginBottom: 0, paddingBottom: 0 }]}>
              Time for a quick face scan
            </Text>
          </View>
        ) : currentQ.type === 'progress_indicator' ? (
          currentQ.id === 'privacy_shield' ? (
            <PrivacyShieldIndicator currentQuestionIndex={currentQuestion} />
          ) : currentQ.id === 'personalize_intro' ? (
            <PersonalizeIntroAnimation />
          ) : (
            <ProgressIndicator answers={answers} currentQuestionIndex={currentQuestion} />
          )
        ) : currentQ.id === 'age' && currentQ.type === 'number' ? (
          <BirthDatePicker
            date={answers.birthDateDetails || null}
            onDateChange={handleBirthDateChange}
            minAge={0} 
            maxAge={99} 
          />
        ) : currentQ.type === 'number' && currentQ.id !== 'age' ? (
          <View>
            <TextInput
              style={[styles.numberInput]}
              value={answers[currentQ.id] || ''}
              onChangeText={(text) => handleGenericTextInput(currentQ.id, text)}
              keyboardType="numeric"
              placeholder={"Enter a number"}
              placeholderTextColor="#000000"
            />
          </View>
        ) : currentQ.type === 'radio' && currentQ.options ? (
          <View style={{width: '100%'}}>
            {(() => {
              // Questions to render as single-column list WITHOUT specific new icons from this request
              if (currentQ.id === 'gender' || 
                  currentQ.id === 'issue_duration_actual' || 
                  currentQ.id === 'flareup_frequency_actual') {
                const optionsToRender = currentQ.options || [];
                return (
                  <View style={{width: '100%'}}>{/* Ensure full width for single column & prevent text node */}
                    {optionsToRender.map((option: string, index: number) => (
                      <RadioOption
                        key={option} // Key on the RadioOption itself
                        label={option}
                        selected={answers[currentQ.id] === option}
                        onSelect={() => handleRadioSelect(option)}
                        isNewStyle={true}
                        itemIndex={index}
                        totalItems={optionsToRender.length}
                        currentQuestionIndex={currentQuestion}
                        // No icon props passed for these specific questions
                      />
                    ))}
                  </View>
                );
              } else if (currentQ.id === 'primary_cause_factor') {
                // Implement the actual primary cause factor selection UI
                const options = currentQ.options || [];
                return (
                  <View style={{width: '100%'}}>{/* Prevent text node */}
                    {options.map((option: string, index: number) => (
                      <RadioOption
                        key={option}
                        label={option}
                        selected={answers[currentQ.id] === option}
                        onSelect={() => handleRadioSelect(option)}
                        isNewStyle={true}
                        itemIndex={index}
                        totalItems={options.length}
                        currentQuestionIndex={currentQuestion}
                      />
                    ))}
                    
                    {/* Show the conditional slider if one is active */}
                    {activeConditionalSliderConfig && (
                      <Animated.View style={{
                        opacity: conditionalSliderAnim,
                        transform: [{ translateY: conditionalSliderAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0]
                        })}],
                        marginTop: 15,
                        marginBottom: 10
                      }}>
                        <ConditionalSliderComponent
                          config={activeConditionalSliderConfig}
                          value={answers[activeConditionalSliderConfig.id]}
                          onValueChange={(value) => setAnswers((prev: any) => ({ ...prev, [activeConditionalSliderConfig.id]: value }))}
                        />
                      </Animated.View>
                    )}
                  </View>
                );
              
              // Skin Concerns: Single column list WITH ICONS (new requirement)
              } else if (currentQ.id === 'skin_concerns') {
                const optionsToRender = currentQ.options || [];
                return (
                  <View style={{width: '100%'}}>{/* Ensure full width for single column & prevent text node */}
                    {optionsToRender.map((option: string, index: number) => (
                      <AnimatedConcernOption
                        key={option}
                        option={option}
                        index={index}
                        totalItems={optionsToRender.length}
                        isSelected={answers[currentQ.id] === option}
                        onSelect={() => handleRadioSelect(option)}
                        currentQuestionIndex={currentQuestion}
                      />
                    ))}
                  </View>
                );
              } else {
                // Generic Radio Option Rendering for others (referral_source, tried_other_apps, skin_type)
                let optionsToRender = currentQ.options || [];
                const materialColorMap: { [key: string]: string } = {};

                return (
                  <React.Fragment>
                    {optionsToRender.map((option: string, index: number) => {
                        let imageSourceToUse: ImageSourcePropType | undefined = undefined;
                        let iconNameToUse: any = undefined;
                        let iconColorToUse: string | undefined = undefined;

                        if (currentQ.id === 'referral_source') {
                            imageSourceToUse = CACHED_REFERRAL_SOURCE_IMAGE_MAP[option];
                            if (!imageSourceToUse) {
                                iconNameToUse = MATERIAL_REFERRAL_SOURCE_ICON_MAP[option];
                                iconColorToUse = materialColorMap[option]; 
                            }
                        } else if (currentQ.id === 'tried_other_apps') {
                            iconNameToUse = MATERIAL_TRIED_OTHER_APPS_ICON_MAP[option];
                            iconColorToUse = materialColorMap[option];
                        } else if (currentQ.id === 'skin_type') {
                            iconNameToUse = MATERIAL_SKIN_TYPE_ICON_MAP[option];
                            iconColorToUse = materialColorMap[option];
                        } else if (currentQ.id === 'restful_sleep_frequency') {
                            iconNameToUse = MATERIAL_RESTFUL_SLEEP_ICON_MAP[option];
                            iconColorToUse = materialColorMap[option];
                        } else if (currentQ.id === 'main_daily_exposure') {
                            iconNameToUse = MATERIAL_DAILY_EXPOSURE_ICON_MAP[option];
                            iconColorToUse = materialColorMap[option];
                        } else if (currentQ.id === 'post_cleanse_skin_feel') {
                            iconNameToUse = MATERIAL_POST_CLEANSE_SKIN_FEEL_ICON_MAP[option];
                            iconColorToUse = materialColorMap[option];
                        } else if (currentQ.id === 'skin_sensitivity') {
                            iconNameToUse = MATERIAL_SKIN_SENSITIVITY_ICON_MAP[option];
                            iconColorToUse = materialColorMap[option];
                        }
                        
                        // Apply special styling for "Not sure" icon
                        const iconSize = currentQ.id === 'skin_type' && option === 'Not sure' ? 28 : 24;
                        
                        return (
                            <RadioOption
                                key={option}
                                label={option}
                                selected={answers[currentQ.id] === option}
                                onSelect={() => handleRadioSelect(option)}
                                isNewStyle={true}
                                itemIndex={index}
                                totalItems={optionsToRender.length}
                                imageSource={imageSourceToUse}
                                iconName={iconNameToUse}
                                customIconColor={iconColorToUse}
                                currentQuestionIndex={currentQuestion}
                                iconSize={iconSize}
                            />
                        );
                    })}
                  </React.Fragment>
                );
                              }
              })()}
            </View>
          ) : currentQ.type === 'checkbox' && currentQ.id === 'skincare_products' ? (
          <View style={{width: '100%'}}> 
            {(currentQ.options || []).map((option: string, index: number) => (
              <AnimatedProductOption 
                key={option}
                option={option}
                index={index}
                totalItems={(currentQ.options || []).length}
                isSelected={
                  answers[currentQ.id] &&
                  Array.isArray(answers[currentQ.id]) &&
                  answers[currentQ.id].includes(option)
                }
                onToggle={() => handleCheckboxToggle(option)}
                currentQuestionIndex={currentQuestion}
              />
            ))}
          </View>
        // Fallback for other Checkbox questions (if any, without specific icons here)
        ) : currentQ.type === 'checkbox' && currentQ.options ? (
            <React.Fragment>
              {(currentQ.options || []).map((option: string, index: number) => (
                <React.Fragment key={index}>
                  <CheckboxOption
                    label={option}
                    selected={
                      answers[currentQ.id] &&
                      Array.isArray(answers[currentQ.id]) &&
                      answers[currentQ.id].includes(option)
                    }
                    onToggle={() => handleCheckboxToggle(option)}
                    isNewStyle={true}
                    itemIndex={index}
                    totalItems={(currentQ.options || []).length}
                    currentQuestionIndex={currentQuestion}
                  />
                  {option === 'Other' &&
                   answers[currentQ.id] &&
                   Array.isArray(answers[currentQ.id]) &&
                   answers[currentQ.id].includes('Other') && (
                    <TextInput
                      style={styles.otherInput}
                      value={answers[`${currentQ.id}_other`] || ''}
                      onChangeText={handleOtherTextInput}
                      placeholder="Please specify"
                      placeholderTextColor="#000000"
                    />
                  )}
                </React.Fragment>
              ))}
            </React.Fragment>
        ) : currentQ.type === 'boolean' ? (
        <View style={styles.booleanNewContainer}>
          {[false, true].map((boolValue: boolean, index: number) => (
            <SmoothBooleanOption
              key={boolValue ? 'yes' : 'no'}
              value={boolValue}
              index={index}
              isSelected={answers[currentQ.id] === boolValue}
              onSelect={() => handleBooleanSelect(boolValue)}
              currentQuestionIndex={currentQuestion}
            />
          ))}
          </View>
        ) : currentQ.type === 'grouped_column_select' && currentQ.subQuestions ? (
          <View style={styles.groupedColumnSelectContainer}>
            {currentQ.subQuestions.map((subQ) => (
              <View key={subQ.id} style={styles.columnContainer}>
                {subQ.label && <Text style={styles.columnHeader}>{subQ.label}</Text>}
                {(subQ.options || []).map((option: string, optionIndex: number) => {
                  const isSelected = answers[subQ.id] === option;
                  return (
                    <TouchableOpacity
                      key={optionIndex}
                      style={[styles.columnOptionRow, isSelected && styles.columnOptionRowSelected]}
                      onPress={() => handleColumnSelect(subQ.id, option)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.columnOptionText, isSelected && styles.columnOptionTextSelected]}>
                        {`• ${option}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        ) : (
          // Default case to ensure no null/undefined is rendered
          <View><Text>No content available for this question type</Text></View>
        )}
      </View>
    ); // This is the closing parenthesis for the main return of renderQuestionInputs
  }; // This is the closing brace for the renderQuestionInputs function itself

  const currentQ = questions[currentQuestion]; // Get current question data for title/subtitle
  const isCurrentQuestionScrollable = SCROLLABLE_QUESTION_IDS.includes(currentQ.id);
  
  // Check if we're showing the notification permission dialog
  const isShowingNotificationDialog = currentQ.type === 'notification_permission';
  
  // Track previous question to optimize background transitions
  const [previousQuestionType, setPreviousQuestionType] = useState<string | null>(null);
  
  // Constants for background colors
  const BG_COLOR_NORMAL = '#FFFFFF';
  const BG_COLOR_DIALOG = '#C8C8C8'; // Darker gray for stronger contrast
  const PROGRESS_BG_NORMAL = '#F0F0F0';
  const PROGRESS_BG_DIALOG = '#B0B0B0'; // Darkened progress background
  const BACK_BUTTON_BG_NORMAL = 'rgba(240, 240, 240, 0.7)';
  const BACK_BUTTON_BG_DIALOG = 'rgba(181, 181, 181, 0.85)'; // Using rgba for smooth transition
  
  // Effect to animate the background fade when showing notification dialog
  useEffect(() => {
    const wasShowingNotificationDialog = previousQuestionType === 'notification_permission';
    
    if (isShowingNotificationDialog && !wasShowingNotificationDialog) {
      // Fade in the darkened background only if coming from a non-notification screen
      Animated.timing(backgroundFadeAnim, {
        toValue: 1,
        duration: 350, // Faster fade-in for quick response
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false
      }).start();
    } else if (!isShowingNotificationDialog && wasShowingNotificationDialog) {
      // Fade out only if going from notification to non-notification screen
      Animated.timing(backgroundFadeAnim, {
        toValue: 0,
        duration: 300, // Slightly faster fade-out
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false
      }).start();
    }
    // If transitioning between notification screens, don't change background
    
    // Update previous question type for next transition
    setPreviousQuestionType(currentQ.type);
  }, [isShowingNotificationDialog, currentQ.type]);
  
  // Create animated background colors for consistent animation across all UI elements
  const bgColor = backgroundFadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [BG_COLOR_NORMAL, BG_COLOR_DIALOG]
  });
  
  // Progress bar background color
  const progressBarBgColor = backgroundFadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [PROGRESS_BG_NORMAL, PROGRESS_BG_DIALOG]
  });
  
  // Back button background color
  const backButtonBgColor = backgroundFadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [BACK_BUTTON_BG_NORMAL, BACK_BUTTON_BG_DIALOG]
  });
  
  // For safety, use a simple approach with interpolated string values for color transitions
  const [currentBgColor, setCurrentBgColor] = useState(BG_COLOR_NORMAL);
  const [currentBackButtonBgColor, setCurrentBackButtonBgColor] = useState(BACK_BUTTON_BG_NORMAL);
  const [currentProgressBgColor, setCurrentProgressBgColor] = useState(PROGRESS_BG_NORMAL);
  
  // Update the color values based on the animation value
  useEffect(() => {
    backgroundFadeAnim.addListener(({value}) => {
      // Linear interpolation between colors based on animation value
      if (value === 0) {
        setCurrentBgColor(BG_COLOR_NORMAL);
        setCurrentBackButtonBgColor(BACK_BUTTON_BG_NORMAL);
        setCurrentProgressBgColor(PROGRESS_BG_NORMAL);
      } else if (value === 1) {
        setCurrentBgColor(BG_COLOR_DIALOG);
        setCurrentBackButtonBgColor(BACK_BUTTON_BG_DIALOG);
        setCurrentProgressBgColor(PROGRESS_BG_DIALOG);
      } else {
        // Simple linear interpolation for intermediate values
        setCurrentBgColor(interpolateColor(value, BG_COLOR_NORMAL, BG_COLOR_DIALOG));
        setCurrentBackButtonBgColor(interpolateColor(value, BACK_BUTTON_BG_NORMAL, BACK_BUTTON_BG_DIALOG));
        setCurrentProgressBgColor(interpolateColor(value, PROGRESS_BG_NORMAL, PROGRESS_BG_DIALOG));
      }
    });
    
    return () => {
      backgroundFadeAnim.removeAllListeners();
    };
  }, []);
  
  // Color interpolation function that properly transitions between any color formats including rgba
  const interpolateColor = (value: number, color1: string, color2: string) => {
    // Parse colors to RGB/RGBA components
    const parseColor = (colorStr: string) => {
      if (colorStr.startsWith('#')) {
        // Handle hex colors
        const hex = colorStr.substring(1);
        return {
          r: parseInt(hex.substring(0, 2), 16),
          g: parseInt(hex.substring(2, 4), 16),
          b: parseInt(hex.substring(4, 6), 16),
          a: 1
        };
      } else if (colorStr.startsWith('rgba')) {
        // Handle rgba format, e.g., rgba(240, 240, 240, 0.7)
        const values = colorStr.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
        if (values) {
          return {
            r: parseInt(values[1], 10),
            g: parseInt(values[2], 10),
            b: parseInt(values[3], 10),
            a: parseFloat(values[4])
          };
        }
      }
      // Default to black if invalid
      return { r: 0, g: 0, b: 0, a: 1 };
    };
    
    // Convert both colors to RGB/RGBA components
    const color1Components = parseColor(color1);
    const color2Components = parseColor(color2);
    
    // Perform linear interpolation on all components including alpha
    const r = Math.round(color1Components.r + (color2Components.r - color1Components.r) * value);
    const g = Math.round(color1Components.g + (color2Components.g - color1Components.g) * value);
    const b = Math.round(color1Components.b + (color2Components.b - color1Components.b) * value);
    const a = color1Components.a + (color2Components.a - color1Components.a) * value;
    
    // Return appropriate color format based on alpha
    if (a < 1) {
      return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
    } else {
      // Convert to hex for solid colors
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
  };

  // Cleanup progress bar animation on unmount
  useEffect(() => {
    return () => {
      if (progressAnimationRef.current) {
        cancelAnimationFrame(progressAnimationRef.current);
        progressAnimationRef.current = null;
      }
    };
  }, []);

  const handleSupportLinkPress = async () => {
    const supportEmail = 'support@dewylabs.com';
    const url = `mailto:${supportEmail}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Could Not Open Mail App',
          `Please contact us at ${supportEmail}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Could Not Open Mail App',
        `Please contact us at ${supportEmail}`,
        [{ text: 'OK' }]
      );
    }
  };

   const Under13Overlay = () => (
    <View style={styles.under13Overlay}>
      <Text style={styles.under13Text}>
        Sorry! This app is for users 13 and older.
      </Text>
      <Text style={styles.under13SubText}>
        We cannot collect or process personal data from children under 13 in accordance with privacy laws.
      </Text>
      <Text style={styles.supportLink}>
        Accidentally entered the wrong birthdate?{' '}
        <Text style={styles.supportLinkUnderlined} onPress={handleSupportLinkPress}>
          Contact support
        </Text>
      </Text>
    </View>
  );






  const isPlanGenerationScreen = questions[currentQuestion]?.type === 'plan_generation';
  const isMotivationBoostScreen = questions[currentQuestion]?.id === 'motivation_boost';

  const footerStyle = {
    paddingHorizontal: 20,
    paddingTop: 10, 
    paddingBottom: (Platform.OS === 'ios' ? 30 : 20) + (insets.bottom || 0), 
    backgroundColor: isPlanGenerationScreen ? 'transparent' : currentBgColor,
    position: 'relative' as 'relative',
    zIndex: 10,
    transform: [{ translateY: footerTranslateY }]
  };

  return (
    <View style={{ flex: 1, backgroundColor: isPlanGenerationScreen ? 'transparent' : currentBgColor, paddingTop: insets.top, paddingBottom: 0, paddingLeft: insets.left, paddingRight: insets.right }}>
      {isPlanGenerationScreen && <BackgroundBlobs />}
      {isPlanGenerationScreen && <BlurView intensity={95} tint="light" style={StyleSheet.absoluteFill} />}
      {isPlanGenerationScreen && (
        <View style={styles.highFiveContainer}>
          <LottieView
            source={require('../../assets/lottie_json/high_five.json')}
            autoPlay
            loop={false}
            style={{ width: 450, height: 450 }}
          />
        </View>
      )}
      {isUnder13 && <Under13Overlay />}
      <ReactNativeStatusBar 
        backgroundColor={currentBgColor}
      />
      <StatusBar style="dark" />
      {isMotivationBoostScreen && (
        <View style={styles.mockDataOverlay}>
          <Text style={styles.mockDataText}>mock data</Text>
        </View>
      )}
          
          {/* --- Top Fixed Block --- */}
          <View style={[styles.topBlockContainer, { backgroundColor: 'transparent', paddingTop: 0 }]}>
            <View style={[styles.headerContainer, { backgroundColor: 'transparent' }]}>
              <View style={{ borderRadius: 20, overflow: 'hidden' }}>
                <TouchableOpacity 
                  onPress={goToPreviousQuestion} 
                  style={[
                    styles.backButton,
                    { backgroundColor: currentBackButtonBgColor }
                  ]}
                >
                  <ArrowLeft size={24} color="#333333" strokeWidth={1.5} />
                </TouchableOpacity>
              </View>
              <View style={styles.progressBarWrapper}>
                <ProgressBar
                  current={displayQuestionCount}
                  total={questions.length}
                  progress={progressWidth}
                  isDarkerMode={isShowingNotificationDialog}
                />
              </View>
            </View>
            {/* Question Title and Subtitle moved here */}
            {currentQ.type !== 'plan_generation' && (
              <View style={styles.questionTextContainer}> 
                <Text style={styles.questionTitle}>{currentQ.question}</Text>
                {/* Only show note field if it's not the motivation boost slide, since we moved that text to the bottom */}
                {currentQ.note && currentQ.id !== 'motivation_boost' ? (
                  <Text style={styles.questionSubtitle}>{currentQ.note}</Text>
                ) : null}
              </View>
            )}
            {validationError ? (
              <Text style={styles.errorText}>{validationError}</Text>
            ) : null} 
          </View>

          {/* --- Middle Scrollable Block --- */}
          <ScrollView
            ref={scrollViewRef}
            style={[styles.middleBlock, { backgroundColor: isPlanGenerationScreen ? 'transparent' : currentBgColor }]}
            contentContainerStyle={[styles.middleBlockContentContainer, { backgroundColor: 'transparent' }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            scrollEnabled={isCurrentQuestionScrollable} // Conditionally enable scrolling
          >
            {renderQuestionInputs()}
          </ScrollView>

          {/* --- Bottom Fixed Block --- */}
          <Animated.View 
            style={footerStyle}
          >
            {/* Personalized plan text now appears right above the Continue button */}
            {(currentQ.id === 'motivation_boost' || currentQ.id === 'generate_plan') && (
              <View style={[styles.bottomSubtitleContainer, currentQ.id === 'generate_plan' && { marginTop: 20 }]}>
                <Text style={styles.bottomSubtitleText}>
                  {currentQ.id === 'motivation_boost' ? 
                    'Your personalized plan is 90 seconds away' : 
                    'Your personalized plan is 30 seconds away'}
                </Text>
              </View>
            )}
            {/* Hide continue button for notification permission screen */}
            {currentQ.type !== 'notification_permission' && (
              <>
                {/* Disclaimer text for personalize_intro screen - moved above button */}
                {currentQ.id === 'personalize_intro' && (
                  <View style={styles.disclaimerContainer}></View>
                )}
                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    !isButtonEnabled && styles.disabledButton
                  ]}
                  onPress={goToNextQuestion}
                  disabled={!isButtonEnabled}
                  activeOpacity={1}
                >
                  <Text style={styles.continueButtonText}>
                    {currentQuestion === questions.length - 1 ? 'Continue' : 'Continue'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
      
    </View>
  );
};

const styles = StyleSheet.create({
  // New styles for the custom screens
  placeholderContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  placeholderText: {
    fontSize: 18,
    marginBottom: 30,
    textAlign: 'center',
  },
  skipButton: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  skipButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '500',
  },
  referralCodeContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  referralCodeNote: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  referralCodeInputGradient: {
    borderRadius: 12,
    width: '100%',
    marginBottom: 25,
    overflow: 'hidden',
  },
  referralCodeInput: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    fontSize: 14,
    width: '100%',
    backgroundColor: 'transparent',
  },
  planGenerationContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: 5,
  },
  planGenerationIcon: {
    marginBottom: 10,
  },
  planGenerationTitle: {
    fontSize: 28,
    fontWeight: '400', // Changed from '500' to '600'
    color: '#000000',
    textAlign: 'center',
    marginBottom: 0,
    paddingHorizontal: 20,
    transform: [{ translateY: -5 }],
  },
  circleProgressContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  handIconContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  allDoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  checkmarkText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 20,
  },
  subheadingText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 0,
  },
  guideText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
  },
  highFiveContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    ...StyleSheet.absoluteFillObject,
  },

  // keyboardAvoidingContainer removed
  // --- Styles for 3-block layout ---
  topBlockContainer: { // Contains header and question text
    paddingHorizontal: 20, // Match middleBlock's horizontal padding for alignment
    marginTop: 15, // Use a fixed padding now that the safe area is handled by the root view
    // backgroundColor: 'lightcoral', // For debugging layout
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // paddingHorizontal: 15, // Removed, handled by topBlockContainer
    // paddingTop: Platform.OS === 'android' ? (ReactNativeStatusBar.currentHeight ?? 0) + 5 : 15, // Moved to topBlockContainer
    paddingBottom: 10, 
    backgroundColor: '#FFFFFF', 
  },
  questionTextContainer: { // New container for question title and subtitle
    paddingVertical: 10, // Add some spacing around the question text
    // backgroundColor: 'lightgoldenrodyellow', // For debugging
  },
  middleBlock: { // This is the ScrollView itself
    flex: 1, // Takes up available space
    // backgroundColor: 'lightgreen', // For debugging layout
  },
  middleBlockContentContainer: { // For content within the ScrollView
    flexGrow: 1, // Important for content to fill or allow scrolling
    paddingHorizontal: 20,
    paddingBottom: 20, // Padding at the bottom of the scrollable content
  },
  // --- Existing styles (some modified) ---
  backButton: {
    padding: 8,
    marginRight: 12,
    backgroundColor: 'rgba(240, 240, 240, 0.7)',
    borderRadius: 20,
  },
  progressBarWrapper: {
    flex: 1, 
  },
  progressContainer: { 
    height: 3,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden', 
  },
  progressFill: { 
    height: '100%', 
    backgroundColor: '#000000',
    borderRadius: 4, 
  },
  // scrollContentContainer: { // OLD: This style is now handled by middleBlockContentContainer
  //   flexGrow: 1,
  //   paddingHorizontal: 20,
  //   paddingBottom: 20, 
  // },
  questionInputsContainer: { // NEW: Replaces questionContentContainer, for the Animated.View in renderQuestionInputs
    alignItems: 'flex-start', 
    width: '100%',
    paddingVertical: 10, // Keep some vertical padding for the inputs area
    // backgroundColor: 'lightsalmon' // For debugging
  },
  questionTitle: { 
    fontSize: 28, 
    fontWeight: '600', // Changed from '500' to '600'
    color: '#000000', 
    marginBottom: 8,
    textAlign: 'left', 
  },
  questionSubtitle: { 
    fontSize: 16,
    color: '#555555', 
    marginBottom: 15, // Reduced margin, as inputs are now in a separate block
    textAlign: 'left', 
  },
  // ... (newOptionButton, newOptionButtonSelected, text styles, continueButton, disabledButton, input styles, errorText, etc. remain largely unchanged) ...
  newOptionButton: { // This style is no longer the primary one, will be replaced by newOptionButtonShell
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 14, 
    marginBottom: 12,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2, 
  },
  newOptionButtonSelected: { // This will be primarily for text color, bg/shadow moves to new style
    backgroundColor: '#000000', 
    borderColor: '#000000', 
    shadowOpacity: 0.1, 
    shadowRadius: 3,
    elevation: 4,
    // Padding will be handled by newOptionButtonContent when this is part of newOptionButtonSelectedBackground
  },

  // New and Refactored Styles Start
  newOptionButtonShell: {
    borderRadius: 14,
    marginBottom: 12,
    width: '100%',
    overflow: 'hidden',
  },
  newOptionButtonContent: {
    paddingVertical: 22, // Reverted from 16 back to 22 (original before icon resizing)
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  newOptionButtonSelectedBackground: {
    backgroundColor: '#000000',
    // If you want a border on selected items, add it here:
    // borderWidth: 1,
    // borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Slight shadow for depth on selected
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3, // Keep elevation for selected state
  },
  // New and Refactored Styles End

  newOptionButtonText: {
    fontSize: 17,
    color: '#000000',
    fontWeight: '500',
  },
  newOptionButtonTextSelected: {
    color: '#FFFFFF', 
  },
  newOptionIcon: {
    // marginRight: 15, // Margin will be handled by iconCircleWrapper or its container if needed
    // The icon itself no longer needs direct margin if centered in a wrapper
  },
  iconCircleWrapper: {
    width: 44, // Increased from 40
    height: 44, // Increased from 40
    borderRadius: 22, // Increased from 20
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8, 
    // Shadow properties should remain removed
  },
  logoImage: {
    width: 24, // Increased from 20 (was 28, then 20)
    height: 24, // Increased from 20 (was 28, then 20)
    resizeMode: 'contain',
  },
  booleanNewContainer: {
    width: '100%',
    marginTop: 80,
  },
  continueButton: {
    backgroundColor: '#000000',
    paddingVertical: 18,
    borderRadius: 28, 
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600', // Changed from '500' to '600'
  },
  disabledButton: {
    backgroundColor: '#A0A0A0',
  },
  radioContainer: { /* ... */ },
  radioButton: { /* ... */ },
  radioButtonSelected: { /* ... */ },
  radioButtonInner: { /* ... */ },
  radioLabel: { /* ... */ },
  checkboxContainer: { /* ... */ },
  checkbox: { /* ... */ },
  checkboxSelected: { /* ... */ },
  checkboxLabel: { /* ... */ },
  numberInput: {
    borderWidth: 1,
    borderColor: '#BBBBBB',
    borderRadius: 12, 
    paddingVertical: 18, 
    paddingHorizontal: 20, 
    fontSize: 17, 
    marginVertical: 10,
    width: '100%',
    backgroundColor: '#F0F0F0', 
    color: '#333333', 
  },
  inputError: {
    borderColor: '#FF5252',
  },
  errorText: { 
    color: '#FF5252',
    fontSize: 14,
    marginTop: 5, 
    // marginBottom: 10, // No longer needed here, part of top block now
    textAlign: 'left', 
  },
  otherInput: { 
    borderWidth: 1,
    borderColor: '#BBBBBB',
    borderRadius: 12, 
    paddingVertical: 15, 
    paddingHorizontal: 20, 
    fontSize: 16, 
    marginVertical: 8, 
    marginLeft: 0, 
    width: '100%', 
    backgroundColor: '#F0F0F0', 
    color: '#333333',
  },
  detailsContainer: { 
    marginTop: 10,
    width: '100%',
  },
  detailsInput: { 
    borderWidth: 1,
    borderColor: '#BBBBBB',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    fontSize: 16,
    width: '100%',
    backgroundColor: '#F0F0F0',
    color: '#333333',
  },
  // Styles for Checkbox Grid
  checkboxGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  checkboxGridItem: {
    width: '48.5%', 
    // marginBottom is handled by newOptionButtonShell's own style
  },
  // Styles for Grouped Sliders
  groupedSliderContainer: {
    width: '100%',
    paddingVertical: 10,
  },
  sliderItemContainer: {
    marginBottom: 25, // Space between sliders
    width: '100%',
  },
  sliderLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 15, // Space between label and slider row
    textAlign: 'left',
  },
  sliderNote: {
    fontSize: 13,
    color: '#777777',
    marginTop: 5,
    textAlign: 'left',
  },
  // Styles for Grouped Column Select
  groupedColumnSelectContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 10,
    // backgroundColor: '#f0f0f0', // For debugging
  },
  columnContainer: {
    flex: 1, // Each column takes equal width
    // backgroundColor: '#e0e0e0', // For debugging
    marginHorizontal: 5, // Add some space between columns
  },
  columnHeader: {
    fontSize: 16,
    fontWeight: '600', // Changed from '500' to '600'
    color: '#000000', // Black header text
    marginBottom: 10,
    textAlign: 'left',
  },
  columnOptionRow: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD', // Light gray border for unselected
    backgroundColor: '#FFFFFF', // White background for unselected
  },
  columnOptionRowSelected: {
    borderColor: '#000000', // Black border for selected
    backgroundColor: '#F0F0F0', // Slightly darker background for selected
  },
  columnOptionText: {
    fontSize: 15,
    color: '#333333',
  },
  columnOptionTextSelected: {
    color: '#000000',
    fontWeight: '500',
  },
  conditionalSliderContainer: {
    width: '100%',
  },
  conditionalSliderLabel: {
    fontSize: 16, 
    fontWeight: '500', 
    color: '#333333', 
    marginBottom: 10,
    textAlign: 'center', 
  },
  sliderControlFullWidth: { 
    width: '100%', 
    height: 40, 
    marginBottom: 5, 
  },
  sliderValueText: { 
    fontSize: 15,
    fontWeight: '400',
    color: '#555555',
    textAlign: 'center',
    marginTop: 5, 
  },
  progressIndicatorContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  timeframeContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20, // Adjusted
    paddingBottom: 20, // Adjusted
    backgroundColor: 'rgba(245, 248, 255, 0.9)',
    borderRadius: 24,
    marginBottom: 25,
    shadowColor: '#5B8DEF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(230, 235, 255, 0.7)',
  },
  timeframeText: {
    fontSize: 20,
    lineHeight: 30,
    color: '#444444',
    textAlign: 'center',
    paddingHorizontal: 20,
    fontWeight: '500',
    marginBottom: 0, // Reduced from 10 to move graph up by 30px (accounting for padding changes too)
    letterSpacing: 0.2,
  },
  timeframeHighlight: {
    fontWeight: '600', // Changed from '500' to '600'
    color: '#3870E0',
    fontSize: 24,
  },
  graphDivider: {
    height: 1,
    backgroundColor: '#CCCCCC',
    width: '90%',
    marginVertical: 20,
    opacity: 0.7,
  },
  graphTitle: {
    fontSize: 24,
    fontWeight: '600', // Changed from '500' to '600'
    color: '#333333',
    marginBottom: 0,
    textAlign: 'center',
  },
  graphContainer: {
    width: '90%',
    height: 'auto',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: -30, // Increased negative margin from -20 to -30 to move graph up closer to title
    paddingBottom: 30, // Added padding at the bottom for more space
  },
  curveBackground: {
    width: '100%',
    height: 260, // Increased from 210 to make the container taller
    position: 'relative',
  },
  svgContainer: {
    width: '100%',
    height: '100%', // SVG should fill its designated curveBackground space
    position: 'absolute',
  },
  graphPoint: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 3, // Increased from 2.5
    borderColor: '#000000', // This will be overridden by specific dot styles
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    zIndex: 2,
    shadowColor: '#5B8DEF', // This will be overridden
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, // Increased from 0.25
    shadowRadius: 10, // Increased from 8
    elevation: 8, // Increased from 6
  },
  // Individual point positioning is now handled programmatically,
  // calculated directly from the curve's math in the component
  graphPointGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    position: 'absolute',
    zIndex: 2,
    shadowColor: '#FFB0B0', // Default, will be overridden if needed
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 12,
  },
  graphPointInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    display: 'flex', // Ensure flex display is used
  },
  graphPointText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    textAlignVertical: 'center', // For Android
    width: '100%', // Take up full width
    height: '100%', // Take up full height
    lineHeight: Platform.OS === 'ios' ? 36 : 44, // Adjust line height to center text vertically
  },
  graphLabels: {
    width: '100%', 
    height: 30,
    marginTop: 0, // Removed margin
    position: 'relative', 
  },
  labelContainer: {
    position: 'absolute', 
    width: 80, // Fixed width for labels
    alignItems: 'center',
  },
  graphLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#444444',
    textAlign: 'center',
    width: '100%', // Changed from 33% to 100% to fix the label display
    letterSpacing: 0.3,
  },
  resultLabel: {
    color: '#333333', // Darker color for better visibility
    fontWeight: 'bold',
    fontSize: 18, // Larger font size for emphasis
  },
  motivationImageContainer: {
    width: '100%',
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  motivationImage: {
    width: '90%',
    height: '100%',
    borderRadius: 16,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  imageBackupContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageBackupText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  roadmapContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  roadmapLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    position: 'relative',
    marginBottom: 10,
  },
  roadmapLine: {
    height: 3,
    backgroundColor: '#E0E0E0',
    width: '100%',
    position: 'absolute',
    zIndex: 1,
  },
  roadmapDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    zIndex: 2,
  },
  roadmapDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  roadmapDotText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  roadmapLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '85%',
  },
  roadmapLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    textAlign: 'center',
  },
  bottomSubtitleContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  bottomSubtitleText: {
    fontSize: 15, // Reduced from 17 to 15
    fontWeight: '500',
    color: '#5B73A7', // More harmonious blue-gray color
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  xAxisLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: '#CCCCCC',
    width: '86%', // Increased from 85% to make it wider
    bottom: 0, // Changed from 30 to 20 to position it lower, below dot 1
    left: '7%', // Center the wider line
  },
  xAxisLabelsContainer: { // Renamed from xAxisLabels
    position: 'absolute',
    width: '100%', // Full width to allow absolute positioning of week labels
    height: 20, // Explicit height
    bottom: -30,
    left: 7// Changed from 10 to 0 to move labels down accordingly
  },
  weekLabel: {
    fontSize: 14, 
    fontWeight: '400',
    color: '#666666',
  },
  privacyShieldContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  shieldAnimationContainer: {
    width: '90%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent', // Match the graph page background
    borderRadius: 24,
    marginBottom: 25,
    paddingVertical: 30,
    shadowColor: '#5B8DEF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(230, 235, 255, 0.7)',
  },
  shieldWrapper: {
    width: 260,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00BFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  shieldSvg: {
    alignSelf: 'center',
  },
  privacyTextContainer: {
    width: '90%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    marginTop: 10,
    backgroundColor: 'rgba(245, 248, 255, 0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(230, 235, 255, 0.7)',
    shadowColor: '#5B8DEF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  privacyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 5,
  },
  privacySubText: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    marginTop: 5,
    paddingHorizontal: 20,
  },
  animatedButtonShell: {
    borderRadius: 14,
    marginBottom: 12,
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    backgroundColor: 'transparent',
  },
  notificationWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 10, // Reset to normal position for regular notifications
    zIndex: 1000,
  },
  notificationWrapperLocation: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: -20, // Higher position only for location notifications
    zIndex: 1000,
  },
  notificationPermissionBox: {
    borderRadius: 20, // Increased from 14 to be more like Apple alerts
    width: '72%', // Reduced from 85% to be narrower like Apple alerts
    maxWidth: 300,
    marginTop: 20,
    marginBottom: 0, // Ensure no bottom margin
    paddingBottom: 0, // Ensure no bottom padding
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 }, // Increased shadow offset for more Apple-like depth
    shadowOpacity: 0.25, // Slightly increased opacity
    shadowRadius: 15, // Increased radius for softer shadow
    elevation: 8, // Increased elevation for Android
  },
  notificationPermissionTitle: {
    fontSize: 19, // Reduced from 20 to be more proportional
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 24, // Increased top margin for better spacing
    paddingHorizontal: 20, // Increased horizontal padding
    lineHeight: 24, // Added line height for better text spacing
  },
  notificationButtonContainer: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 0, 
    borderTopColor: 'rgba(0,0,0,0.2)',
    marginTop: -1, // ADDED: To pull the button container up and cover the hairline gap
  },
  notificationDontAllowButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderRightColor: 'rgba(0,0,0,0.2)',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  notificationDontAllowText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '500',
  },
  notificationAllowButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#222222',
  },
  notificationAllowText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
  },
  floatingInputGradient: {
    borderRadius: 12,
    width: '100%',
    marginBottom: 15, // Reduced from 25px to 15px
    overflow: 'hidden',
    height: 70, // Taller input field
  },
  floatingInput: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    fontSize: 30, // Even larger for maximum visibility
    fontWeight: '400', // More bold to enhance contrast
    width: '100%',
    backgroundColor: 'transparent',
    height: 70, // Match container height
  },
  floatingInputLabel: {
    fontWeight: '500',
    paddingLeft: 0,
  },
  // Focus frame styles
  focusFrameContainer: {
    width: 280,
    height: 325, // Increased height to make it more rectangular/taller
    position: 'relative',
    marginTop: 20,
    marginBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameCorner: {
    position: 'absolute',
    width: 80,
    height: 80,
  },
  topLeft: {
    left: 0,
    top: 0,
  },
  topRight: {
    right: 0,
    top: 0,
  },
  bottomLeft: {
    left: 0,
    bottom: 0,
  },
  bottomRight: {
    right: 0,
    bottom: 0,
  },
  faceImageContainer: {
    position: 'absolute',
    top: '50%', 
    left: '50%',
    transform: [{ translateX: -110 }, { translateY: -110 }],
    justifyContent: 'center',
    alignItems: 'center',
    width: 220,
    height: 220,
    zIndex: 10, // Ensure it's above the frame corners
  },
  faceImage: {
    width: 220,
    height: 220,
  },
  personalizeAnimationContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  // Overlay styles removed
  disclaimerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    marginBottom: 5,
  },
  disclaimerText: {
    fontSize: 15, // Reduced from 17 to 15
    fontWeight: '500',
    color: '#5B73A7', // More harmonious blue-gray color
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  dotGridContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    // Removed borderRadius to make dots squares instead of circles
  },
  mockDataOverlay: {
    position: 'absolute',
    top: height / 2 - 50,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  mockDataText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'red',
    opacity: 0.5,
    transform: [{ rotate: '-15deg' }],
  },
  notificationLocationBox: {
    borderRadius: 20,
    width: '75%', 
    maxWidth: 300, 
    paddingVertical: 15, 
    marginBottom: 0, 
    paddingBottom: 0, 
    overflow: 'hidden', // RESTORED
    backgroundColor: 'white',
    // borderWidth: 2, // REMOVED debugging border
    // borderColor: 'red', // REMOVED debugging border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 }, // Increased shadow offset for more Apple-like depth
    shadowOpacity: 0.25, // Slightly increased opacity
    shadowRadius: 15, // Increased radius for softer shadow
    elevation: 8, // Increased elevation for Android
  },
  notificationLocationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 10, 
    marginTop: 5, // REDUCED from 24 to lessen the gap above the title
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  mapPlaceholderContainer: {
    width: 300, // CHANGED: To extend side-to-side within its parent
    overflow: 'hidden',
    height: 200, 
    marginTop: 0, // CHANGED: Remove margin above
    marginBottom: 0, // CHANGED: Remove margin below
    borderWidth: 0, 
  },
  mapImage: {
    width: '100%',
    height: '100%',
    opacity: 1, 
    backgroundColor: 'transparent', // Ensuring background is transparent
    resizeMode: 'contain', 
  },
  locationSubtitle: {
    fontSize: 13,
    color: '#444444',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  locationSubtitleTop: {
    fontSize: 14,
    color: '#444444',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 21,
    marginBottom: 10,
  },
  locationButtonContainer: {
    flexDirection: 'column',
    width: '100%',
    alignItems: 'stretch', // Ensure buttons stretch to full width
  },
  locationButton: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    minHeight: 48,
    flexDirection: 'row', // Ensure horizontal centering works properly
  },
  locationButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    flex: 1, // Take up available space for proper centering
    includeFontPadding: false, // Remove default Android font padding that can affect centering
  },
  locationButtonWithBorder: {
    borderTopWidth: 0,
    borderTopColor: 'rgba(0,0,0,0.2)',
  },
  locationButtonLast: {
    borderTopWidth: 0, // Keep border for consistency
  },
  
  locationButtonInner: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  // New styles for under 13 overlay
  under13Overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  under13Text: {
      color: 'white',
      fontSize: 24,
      fontWeight: '600',
      textAlign: 'center',
      paddingHorizontal: 30,
      marginBottom: 15,
  },
  under13SubText: {
      color: 'white',
      fontSize: 16,
      textAlign: 'center',
      paddingHorizontal: 40,
      lineHeight: 22,
  },
  supportLink: {
    color: 'white',
    fontSize: 14,
    marginTop: 30,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  supportLinkUnderlined: {
    textDecorationLine: 'underline',
  },
  blob1: {
    position: 'absolute',
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.3,
    left: width * 0.05,
    backgroundColor: 'rgba(255, 168, 168, 0.2)',
  },
  blob2: {
    position: 'absolute',
    width: width * 0.65,
    height: width * 0.65,
    borderRadius: width * 0.325,
    right: -width * 0.05,
    backgroundColor: 'rgba(186, 190, 255, 0.3)',
  },
});

// Add this ScanLine component above the QuestionnaireScreen component (before const QuestionnaireScreen = () => {)
// ScanLine component for scan animation
const ScanLine = () => {
  // Use standard useState for position only
  const [position, setPosition] = useState(-150);
  const animationRef = useRef<number | null>(null);
  const directionRef = useRef(1); // 1 = down, -1 = up
  const prevTimeRef = useRef(0);
  const easingRef = useRef(1); // For smooth direction transitions

  // Animation using requestAnimationFrame
  useEffect(() => {
    const animate = (time: number) => {
      if (!prevTimeRef.current) {
        prevTimeRef.current = time;
      }
      
      // Control animation speed - update every ~16ms (60fps)
      const deltaTime = time - prevTimeRef.current;
      if (deltaTime > 16) {
        prevTimeRef.current = time;
        
        // Update position based on direction with easing
        setPosition(prevPos => {
          const bounds = { min: -150, max: 150 };
          const easeDistance = 30; // Distance over which to ease the transition
          
          // Calculate easing factor based on proximity to bounds
          let easingFactor = 1;
          if (prevPos >= bounds.max - easeDistance && directionRef.current === 1) {
            // Approaching top, ease out
            const distanceFromBound = bounds.max - prevPos;
            easingFactor = Math.max(0.1, distanceFromBound / easeDistance);
          } else if (prevPos <= bounds.min + easeDistance && directionRef.current === -1) {
            // Approaching bottom, ease out
            const distanceFromBound = prevPos - bounds.min;
            easingFactor = Math.max(0.1, distanceFromBound / easeDistance);
          }
          
          const baseSpeed = 3;
          const newPos = prevPos + (directionRef.current * baseSpeed * easingFactor);
          
          // Check bounds and change direction with smooth transition
          if (newPos >= bounds.max && directionRef.current === 1) {
            directionRef.current = -1;
            return bounds.max;
          } else if (newPos <= bounds.min && directionRef.current === -1) {
            directionRef.current = 1;
            return bounds.min;
          }
          
          return newPos;
        });
      }
      
      // Continue animation loop
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    animationRef.current = requestAnimationFrame(animate);
    
    // Cleanup on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  return (
    <View
      style={{
        position: 'absolute',
        width: '100%',
        height: 2,
        zIndex: 1 // Below the white clone frames (zIndex: 11) and visible frames (zIndex: 12)
      }}
    >
      {/* Main scan line with gradient */}
      <View style={{ position: 'relative', width: '100%', height: '100%' }}>
        <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
          <Defs>
            <SvgLinearGradient id="scanLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#FFA8A8" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#A8C5FF" stopOpacity="0.9" />
            </SvgLinearGradient>
          </Defs>
          <Rect
            x="-7.5%"
            y={position}
            width="115%"
            height="2"
            fill="url(#scanLineGradient)"
          />
        </Svg>
      </View>
    </View>
  );
};

// --- Dot Grid Component ---
const DotGrid = () => {
  // 13x11 grid pattern based on the provided ASCII representation
  // 1 = visible red dot (X), 0 = invisible (.)
  const gridPattern = [
    [0,0,1,1,1,0,0,0,1,1,1,0,0], // ..XXX...XXX..
    [0,1,1,1,1,1,0,1,1,1,1,1,0], // .XXXXX.XXXXX.
    [1,1,1,1,1,1,1,1,1,1,1,1,1], // XXXXXXXXXXXXX
    [1,1,1,1,1,1,1,1,1,1,1,1,1], // XXXXXXXXXXXXX
    [1,1,1,1,1,1,1,1,1,1,1,1,1], // XXXXXXXXXXXXX
    [0,1,1,1,1,1,1,1,1,1,1,1,0], // .XXXXXXXXXXX.
    [0,0,1,1,1,1,1,1,1,1,1,0,0], // ..XXXXXXXXX..
    [0,0,0,1,1,1,1,1,1,1,0,0,0], // ...XXXXXXX...
    [0,0,0,0,1,1,1,1,1,0,0,0,0], // ....XXXXX....
    [0,0,0,0,0,1,1,1,0,0,0,0,0], // .....XXX.....
    [0,0,0,0,0,0,1,0,0,0,0,0,0]  // ......X......
  ];

  const dotSize = 8; // Size of each dot
  const spacing = 20; // Space between dots
  const gridWidth = (gridPattern[0].length - 1) * spacing + dotSize;
  const gridHeight = (gridPattern.length - 1) * spacing + dotSize;

  // Find the center of the grid for wave animation
  const centerRow = Math.floor(gridPattern.length / 2);
  const centerCol = Math.floor(gridPattern[0].length / 2);

  // Animation value for the wave effect
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Create a single pulse animation (no loop) with timing offset
    const createPulseAnimation = () => {
      return Animated.timing(waveAnim, {
        toValue: 1,
        duration: 1300,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.quad),
      });
    };

    const animation = createPulseAnimation();
    animation.start();

    return () => {
      animation.stop();
    };
  }, []);

  // Calculate distance from center for each dot
  const getDistanceFromCenter = (row: number, col: number) => {
    return Math.sqrt(Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2));
  };

  // Get the maximum distance to normalize the pulse effect
  const maxDistance = Math.max(
    ...gridPattern.flatMap((row, rowIndex) =>
      row.map((_, colIndex) => getDistanceFromCenter(rowIndex, colIndex))
    )
  );

  return (
    <View style={[styles.dotGridContainer, { 
      width: gridWidth, 
      height: gridHeight,
      marginTop: 25 // Move the entire heart down 25px
    }]}>
      {gridPattern.map((row, rowIndex) => 
        row.map((dot, colIndex) => {
          if (dot === 0) return null; // Don't render invisible dots

          const distance = getDistanceFromCenter(rowIndex, colIndex);
          const normalizedDistance = distance / maxDistance;
          
          // Calculate size multiplier - uniform for all dots (perfectly tiling)
          const sizeMultiplier = 1.0; // Will be multiplied by spacing/2 for perfect tiling
          
          // Calculate gradient color based on position (coral to blue)
          const normalizedX = colIndex / (gridPattern[0].length - 1); // 0 to 1 from left to right
          const normalizedY = rowIndex / (gridPattern.length - 1); // 0 to 1 from top to bottom
          
          // Create beautiful gradient using notification graphic colors (coral-pink to blue)
          const startR = 255, startG = 208, startB = 208;  // #FFD0D0 (Notification start color)
          const endR = 201, endG = 215, endB = 248;     // #C9D7F8 (Notification end color)
          
          // Interpolate based on diagonal position (top-left start color, bottom-right end color)
          const gradientProgress = (normalizedX + normalizedY) / 2;
          const r = Math.round(startR + (endR - startR) * gradientProgress);
          const g = Math.round(startG + (endG - startG) * gradientProgress);
          const b = Math.round(startB + (endB - startB) * gradientProgress);
          
          const adjustedDistance = Math.max(0.01, normalizedDistance);
          
          // Create smooth easing curve: ease-out-quart to peak, ease-in-quart from peak
          const midPoint = adjustedDistance;
          const quarterPoint1 = adjustedDistance * 0.5;
          const quarterPoint2 = adjustedDistance + (1 - adjustedDistance) * 0.5;
          
          return (
            <Animated.View
              key={`dot-${rowIndex}-${colIndex}`}
              style={[
                styles.dot,
                {
                  position: 'absolute',
                  left: colIndex * spacing,
                  top: rowIndex * spacing,
                  width: spacing, // Perfect tiling: square size = spacing
                  height: spacing, // Perfect tiling: square size = spacing
                  backgroundColor: `rgb(${r}, ${g}, ${b})`, // Gradient color
                  opacity: 0.97,
                  transform: [
                    {
                      scale: waveAnim.interpolate({
                        inputRange: [0, quarterPoint1, midPoint, quarterPoint2, 1],
                        outputRange: [
                          0,                           // Start at 0
                          sizeMultiplier * 0.7,       // Ease-out-quart: fast start, slowing down
                          sizeMultiplier,              // Peak size (stays at this size)
                          sizeMultiplier,              // Stay at peak size
                          sizeMultiplier               // End at peak size (no return to 0)
                        ],
                        extrapolate: 'clamp',
                      })
                    }
                  ],
                }
              ]}
            />
          );
        })
      )}
    </View>
  );
};

// --- Personalize Intro Animation Component ---
const PersonalizeIntroAnimation = () => {
  return (
    <View style={styles.personalizeAnimationContainer}>
      <DotGrid />
    </View>
  );
};


  // Randomized properties for each piece


  



 



export default QuestionnaireScreen;
