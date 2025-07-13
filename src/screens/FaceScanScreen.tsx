import 'react-native-get-random-values'; // This must be the first import
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, PermissionStatus } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Droplets,
  Glasses,
  SmilePlus,
  Smartphone,
  Sun,
  UserRound
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImageManipulator from 'expo-image-manipulator';
import { StackActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { FaceScanStackParamList } from '@/navigation/FaceScanNavigator';
import { AuthStackParamList } from '@/navigation/AuthNavigator';

import Svg, { Defs, Rect, Mask, Path, LinearGradient as SvgLinearGradient, Stop as SvgStop } from 'react-native-svg';
import { supabase, uploadImage, getImageUrl } from '@/config/supabase';
import * as FileSystem from 'expo-file-system';
import * as base64 from 'base64-js';
import { v4 as uuidv4 } from 'uuid';
import { BlurView } from 'expo-blur';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { submitQuestionnaireData } from '@/services/submissionService';
import { logger } from '@/config/logger';

const { width, height } = Dimensions.get('window');
const FRAME_WIDTH = width * 0.85;
const FRAME_HEIGHT = FRAME_WIDTH * 1.6;
const FRAME_BORDER_RADIUS = 24;
const FRAME_BORDER_THICKNESS = 2;
const GRADIENT_START_COLOR = '#FFD0D0';
const GRADIENT_END_COLOR = '#C9D7F8';
const USE_PHOTO_GRADIENT_START = '#C9D7F8';
const USE_PHOTO_GRADIENT_END = '#A0B8F0';
const VERTICAL_OFFSET = 20;
const PREVIEW_OFFSET_FACTOR = -0.12; // -12% of screen height
const TRANSITION_DURATION = 200; // milliseconds
const PROGRESS_BAR_WIDTH = width * 0.6; // Width for the new progress bar
const PROGRESS_BAR_HEIGHT = 3; // Changed from 6 to 3

// Define profile types for each capture
const PROFILES = [
  { id: 1, name: 'Front Profile', icon: UserRound },
  { id: 2, name: 'Left Profile', icon: ArrowLeft },
  { id: 3, name: 'Right Profile', icon: ArrowRight },
];

// Define a type for storing captured profile data
type CapturedProfile = {
  imageUri: string;
  bgImageUri: string;
};

// Define a bezier curve for the transition
const createBezierEasing = () => {
  // Parameters for a nice ease-in-out curve (x1, y1, x2, y2)
  return Easing.bezier(0.25, 0.1, 0.25, 1.0);
};

const FaceScanScreen = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBackgroundImage, setCapturedBackgroundImage] = useState<string | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [capturedImages, setCapturedImages] = useState<CapturedProfile[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [cameraType, setCameraType] = useState<'front' | 'back'>('front');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const segmentOpacities = useRef(PROFILES.map(() => new Animated.Value(0))).current;
  const darkenOverlayOpacityAnim = useRef(new Animated.Value(0)).current;
  const cameraControlsOpacityAnim = useRef(new Animated.Value(1)).current;
  const previewControlsOpacityAnim = useRef(new Animated.Value(0)).current;
  const bgOpacityAnim = useRef(new Animated.Value(0)).current;
  const blurIntensityAnim = useRef(new Animated.Value(40)).current;
  const navigation = useNavigation<any>();
  const route = useRoute(); // <-- Add this line
  const cameraRef = useRef<CameraView>(null);

  // Request camera permission on mount
  useEffect(() => {
    requestPermission();
  }, []);

  // Get current user ID from Supabase - This function will be called LATER, not on mount
  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        return user.id; // Return the user ID
      } else {
        logger.warn('No authenticated user found when trying to get user ID for upload.');
        // REMOVED: Blocking alert and navigation.goBack()
        return null; // Return null if no user
      }
    } catch (error) {
      logger.error('Error getting current user:', error);
      // REMOVED: Blocking alert and navigation.goBack()
      return null; // Return null on error
    }
  };

  // Helper to show preview for the previous step if image exists
  const showPreviewForPreviousProfile = () => {
    if (currentProfileIndex === 0 || isTransitioning) return;

    const prevIndex = currentProfileIndex - 1;
    const previousProfile = capturedImages[prevIndex]; // Check if a profile exists for the previous step

    if (previousProfile) {
      setIsTransitioning(true);
      setCapturedImage(previousProfile.imageUri);
      setCapturedBackgroundImage(previousProfile.bgImageUri);
      setCurrentProfileIndex(prevIndex); // Go back to the previous profile index
      setIsPreviewVisible(true);      // Show the preview screen
      
      // Prepare animations
      fadeAnim.setValue(0);
      darkenOverlayOpacityAnim.setValue(0);
      bgOpacityAnim.setValue(0);

      Animated.parallel([
        // Fade in the dark overlay
        Animated.timing(darkenOverlayOpacityAnim, { 
          toValue: 0.85, 
          duration: TRANSITION_DURATION, 
          easing: createBezierEasing(), 
          useNativeDriver: true 
        }),
        // Fade in the preview image
        Animated.timing(fadeAnim, { 
          toValue: 1, 
          duration: TRANSITION_DURATION, 
          easing: createBezierEasing(), 
          useNativeDriver: true 
        }),
        // Fade in the freeze-frame background
        Animated.timing(bgOpacityAnim, {
          toValue: 1,
          duration: TRANSITION_DURATION,
          easing: createBezierEasing(),
          useNativeDriver: true,
        }),
        // Fade out camera controls
        Animated.timing(cameraControlsOpacityAnim, {
          toValue: 0,
          duration: TRANSITION_DURATION,
          easing: createBezierEasing(),
          useNativeDriver: true,
        }),
        // Fade in preview controls
        Animated.timing(previewControlsOpacityAnim, {
          toValue: 1,
          duration: TRANSITION_DURATION,
          easing: createBezierEasing(),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsTransitioning(false);
      });
    } else {
      // No confirmed image for the previous step, so go to its camera view
      transitionToPreviousProfile(); // This existing function handles camera view for prev profile
    }
  };

  const handleClose = () => {
    if (isPreviewVisible) {
      handleRetake(); // If current photo preview is visible, Retake means go back to camera for current step
    } else if (currentProfileIndex > 0) {
      showPreviewForPreviousProfile(); // If in camera view (not first step), try to show previous photo's preview
    } else { // currentProfileIndex === 0 and not in preview (in camera view for first step)
      navigation.goBack(); 
    }
  };

  const handleHelp = () => {
    // Show custom help modal instead of Alert
    setHelpModalVisible(true);
  };

  const handleCapture = async () => {
    if (isCapturing) return;
    
    if (cameraRef.current) {
      try {
        setIsCapturing(true);
        
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          exif: false,
        });

        if (!photo) {
          throw new Error('Failed to capture photo');
        }

        // Calculate the actual frame position in the image
        // We need to map screen coordinates to image coordinates
        const frameX = (photo.width - (photo.width * (FRAME_WIDTH / width))) / 2;
        const frameY = (photo.height - (photo.height * (FRAME_HEIGHT / height))) / 2 + (photo.height * (VERTICAL_OFFSET / height));
        const frameW = photo.width * (FRAME_WIDTH / width);
        const frameH = photo.height * (FRAME_HEIGHT / height);

        // Process and crop the image to match the frame
        const processedImage = await ImageManipulator.manipulateAsync(
          photo.uri,
          [
            { 
              crop: {
                originX: frameX,
                originY: frameY,
                width: frameW,
                height: frameH
              }
            }
          ],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );

        // Store the background image first and immediately set the darkening effect
        setCapturedBackgroundImage(photo.uri);
        
        // Use a timeout to ensure background state is processed before we start the animations
        setTimeout(() => {
          setCapturedImage(processedImage.uri);
          setIsPreviewVisible(true);
          
          // Reset animated values before starting
          fadeAnim.setValue(0);
          previewControlsOpacityAnim.setValue(0);
          bgOpacityAnim.setValue(0); // Ensure background starts transparent before fade-in

          // Animate everything in parallel for a smooth transition
          Animated.parallel([
            // Fade in the darkening overlay
            Animated.timing(darkenOverlayOpacityAnim, {
              toValue: 0.85,
              duration: TRANSITION_DURATION,
              easing: createBezierEasing(),
              useNativeDriver: true,
            }),
            // Fade in the preview image
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: TRANSITION_DURATION,
              easing: createBezierEasing(),
              useNativeDriver: true,
            }),
            // Fade in the freeze-frame background
            Animated.timing(bgOpacityAnim, {
              toValue: 1,
              duration: TRANSITION_DURATION,
              easing: createBezierEasing(),
              useNativeDriver: true,
            }),
            // Fade out the camera controls
            Animated.timing(cameraControlsOpacityAnim, {
              toValue: 0,
              duration: TRANSITION_DURATION,
              easing: createBezierEasing(),
              useNativeDriver: true,
            }),
            // Fade in the preview buttons
            Animated.timing(previewControlsOpacityAnim, {
              toValue: 1,
              duration: TRANSITION_DURATION,
              easing: createBezierEasing(),
              useNativeDriver: true,
            }),
          ]).start();
        }, 0); 
      } catch (error) {
        logger.error('Error capturing image:', error);
        Alert.alert('Error', 'Failed to capture image. Please try again.');
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const handleRetake = () => {
    // When going back to the camera, we need to un-confirm the current step.
    // Truncate the array to the current index, which removes the confirmation for this step and any after it.
    const newCapturedImages = [...capturedImages];
    newCapturedImages.length = currentProfileIndex;
    setCapturedImages(newCapturedImages);

    Animated.parallel([
      Animated.timing(fadeAnim, { 
        toValue: 0, 
        duration: TRANSITION_DURATION,
        easing: createBezierEasing(),
        useNativeDriver: true,
      }),
      Animated.timing(darkenOverlayOpacityAnim, {
        toValue: 0, // Back to transparent overlay
        duration: TRANSITION_DURATION,
        easing: createBezierEasing(),
        useNativeDriver: true,
      }),
      Animated.timing(bgOpacityAnim, {
        toValue: 0,
        duration: TRANSITION_DURATION,
        easing: createBezierEasing(),
        useNativeDriver: true,
      }),
      Animated.timing(cameraControlsOpacityAnim, {
        toValue: 1,
        duration: TRANSITION_DURATION,
        easing: createBezierEasing(),
        useNativeDriver: true,
      }),
      Animated.timing(previewControlsOpacityAnim, {
        toValue: 0,
        duration: TRANSITION_DURATION,
        easing: createBezierEasing(),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCapturedImage(null);
      setCapturedBackgroundImage(null);
      setIsPreviewVisible(false);
    });
  };

  // Smooth transition to the next profile
  const transitionToNextProfile = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    // No full screen fade, just update state
    setCapturedImage(null);
    setCapturedBackgroundImage(null);
    setIsPreviewVisible(false);
    setCurrentProfileIndex(prevIndex => prevIndex + 1);
    
    // Allow a brief moment for state to apply before re-enabling buttons
    setTimeout(() => setIsTransitioning(false), 50);
  };

  // Smooth transition to the PREVIOUS profile
  const transitionToPreviousProfile = () => {
    if (currentProfileIndex === 0 || isTransitioning) return;
    setIsTransitioning(true);

    // No full screen fade, just update state
    setCapturedImage(null);
    setCapturedBackgroundImage(null);
    setIsPreviewVisible(false);
    setCurrentProfileIndex(prevIndex => prevIndex - 1);

    // Allow a brief moment for state to apply before re-enabling buttons
    setTimeout(() => setIsTransitioning(false), 50);
  };

  const handleUsePhoto = async () => {
    if (!capturedImage) {
      Alert.alert('Error', 'No image captured.');
      return;
    }
    if (isTransitioning) return;
    setIsTransitioning(true);

    const newCapturedImages = [...capturedImages];
    newCapturedImages.length = currentProfileIndex;
    newCapturedImages.push({ 
      imageUri: capturedImage!, 
      bgImageUri: capturedBackgroundImage! 
    });
    setCapturedImages(newCapturedImages);
    
    if (currentProfileIndex < PROFILES.length - 1) {
      // Animate out the preview screen and animate in the camera controls
      Animated.parallel([
        Animated.timing(fadeAnim, { 
          toValue: 0, 
          duration: TRANSITION_DURATION,
          easing: createBezierEasing(),
          useNativeDriver: true,
        }),
        Animated.timing(darkenOverlayOpacityAnim, {
          toValue: 0, 
          duration: TRANSITION_DURATION,
          easing: createBezierEasing(),
          useNativeDriver: true,
        }),
        Animated.timing(bgOpacityAnim, {
          toValue: 0,
          duration: TRANSITION_DURATION,
          easing: createBezierEasing(),
          useNativeDriver: true,
        }),
        Animated.timing(cameraControlsOpacityAnim, {
          toValue: 1,
          duration: TRANSITION_DURATION,
          easing: createBezierEasing(),
          useNativeDriver: true,
        }),
        Animated.timing(previewControlsOpacityAnim, {
          toValue: 0,
          duration: TRANSITION_DURATION,
          easing: createBezierEasing(),
          useNativeDriver: true,
        }),
      ]).start(() => {
        transitionToNextProfile();
      });
    } else {
      const finalImageUris = newCapturedImages.map(p => p.imageUri);

      // --- CACHE IMAGES ---
      try {
        await AsyncStorage.setItem('cachedFaceScanImages', JSON.stringify(finalImageUris));
        logger.debug('Successfully cached face scan images.');
      } catch (error) {
        logger.error('Failed to cache face scan images:', error);
      }
      // --- END CACHE ---

      // Retrieve anonymous questionnaire ID from navigation params
      const { submissionId } = route.params as {
      submissionId: string };
      const anonymousQuestionnaireId = submissionId;

      if (!anonymousQuestionnaireId) {
        logger.error('Failed to retrieve submissionId from navigation parameters.');
        Alert.alert('Error', 'Could not find your questionnaire answers. Please go back and complete the questionnaire again.');
        setIsTransitioning(false);
        return;
      }

      logger.debug('[FaceScanScreen] Navigating to SubmissionLoadingScreen with:', {
        imageUris: `Front: ${!!finalImageUris[0]}, Left: ${!!finalImageUris[1]}, Right: ${!!finalImageUris[2]}`,
        anonymousQuestionnaireId: anonymousQuestionnaireId,
      });

      // Navigate to the intermediate loading screen
      navigation.navigate('SubmissionLoadingScreen', {
        imageUris: {
          frontImageUri: finalImageUris[0],
          leftImageUri: finalImageUris[1],
          rightImageUri: finalImageUris[2],
        },
        anonymousQuestionnaireId,
      });

      setTimeout(() => {
          // Reset animated values for a clean state if the user navigates back
          darkenOverlayOpacityAnim.setValue(0);
          fadeAnim.setValue(0);
          bgOpacityAnim.setValue(0);
          cameraControlsOpacityAnim.setValue(1);
          previewControlsOpacityAnim.setValue(0);
          setIsTransitioning(false);
      }, 100); 
    }
  };

  const handleFlipCamera = () => {
    setCameraType(current => (current === 'front' ? 'back' : 'front'));
  };

  const uploadAllImages = async (images: string[]) => {
    setIsUploading(true);
    let currentUserId = userId; // Use state variable first

    // If userId is not in state, try to get it
    if (!currentUserId) {
      currentUserId = await getCurrentUser();
    }

    // If still no user ID, abort the upload
    if (!currentUserId) {
      Alert.alert('Upload Failed', 'Could not get user authentication to upload images. Please try again.');
      setIsUploading(false);
      return;
    }
    
    try {
      const uploadedImagePaths: string[] = [];

      for (let i = 0; i < images.length; i++) {
        const imageUri = images[i];
        const profileName = PROFILES[i].name.toLowerCase().replace(' ', '_');
        const fileExt = imageUri.split('.').pop();
        const fileName = `${profileName}_${Date.now()}.${fileExt}`;
        const filePath = `${currentUserId}/${fileName}`;
        
        // --- NEW UPLOAD LOGIC ---
        let finalImageUri = imageUri;
        
        // If this is a Photos library URI (ph://), convert it to a file URI first
        if (imageUri.startsWith('ph://')) {
          logger.debug('Converting Photos library URI to file URI...');
          const manipulatedImage = await ImageManipulator.manipulateAsync(
            imageUri,
            [], // No manipulations, just convert to file URI
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
          );
          finalImageUri = manipulatedImage.uri;
        }

        const base64String = await FileSystem.readAsStringAsync(finalImageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const arrayBuffer = base64.toByteArray(base64String).buffer;

        await uploadImage(arrayBuffer, filePath, `image/${fileExt}`);
        // --- END NEW UPLOAD LOGIC ---

        const publicUrl = getImageUrl(filePath);
        uploadedImagePaths.push(publicUrl);
      }
      
      logger.debug('Successfully uploaded all images:', uploadedImagePaths);
      
      // Save face scan data to the 'face_scans' table
      const { error: insertError } = await supabase.from('face_scans').insert({
        user_id: currentUserId,
        front_image_url: uploadedImagePaths[0],
        left_image_url: uploadedImagePaths[1],
        right_image_url: uploadedImagePaths[2],
      });
      
      if (insertError) {
        logger.error("INSERT ERROR DETAILS:", JSON.stringify(insertError));
        throw new Error(`Failed to save face scan data: ${insertError.message}`);
      }

      logger.debug('All images uploaded and data saved successfully!');
      
      // --- SUBMIT QUESTIONNAIRE DATA ---
      try {
        logger.debug('Submitting questionnaire data...');
        await submitQuestionnaireData(currentUserId);
        logger.debug('Questionnaire data submitted successfully!');
      } catch (questionnaireError: any) {
        // We can decide if this should be a fatal error.
        // For now, we'll log it but still proceed to results.
        logger.error('Failed to submit questionnaire data:', questionnaireError.message);
        Alert.alert('Questionnaire Submission Failed', 'Your photos were saved, but we encountered an issue saving your questionnaire answers. Please contact support if the issue persists.');
      }
      // --- END SUBMIT QUESTIONNAIRE DATA ---

      // Clear the image cache after successful upload to free up space
      await AsyncStorage.removeItem('cachedImages');

      // Navigate to AI Analysis screen with all three images
      (navigation as any).navigate('AIAnalysis', {
        imageUris: uploadedImagePaths,
      });

    } catch (error: any) {
      logger.error('Upload process failed:', error);
      Alert.alert('Upload Failed', error.message || 'An unknown error occurred during upload.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  // Effect to animate progress bar when currentProfileIndex changes
  useEffect(() => {
    const targetProgress = (currentProfileIndex + 1) / PROFILES.length;
    Animated.timing(progressAnim, {
      toValue: targetProgress,
      duration: TRANSITION_DURATION, // Match other transitions
      easing: createBezierEasing(),
      useNativeDriver: false, // Width animation is not supported by native driver
    }).start();
  }, [currentProfileIndex]);

  // Effect to fade segment colors based on confirmation status
  useEffect(() => {
    // Sync opacities with the capturedImages state
    PROFILES.forEach((_, index) => {
      const isConfirmed = index < capturedImages.length;
      Animated.timing(segmentOpacities[index], {
        toValue: isConfirmed ? 1 : 0,
        duration: 300,
        easing: createBezierEasing(),
        useNativeDriver: true,
      }).start();
    });
  }, [capturedImages]);

  // Effect to show help modal on first launch
  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const hasSeen = await AsyncStorage.getItem('hasSeenFaceScanInstructions');
        if (hasSeen === null) {
          setHelpModalVisible(true);
        }
      } catch (error) {
        logger.error('Failed to access AsyncStorage', error);
      }
    };

    checkFirstLaunch();
  }, []);

  // Wrap all content in an animated view for fade transitions
  const renderContent = () => {
    if (permission && permission.status === PermissionStatus.DENIED) {
      return (
        <View style={styles.container}>
          <StatusBar barStyle="light-content" />
          <View style={styles.permissionDeniedContainer}>
            <View style={styles.permissionDeniedBox}>
              <Camera size={48} color="#333333" style={{ marginBottom: 15 }} />
              <Text style={styles.permissionDeniedTitle}>Camera Access Required</Text>
              <Text style={styles.permissionDeniedText}>
                This feature requires camera access. Please enable camera permissions in your device settings to continue.
              </Text>
              <TouchableOpacity style={styles.openSettingsButton} onPress={handleOpenSettings}>
                <Text style={styles.openSettingsButtonText}>Open Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    if (isPreviewVisible && capturedImage) {
      // This is for the image overlay, keep it as is.
      // The main camera view with blur is rendered underneath from the main return of renderContent.
    }

    const progressBarFillWidth = progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%']
    });

    // --- Calculations for Main Blur Mask (Hole-Punch) ---
    const blurMaskFrameX = (width - FRAME_WIDTH) / 2;
    const blurMaskFrameY = (height - FRAME_HEIGHT) / 2 + VERTICAL_OFFSET;
    const blurMaskRadius = FRAME_BORDER_RADIUS;
    const invertedRoundedMaskPath = [
      `M0 0H${width}V${height}H0Z`,
      `M${blurMaskFrameX + blurMaskRadius} ${blurMaskFrameY}`,
      `H${blurMaskFrameX + FRAME_WIDTH - blurMaskRadius}`,
      `A${blurMaskRadius} ${blurMaskRadius} 0 0 1 ${blurMaskFrameX + FRAME_WIDTH} ${blurMaskFrameY + blurMaskRadius}`,
      `V${blurMaskFrameY + FRAME_HEIGHT - blurMaskRadius}`,
      `A${blurMaskRadius} ${blurMaskRadius} 0 0 1 ${blurMaskFrameX + FRAME_WIDTH - blurMaskRadius} ${blurMaskFrameY + FRAME_HEIGHT}`,
      `H${blurMaskFrameX + blurMaskRadius}`,
      `A${blurMaskRadius} ${blurMaskRadius} 0 0 1 ${blurMaskFrameX} ${blurMaskFrameY + FRAME_HEIGHT - blurMaskRadius}`,
      `V${blurMaskFrameY + blurMaskRadius}`,
      `A${blurMaskRadius} ${blurMaskRadius} 0 0 1 ${blurMaskFrameX + blurMaskRadius} ${blurMaskFrameY}`,
      'Z'
    ].join(' ');

    // --- Calculations for Progress Bar Segment Mask ---
    const progressBarNormalizedWidth = 100;
    const progressBarNormalizedHeight = PROGRESS_BAR_HEIGHT;
    const firstDividerXPercent = progressBarNormalizedWidth / 3;
    const secondDividerXPercent = progressBarNormalizedWidth * 2 / 3;
    const actualDividerWidthForPath = 1; 
    const progressBarMaskPath = [
      `M0 0 H${progressBarNormalizedWidth} V${progressBarNormalizedHeight} H0 Z`,
      `M${firstDividerXPercent - (actualDividerWidthForPath / 2)} 0 V${progressBarNormalizedHeight} H${firstDividerXPercent + (actualDividerWidthForPath / 2)} V0 Z`,
      `M${secondDividerXPercent - (actualDividerWidthForPath / 2)} 0 V${progressBarNormalizedHeight} H${secondDividerXPercent + (actualDividerWidthForPath / 2)} V0 Z`,
    ].join(' ');

    // --- Calculations for Visual Gradient Frame Border ---
    const BORDER_VISUAL_OFFSET = FRAME_BORDER_THICKNESS / 2;
    const visualBorderFrameX = BORDER_VISUAL_OFFSET;
    const visualBorderFrameY = BORDER_VISUAL_OFFSET;
    const visualBorderFrameW = FRAME_WIDTH - FRAME_BORDER_THICKNESS;
    const visualBorderFrameH = FRAME_HEIGHT - FRAME_BORDER_THICKNESS;
    const visualBorderR = Math.max(0, FRAME_BORDER_RADIUS - BORDER_VISUAL_OFFSET);
    const visualFramePath = [
      `M${visualBorderFrameX + visualBorderR} ${visualBorderFrameY}`,
      `H${visualBorderFrameX + visualBorderFrameW - visualBorderR}`,
      `A${visualBorderR} ${visualBorderR} 0 0 1 ${visualBorderFrameX + visualBorderFrameW} ${visualBorderFrameY + visualBorderR}`,
      `V${visualBorderFrameY + visualBorderFrameH - visualBorderR}`,
      `A${visualBorderR} ${visualBorderR} 0 0 1 ${visualBorderFrameX + visualBorderFrameW - visualBorderR} ${visualBorderFrameY + visualBorderFrameH}`,
      `H${visualBorderFrameX + visualBorderR}`,
      `A${visualBorderR} ${visualBorderR} 0 0 1 ${visualBorderFrameX} ${visualBorderFrameY + visualBorderFrameH - visualBorderR}`,
      `V${visualBorderFrameY + visualBorderR}`,
      `A${visualBorderR} ${visualBorderR} 0 0 1 ${visualBorderFrameX + visualBorderR} ${visualBorderFrameY}`,
      'Z'
    ].join(' ');

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <CameraView 
          ref={cameraRef}
          style={[styles.camera, { zIndex: 0 }]}
          facing={cameraType}
        />

        {/* Main Blur and Darkening Layer with hole-punch mask */}
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={
            <Svg width={width} height={height}>
              <Path
                d={invertedRoundedMaskPath} // Uses the correct path for blur hole
                fill="white"
                fillRule="evenodd"
              />
            </Svg>
          }
        >
          {/* 
            Background rendering strategy to prevent flicker:
            1. A live BlurView is always active in the background.
            2. When a photo is taken, an Image with its own BlurView is rendered on TOP of the live one.
            3. While the Image component loads the photo URI, the live BlurView underneath remains visible.
            4. Once the Image loads, it seamlessly covers the live BlurView.
            This prevents the momentary "un-blurred" state during the transition.
          */}
          <BlurView
            intensity={40}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          {capturedBackgroundImage && (
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: bgOpacityAnim }]}>
              <Image
                source={{ uri: capturedBackgroundImage }}
                style={[
                  StyleSheet.absoluteFill,
                  // Apply conditional mirroring based on camera type
                  cameraType === 'front' && { transform: [{ scaleX: -1 }] }
                ]}
                resizeMode="cover"
              />
              <BlurView
                intensity={40}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          )}
          
          {/* Animated Darkening Overlay - also masked by the parent MaskedView */}
          <Animated.View 
            style={[
              StyleSheet.absoluteFill, 
              {
                backgroundColor: 'rgba(0,0,0,0.5)', // Dark color for the overlay
                opacity: darkenOverlayOpacityAnim, // Animated opacity
              }
            ]}
          />
        </MaskedView>

        <View style={[StyleSheet.absoluteFill]} pointerEvents="box-none">
          <View style={styles.frameContainer}>
            {/* Gradient SVG Frame Border */}
            <Svg width={FRAME_WIDTH} height={FRAME_HEIGHT} style={{ position: 'absolute', top: 0, left: 0 }}>
              <Defs>
                <SvgLinearGradient id="visualFrameGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <SvgStop offset="0%" stopColor={GRADIENT_START_COLOR} />
                  <SvgStop offset="100%" stopColor={GRADIENT_END_COLOR} />
                </SvgLinearGradient>
              </Defs>
              <Path
                d={visualFramePath} // Uses the correct path for the visual gradient border
                fill="none"
                stroke="url(#visualFrameGradient)"
                strokeWidth={FRAME_BORDER_THICKNESS}
              />
            </Svg>
          </View>

          <View style={styles.instructionContainer}>
            {React.createElement(PROFILES[currentProfileIndex].icon, { size: 24, color: "#FFFFFF" })}
            <Text style={styles.instructionText}>{PROFILES[currentProfileIndex].name}</Text>
          </View>

          <SafeAreaView style={styles.overlay} edges={['top']}>
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                style={styles.iconButton} 
                onPress={handleClose}
                disabled={isTransitioning}
              >
                <ArrowLeft size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.segmentedProgressBarContainer}>
                {PROFILES.map((_, index) => (
                  <ProgressBarSegment
                    key={index}
                    index={index}
                    progressAnim={progressAnim}
                    opacityAnim={segmentOpacities[index]}
                  />
                ))}
              </View>

              <TouchableOpacity 
                style={styles.iconButton} 
                onPress={handleHelp}
                disabled={isTransitioning}
              >
                <Ionicons name="help" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
        
        <Modal
          animationType="fade"
          transparent={true}
          visible={helpModalVisible}
          onRequestClose={() => setHelpModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={80} tint="dark" style={styles.modalContent}>
              <Text style={styles.modalTitle}>Getting Your Best Scan</Text>
              
              <View style={styles.instructionItem}>
                <Sun size={26} color="#FFFFFF" />
                <Text style={styles.instructionItemText}>
                  Find a brightly lit spot. Natural, even lighting is best!
                </Text>
              </View>
              
              <View style={styles.instructionItem}>
                <Smartphone size={26} color="#FFFFFF" />
                <Text style={styles.instructionItemText}>
                  Hold your phone at eye level and look straight into the camera.
                </Text>
              </View>
              
              <View style={styles.instructionItem}>
                <SmilePlus size={26} color="#FFFFFF" />
                <Text style={styles.instructionItemText}>
                  Start with a fresh face. Please remove any makeup.
                </Text>
              </View>
              
              <View style={styles.instructionItem}>
                <Glasses size={26} color="#FFFFFF" />
                <Text style={styles.instructionItemText}>
                  No accessories, please. Take off glasses, hats, or large jewelry.
                </Text>
              </View>
              
              <View style={styles.instructionItem}>
                <UserRound size={26} color="#FFFFFF" />
                <Text style={styles.instructionItemText}>
                  Please move any hair away from your face.
                </Text>
              </View>
              
              <View style={styles.instructionItem}>
                <Droplets size={26} color="#FFFFFF" />
                <Text style={styles.instructionItemText}>
                  Clean skin is key. A quick wash helps us get the most accurate scan.
                </Text>
              </View>
              
              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={styles.modalButton}
                  onPress={async () => {
                    try {
                      await AsyncStorage.setItem('hasSeenFaceScanInstructions', 'true');
                    } catch (error) {
                      logger.error('Failed to set AsyncStorage item', error);
                    }
                    setHelpModalVisible(false)
                  }}
                >
                  <MaskedView
                    maskElement={
                      <Text style={[styles.modalButtonText, { backgroundColor: 'transparent' }]}>
                        Got it
                      </Text>
                    }
                  >
                    <LinearGradient
                      colors={[GRADIENT_START_COLOR, GRADIENT_END_COLOR]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={[styles.modalButtonText, { opacity: 0 }]}>Got it</Text>
                    </LinearGradient>
                  </MaskedView>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </Modal>
      </View>
    );
  };

  const renderFrame = () => (
    <View style={[styles.frameContainer, { zIndex: 12 }]} pointerEvents="none">
        <Svg width={FRAME_WIDTH} height={FRAME_HEIGHT} style={{ position: 'absolute', top: 0, left: 0 }}>
            <Defs>
            <SvgLinearGradient id="visualFrameGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <SvgStop offset="0%" stopColor={GRADIENT_START_COLOR} />
                <SvgStop offset="100%" stopColor={GRADIENT_END_COLOR} />
            </SvgLinearGradient>
            </Defs>
            <Path
            d={[
                `M${FRAME_BORDER_THICKNESS / 2 + FRAME_BORDER_RADIUS} ${FRAME_BORDER_THICKNESS / 2}`,
                `H${FRAME_WIDTH - FRAME_BORDER_THICKNESS / 2 - FRAME_BORDER_RADIUS}`,
                `A${FRAME_BORDER_RADIUS} ${FRAME_BORDER_RADIUS} 0 0 1 ${FRAME_WIDTH - FRAME_BORDER_THICKNESS / 2} ${FRAME_BORDER_THICKNESS / 2 + FRAME_BORDER_RADIUS}`,
                `V${FRAME_HEIGHT - FRAME_BORDER_THICKNESS / 2 - FRAME_BORDER_RADIUS}`,
                `A${FRAME_BORDER_RADIUS} ${FRAME_BORDER_RADIUS} 0 0 1 ${FRAME_WIDTH - FRAME_BORDER_THICKNESS / 2 - FRAME_BORDER_RADIUS} ${FRAME_HEIGHT - FRAME_BORDER_THICKNESS / 2}`,
                `H${FRAME_BORDER_THICKNESS / 2 + FRAME_BORDER_RADIUS}`,
                `A${FRAME_BORDER_RADIUS} ${FRAME_BORDER_RADIUS} 0 0 1 ${FRAME_BORDER_THICKNESS / 2} ${FRAME_HEIGHT - FRAME_BORDER_THICKNESS / 2 - FRAME_BORDER_RADIUS}`,
                `V${FRAME_BORDER_THICKNESS / 2 + FRAME_BORDER_RADIUS}`,
                `A${FRAME_BORDER_RADIUS} ${FRAME_BORDER_RADIUS} 0 0 1 ${FRAME_BORDER_THICKNESS / 2 + FRAME_BORDER_RADIUS} ${FRAME_BORDER_THICKNESS / 2}`,
                'Z'
            ].join(' ')}
            fill="none"
            stroke="url(#visualFrameGradient)"
            strokeWidth={FRAME_BORDER_THICKNESS}
            />
        </Svg>
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      {renderContent()}

      {/* Frame is rendered on top of everything else */}
      {renderFrame()}

      {/* Absolutely positioned Preview Image Overlay - should cover the camera feed area */}
      {isPreviewVisible && capturedImage && (
        <Animated.View style={[styles.previewContainerForPositioning, { opacity: fadeAnim }]}>
          <Image 
            source={{ uri: capturedImage }} 
            style={[
              styles.previewImage,
              // Only invert the image when using front camera
              cameraType === 'front' && { transform: [{ scaleX: -1 }] }
            ]}
            resizeMode="contain"
          />
        </Animated.View>
      )}

      {/* Buttons (conditionally rendered) */}
      <Animated.View 
        style={[styles.cameraControlsContainer, { opacity: cameraControlsOpacityAnim }]}
        pointerEvents={isPreviewVisible ? 'none' : 'box-none'}
      >
        <View style={styles.buttonRow}>
            <View style={styles.sideButtonContainer}>
                <TouchableOpacity onPress={handleFlipCamera} style={styles.flipButton} disabled={isTransitioning || isCapturing}>
                    <Ionicons name="camera-reverse" size={32} color="white" />
                </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={styles.captureButton}
              onPress={handleCapture}
              disabled={isTransitioning || isCapturing}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
            <View style={styles.sideButtonContainer}>
                {/* Empty container to maintain center alignment of capture button */}
            </View>
        </View>
      </Animated.View>
      
      <Animated.View 
        style={[styles.previewButtonContainer, { opacity: previewControlsOpacityAnim }]}
        pointerEvents={isPreviewVisible ? 'box-none' : 'none'}
      >
        <TouchableOpacity onPress={handleRetake} style={[styles.buttonBase, styles.retakeButton]} disabled={isTransitioning}>
          <Text style={styles.retakeButtonText}>Retake</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleUsePhoto} style={[styles.buttonBase, styles.confirmButton]} disabled={isTransitioning || isUploading}>
          <Text style={styles.confirmButtonText}>Use Photo</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#000000', // Ensure black background always visible
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1,
  },
  clearFrame: {
    position: 'absolute',
    top: (height - FRAME_HEIGHT) / 2 + VERTICAL_OFFSET,
    left: (width - FRAME_WIDTH) / 2,
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderRadius: FRAME_BORDER_RADIUS,
    zIndex: 2,
    opacity: 0,
  },
  frameContainer: {
    position: 'absolute',
    top: (height - FRAME_HEIGHT) / 2 + VERTICAL_OFFSET,
    left: (width - FRAME_WIDTH) / 2,
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    zIndex: 2,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3,
  },
  headerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
    marginTop: Platform.OS === 'ios' ? 15 : (StatusBar.currentHeight ?? 0) + 5,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 30,
    zIndex: 3,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
  },
  previewContainerForPositioning: {
    position: 'absolute',
    top: (height - FRAME_HEIGHT) / 2 + VERTICAL_OFFSET,
    left: (width - FRAME_WIDTH) / 2,
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, 
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: FRAME_BORDER_RADIUS,
  },
  previewButtonContainer: {
    position: 'absolute',
    top: (height - FRAME_HEIGHT) / 2 + VERTICAL_OFFSET + FRAME_HEIGHT - 80, // Positioned 80px from the bottom of the frame
    left: (width - FRAME_WIDTH) / 2,
    width: FRAME_WIDTH,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 11,
    paddingHorizontal: 15,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    padding: 20,
    paddingBottom: 50,
    marginBottom: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  buttonBase: {
    height: 52,
    width: '45%',
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#000000',
  },
  retakeButton: {
    backgroundColor: '#FFFFFF',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  retakeButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionContainer: {
    position: 'absolute',
    top: (height - FRAME_HEIGHT) / 2 + VERTICAL_OFFSET - 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 10,
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    marginHorizontal: 30,
  },
  permissionButton: {
    backgroundColor: '#3A5FCD', // Darker Accent Blue
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginTop: 20,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 3,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(201, 215, 248, 0.5)', // Light Blue with opacity
  },
  progressDotActive: {
    backgroundColor: '#3A5FCD', // Darker Accent Blue
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'transparent',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  instructionItemText: {
    fontSize: 16,
    color: '#E0E0E0',
    marginLeft: 16,
    flex: 1,
    lineHeight: 22,
  },
  modalFooter: {
    marginTop: 24,
    alignItems: 'center',
  },
  modalButton: {
    width: '100%',
    backgroundColor: '#111111', // Primary dark color from HomeScreen
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  permissionDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000', // Match screen background
    paddingHorizontal: 40,
  },
  permissionDeniedBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: '100%',
    maxWidth: 350,
  },
  permissionDeniedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionDeniedText: {
    fontSize: 16,
    color: '#555555',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  openSettingsButton: {
    backgroundColor: '#3A5FCD', // Using the theme's accent blue
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  openSettingsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  segmentedProgressBarContainer: {
    flex: 1,
    height: PROGRESS_BAR_HEIGHT, 
    marginHorizontal: 12,
    flexDirection: 'row',
    gap: 3,
  },
  segmentedProgressBarTrack: {
    width: '100%', 
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: PROGRESS_BAR_HEIGHT / 2,
    position: 'relative',
    overflow: 'hidden',
  },
  segmentedProgressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: PROGRESS_BAR_HEIGHT / 2,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  confirmedProgressBarFill: {
    height: '100%',
    backgroundColor: '#5FF800',
    position: 'absolute',
    left: 0,
    top: 0,
  },
  cameraControlsContainer: {
    position: 'absolute',
    top: (height - FRAME_HEIGHT) / 2 + VERTICAL_OFFSET + FRAME_HEIGHT - 80 - 20,
    left: 0,
    right: 0,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: 260, // Reduced width to bring buttons closer together
  },
  sideButtonContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButton: {
    // No background, just the icon
  },
});

interface ProgressBarSegmentProps {
  index: number;
  progressAnim: Animated.Value;
  opacityAnim: Animated.Value;
}

const ProgressBarSegment = ({ index, progressAnim, opacityAnim }: ProgressBarSegmentProps) => {
  const segmentStart = index / PROFILES.length;
  const segmentEnd = (index + 1) / PROFILES.length;

  const fillWidth = progressAnim.interpolate({
    inputRange: [segmentStart, segmentEnd],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const isConfirmed = progressAnim.interpolate({
    inputRange: [segmentEnd - 0.001, segmentEnd],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={segmentStyles.container}>
      {/* White fill for active progress */}
      <Animated.View style={[segmentStyles.fill, { width: fillWidth, backgroundColor: '#FFFFFF' }]} />
      {/* Green overlay for confirmed progress */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#5FF800', opacity: opacityAnim }]} />
    </View>
  );
};

const segmentStyles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: PROGRESS_BAR_HEIGHT / 2,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: PROGRESS_BAR_HEIGHT / 2,
  },
});

export default FaceScanScreen; 