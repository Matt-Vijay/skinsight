import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, SafeAreaView, TouchableOpacity, Easing, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp, StackActions, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { FaceScanStackParamList } from '@/navigation/FaceScanNavigator';
import { AuthStackParamList } from '@/navigation/AuthNavigator';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useAuth } from '@/context/AuthContext';
import { supabase, uploadImage } from '@/config/supabase';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import * as base64 from 'base64-js';
import { logger } from '@/config/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type SubmissionLoadingScreenRouteProp = RouteProp<FaceScanStackParamList, 'SubmissionLoadingScreen'> | RouteProp<AuthStackParamList, 'SubmissionLoadingScreen'>;

// Correct gradient colors from the questionnaire shield graphic
const GRADIENT_CORAL = '#FFA8A8'; 
const GRADIENT_BLUE = '#A8C5FF';

// Final sizing adjustments
const CIRCLE_SIZE = width * 0.6;
const CIRCLE_STROKE_WIDTH = 18; // Thinner progress bar
const CIRCLE_RADIUS = (CIRCLE_SIZE / 2) - (CIRCLE_STROKE_WIDTH / 2);
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

const PROFILES = [
  { name: 'Front Profile' },
  { name: 'Left Profile' },
  { name: 'Right Profile' },
];

const SubmissionLoadingScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<SubmissionLoadingScreenRouteProp>();
  const { imageUris, anonymousQuestionnaireId } = route.params;

  const [progress, setProgress] = useState(0);
  const [analysisData, setAnalysisData] = useState(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isApiCallComplete, setIsApiCallComplete] = useState(false);
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkmarkAnims = useRef(Array(6).fill(null).map(() => new Animated.Value(0))).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Updated steps for skincare analysis
  const steps = [
    "This may take up to a minute...",
    "This may take up to a minute...",
    "This may take up to a minute...", 
    "This may take up to a minute...",
    "This may take up to a minute...",
    "This may take up to a minute...",
  ];

  // Updated recommendations for skincare
  const recommendations = [
    "Skin Profile Analysis",
    "Key Concerns",
    "Ingredient Recommendations",
    "Product Suggestions",
    "Routine Synergies",
    "Finalizing report..."
  ];

  useEffect(() => {
    const performAnalysis = async () => {
      if (!imageUris) {
        setError("Image data is missing. Please go back and try again.");
        logger.error('[SubmissionLoadingScreen] Pre-analysis check failed: imageUris missing.');
        setIsApiCallComplete(true);
        return;
      }

      try {
        // 1. Generate a unique session ID. This is the primary identifier for the anonymous process.
        
        const imagesToUpload = [imageUris.frontImageUri, imageUris.leftImageUri, imageUris.rightImageUri];

        const uploadPromises = imagesToUpload.map(async (imageUri, index) => {
          if (!imageUri) {
            return null;
          }

          const profileName = PROFILES[index].name.toLowerCase().replace(' ', '_');
          const fileExt = 'jpeg'; // We are standardizing to JPEG
          const fileName = `${profileName}_${Date.now()}.${fileExt}`;
          // The upload path is now based on the anonymous session ID, not a user ID.
          const filePath = `anonymous_uploads/${anonymousQuestionnaireId}/${fileName}`;
          
          // Resize the image to a max width of 1080px for faster uploads
          const resizedImage = await ImageManipulator.manipulateAsync(
            imageUri,
            [{ resize: { width: 1080 } }],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
          );

          // Fetch the resized image as a blob, then convert to ArrayBuffer
          const response = await fetch(resizedImage.uri);
          const blob = await response.blob();
          const arrayBuffer = await new Response(blob).arrayBuffer();

          await uploadImage(arrayBuffer, filePath, blob.type);
          
          return filePath;
        });

        const imagePaths = (await Promise.all(uploadPromises)).filter(p => p !== null) as string[];

        // If no images were successfully uploaded, abort.
        if (imagePaths.length === 0) {
          throw new Error("All image uploads failed. Aborting analysis.");
        }

        // --- Store data for potential migration ---
        try {
          // The edge function needs just the filenames, not the full paths.
          const imageFileNames = imagePaths.map(p => p.split('/').pop()).filter(Boolean) as string[];
          const scanId = new Date().toISOString();

          await AsyncStorage.setItem('anonymous_questionnaire_id', anonymousQuestionnaireId);
          await AsyncStorage.setItem('anonymous_image_folder_id', anonymousQuestionnaireId);
          await AsyncStorage.setItem('scanId', scanId);
          await AsyncStorage.setItem('imagePaths', JSON.stringify(imageFileNames));
        } catch (storageError) {
          // This is not a fatal error for the anonymous flow, so just log it.
          logger.warn('Failed to store migration data in AsyncStorage', storageError);
        }
        // --- End of migration data storage ---
        
        // 3. Call the Supabase Edge Function with real data
        const { data, error: functionError } = await supabase.functions.invoke('generate-analysis', {
          body: {
            anonymous_session_id: anonymousQuestionnaireId, // Use the questionnaire ID here
            anonymous_questionnaire_id: anonymousQuestionnaireId,
            image_paths: imagePaths,
          },
        });

        setIsApiCallComplete(true);

        if (functionError) {
          logger.error("Edge function error:", JSON.stringify(functionError, null, 2));
          throw functionError;
        }
        
        // 4. Set final data and let other effects handle navigation
        setAnalysisData(data);

      } catch (e: any) {
        logger.error("Analysis submission failed", { message: e.message, error: e });
        setError(e.message || 'An unknown error occurred during submission.');
        setIsApiCallComplete(true);
      }
    };

    performAnalysis();
  }, [imageUris, anonymousQuestionnaireId]);

  // Synchronize progress state with the animated value
  useEffect(() => {
    const listenerId = progressAnim.addListener((p) => {
      const currentProgress = Math.floor(p.value * 100);
      setProgress(currentProgress);
    });

    return () => {
      progressAnim.removeListener(listenerId);
    };
  }, [progressAnim]);

  // Smooth, pseudo-random progress animation
  useEffect(() => {
    let isMounted = true;
    animationRef.current = null;

    const startFinalSequence = () => {
      // Phase 2: Slow, deliberate progress from 93% to 96%
      const finalSequence = Animated.sequence([
        Animated.timing(progressAnim, { toValue: 0.94, duration: 3000, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(progressAnim, { toValue: 0.95, duration: 3000, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(progressAnim, { toValue: 0.96, duration: 3000, easing: Easing.linear, useNativeDriver: false }),
      ]);
      
      animationRef.current = finalSequence;
      // This sequence will pause at 96% and wait for the completion useEffect to take over.
      finalSequence.start();
    };

    const runRandomAnimationStep = (currentValue: number) => {
      // End of random phase, move to the timed final sequence
      if (currentValue >= 0.93 || !isMounted) {
        if (isMounted) startFinalSequence();
        return;
      }
      
      // Calculate next step to feel more random
      const remainingProgress = 0.93 - currentValue;
      const increment = Math.min(remainingProgress, 0.04 + Math.random() * 0.08); // 4% to 12%
      const nextValue = currentValue + increment;
      
      // Calculate duration to have a varied but somewhat consistent speed, aiming for ~20s total
      const duration = 1600 + Math.random() * 2400; // 1.6s to 4s per step

      const stepAnimation = Animated.timing(progressAnim, {
        toValue: nextValue,
        duration: duration,
        easing: Easing.linear, // Linear easing within each step for smoothness
        useNativeDriver: false
      });

      animationRef.current = stepAnimation;
      stepAnimation.start(({ finished }) => {
        // If the animation completed (wasn't interrupted) and component is still mounted, run next step
        if (finished && isMounted) {
          runRandomAnimationStep(nextValue);
        }
      });
    };

    runRandomAnimationStep(0); // Kick off the animation chain

    return () => {
      isMounted = false;
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, []);
  
  // Fade in the bottom card on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Handles all completion scenarios (early or on-time)
  useEffect(() => {
    if (isApiCallComplete) {
      // API is done. Stop whatever animation is running.
      if (animationRef.current) {
        animationRef.current.stop();
      }
      
      // Quickly animate to 100% from wherever we are.
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1200, // A quick but smooth completion
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start(() => {
        setIsAnimationComplete(true);
      });
    }
  }, [isApiCallComplete]);

  useEffect(() => {
    if (isAnimationComplete) {
      if (analysisData) {
        // All steps are complete, navigate to the analysis screen
        navigation.dispatch(StackActions.replace('AnalysisScreen', { analysisData }));
      } else if (error) {
        // Handle error state by showing an alert
        logger.error('[SubmissionLoadingScreen] Animation complete, showing error alert:', error);
        Alert.alert(
          'Analysis Failed',
          `We couldn't complete your skin analysis. Please check your internet connection and try again. \n\nError: ${error}`,
          [
            {
              text: 'Try Again',
              onPress: () => {
                // Go back to the face scan screen to allow user to restart
                if (navigation.canGoBack()) {
                  navigation.goBack();
                }
              },
              style: 'default',
            },
            {
              text: 'Cancel',
              onPress: () => {
                // Reset the navigation stack to the main authenticated route
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Main' }],
                  })
                );
              },
              style: 'cancel',
            },
          ]
        );
      }
    }
  }, [isAnimationComplete, analysisData, error, navigation]);

  // Update steps based on progress
  useEffect(() => {
    if (progress < 5) setCurrentStep(0);
    else if (progress < 20) setCurrentStep(1);
    else if (progress < 40) setCurrentStep(2);
    else if (progress < 60) setCurrentStep(3);
    else if (progress < 85) setCurrentStep(4);
    else setCurrentStep(5);
  }, [progress]);

  // Animate checkmarks as steps complete
  useEffect(() => {
    // Don't animate past the last checkmark
    if (currentStep < checkmarkAnims.length) {
      Animated.timing(checkmarkAnims[currentStep], {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [currentStep]);
  
  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCLE_CIRCUMFERENCE, 0],
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Content */}
      <View style={styles.topContent}>
        <View style={styles.circularProgressContainer}>
            <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} viewBox={`0 0 ${CIRCLE_SIZE} ${CIRCLE_SIZE}`}>
                <Defs>
                    <SvgLinearGradient id="progressGradient" x1="100%" y1="0%" x2="0%" y2="100%">
                        <Stop offset="0%" stopColor={GRADIENT_CORAL} />
                        <Stop offset="100%" stopColor={GRADIENT_BLUE} />
                    </SvgLinearGradient>
                </Defs>
                {/* Background Circle */}
                <Circle
                    cx={CIRCLE_SIZE / 2}
                    cy={CIRCLE_SIZE / 2}
                    r={CIRCLE_RADIUS}
                    stroke="#E5E5E5"
                    strokeWidth={CIRCLE_STROKE_WIDTH}
                    fill="transparent"
                />
                {/* Progress Circle */}
                <AnimatedCircle
                    cx={CIRCLE_SIZE / 2}
                    cy={CIRCLE_SIZE / 2}
                    r={CIRCLE_RADIUS}
                    stroke="url(#progressGradient)"
                    strokeWidth={CIRCLE_STROKE_WIDTH}
                    fill="transparent"
                    strokeDasharray={CIRCLE_CIRCUMFERENCE}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    originX={CIRCLE_SIZE / 2}
                    originY={CIRCLE_SIZE / 2}
                    rotation="-90"
                />
            </Svg>
            <Text style={styles.percentageText}>{progress}%</Text>
        </View>
        
        {/* Main Title */}
        <Text style={styles.titleText}>
          We're setting{'\n'}everything up for you
        </Text>

        {/* Current Step */}
        <Text style={styles.stepText}>
          {steps[currentStep] || "Finalizing your report..."}
        </Text>
      </View>

      {/* Bottom Content */}
      <View style={styles.bottomContent}>
        <Animated.View style={[styles.recommendationsCard, { opacity: fadeAnim }]}>
          <Text style={styles.cardTitle}>Building Your Personalized Report</Text>
          <View style={styles.recommendationsList}>
            {recommendations.map((item, index) => (
              <View key={item} style={styles.recommendationItem}>
                <Text style={styles.recommendationText}>• {item}</Text>
                <Animated.View style={[
                  styles.checkmarkContainer,
                  { opacity: checkmarkAnims[index] }
                ]}>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                </Animated.View>
              </View>
            ))}
          </View>
        </Animated.View>
    </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  topContent: {
    alignItems: 'center',
    width: '100%',
    marginTop: height * 0.08,
  },
  bottomContent: {
    marginTop: 30, // Reduced gap further
    alignItems: 'center',
  },
  circularProgressContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  percentageText: {
    position: 'absolute',
    fontSize: 64,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
  },
  titleText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 20,
  },
  stepText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  recommendationsCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    paddingVertical: 20, // Reduced vertical padding
    paddingHorizontal: 24,
    width: width * 0.85,
    maxWidth: 400,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  recommendationsList: {
    gap: 8, // Reduced gap between items
  },
  recommendationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recommendationText: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#A8C5FF', // Solid light-blue background
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SubmissionLoadingScreen;
