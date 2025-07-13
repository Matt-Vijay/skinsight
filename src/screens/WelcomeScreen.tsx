import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Modal,
  Animated,
  Alert,
  Image,
  Easing,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { logger } from '@/config/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import { supabase } from '../config/supabase';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { appleLogo, googleLogo } from '../assets/images';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { finalizeUser, setIsInitialAuth } = useAuth();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [isUnder13, setIsUnder13] = useState(false);
  
  // Animation values
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const modalTranslateY = useRef(new Animated.Value(height)).current;
  const panGestureRef = useRef<any>(null);

  useEffect(() => {
    const checkUnder13Status = async () => {
      try {
        const under13Locked = await AsyncStorage.getItem('isUnder13Locked');
        if (under13Locked === 'true') {
          setIsUnder13(true);
        }
      } catch (error) {
        logger.error('Failed to check under 13 status from AsyncStorage', error);
      }
    };
    checkUnder13Status();
  }, []);
  
  const handleSkipToHome = () => {
    navigation.navigate('Main');
  };

  const handleSkipToAnalysis = () => {
    navigation.navigate('AnalysisScreen');
  };
  
  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Questionnaire');
  };

  const handleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSignInModal(true);
  };

  const handleCloseModal = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(backgroundOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(modalTranslateY, {
        toValue: height,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSignInModal(false);
      // Reset values for next time
      backgroundOpacity.setValue(0);
      modalTranslateY.setValue(height);
    });
  };

  const handleCloseModalFromTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleCloseModal();
  };

  // Animate in when modal becomes visible
  useEffect(() => {
    if (showSignInModal) {
      // Reset values
      backgroundOpacity.setValue(0);
      modalTranslateY.setValue(height);
      
      // Animate in with bezier curve
      Animated.parallel([
        Animated.timing(backgroundOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(modalTranslateY, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic), // Smooth ease-out curve
        }),
      ]).start();
    }
  }, [showSignInModal]);

  const handlePanGesture = (event: any) => {
    const { translationY, velocityY, state } = event.nativeEvent;
    
    if (state === State.ACTIVE) {
      // Only allow downward swipes
      if (translationY > 0) {
        modalTranslateY.setValue(translationY);
        // Fade background as user swipes down
        const progress = Math.min(translationY / 200, 1);
        backgroundOpacity.setValue(1 - progress * 0.7);
      }
    } else if (state === State.END) {
      // If swiped down enough or with enough velocity, close modal
      if (translationY > 100 || velocityY > 500) {
        handleCloseModal();
      } else {
        // Snap back to original position - more snappy
        Animated.parallel([
          Animated.spring(modalTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 150,
            friction: 10,
          }),
          Animated.timing(backgroundOpacity, {
            toValue: 1,
            duration: 120,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  };

  const { signInWithApple } = useAuth();
  const [isAppleLoading, setIsAppleLoading] = useState(false);

  const handleAppleSignIn = async () => {
    Alert.alert('Apple login is yet to be implemented on this screen.');
  };

  const handleGoogleSignIn = async () => {
    Alert.alert('Google login is yet to be implemented on this screen.');
  };

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Video section - upper portion of screen */}
      <View style={styles.videoSection}>
        {/* TODO: Video component will go here */}
        <View style={styles.videoPlaceholder}>
          <Text style={styles.videoPlaceholderText}>Video will go here</Text>
        </View>
      </View>
      
      {/* Bottom section with content */}
      <View style={styles.bottomSection}>
        <View style={styles.contentSection}>
          <Text style={styles.title}>Skincare made easy</Text>
          
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text style={styles.getStartedButtonText}>Get Started</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.signInButton}
            onPress={handleSignIn}
            activeOpacity={0.7}
          >
            <Text style={styles.signInButtonText}>
              Already have an account? <Text style={styles.signInLink}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Bottom indicator */}
        <View style={styles.bottomIndicator} />
      </View>

      {isUnder13 && <Under13Overlay />}

      {/* Sign In Modal */}
      <Modal
        visible={showSignInModal}
        transparent={true}
        animationType="none" // We handle animations manually
        onRequestClose={handleCloseModal}
      >
        {/* Animated background overlay */}
        <Animated.View 
          style={[
            styles.modalOverlay,
            {
              opacity: backgroundOpacity,
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={handleCloseModal}
          />
        </Animated.View>
        
        {/* Animated modal content */}
        <PanGestureHandler
          ref={panGestureRef}
          onGestureEvent={handlePanGesture}
          onHandlerStateChange={handlePanGesture}
        >
          <Animated.View 
            style={[
              styles.modalContentContainer,
              {
                transform: [{ translateY: modalTranslateY }],
              }
            ]}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.headerContent}>
                  <Text style={styles.modalTitle}>Sign In</Text>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={handleCloseModalFromTap}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Separator line */}
              <View style={styles.separator} />
              
              <View style={styles.socialButtonsContainer}>
                {/* Apple Sign In Button */}
                <TouchableOpacity
                  style={[styles.socialButton, styles.appleButton, isAppleLoading && styles.disabledButton]}
                  onPress={handleAppleSignIn}
                  activeOpacity={0.8}
                  disabled={isAppleLoading}
                >
                  <View style={styles.buttonContent}>
                    <Image 
                      source={appleLogo} 
                      style={styles.appleIcon}
                      resizeMode="contain"
                      fadeDuration={0}
                    />
                    <Text style={styles.appleButtonText}>{isAppleLoading ? 'Signing In...' : 'Continue with Apple'}</Text>
                  </View>
                </TouchableOpacity>
                
                {/* Google Sign In Button */}
                <TouchableOpacity
                  style={[styles.socialButton, styles.googleButton]}
                  onPress={handleGoogleSignIn}
                  activeOpacity={0.8}
                >
                  <View style={styles.buttonContent}>
                    <Image 
                      source={googleLogo} 
                      style={styles.googleIcon}
                      resizeMode="contain"
                      fadeDuration={0}
                    />
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                  </View>
                </TouchableOpacity>
              </View>
              
              {/* Bottom safe area */}
              <View style={styles.modalBottomSafeArea} />
            </View>
          </Animated.View>
        </PanGestureHandler>
      </Modal>
      
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  disabledButton: {
    opacity: 0.6,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  videoSection: {
    flex: 1,
    backgroundColor: '#F8F8F8', // Temporary background for video area
    zIndex: 1,
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholderText: {
    fontSize: 16,
    color: '#999999',
  },
  bottomSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 30,
    paddingTop: 30,
    paddingBottom: 0,
    zIndex: 2,
    marginTop: -20, // Overlap the video section slightly
    elevation: 5,
  },
  contentSection: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32, // Reduced from 42
    color: '#000000',
    textAlign: 'center',
    lineHeight: 34, // Adjusted for smaller font
    letterSpacing: -0.5,
    marginBottom: 20,
    fontWeight: '500', // Space between title and button
  },
  getStartedButton: {
    backgroundColor: '#000000',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10, // Reduced gap between buttons
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  getStartedButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  signInButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 30, // Space before bottom indicator
  },
  signInButtonText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  signInLink: {
    color: '#000000',
    fontWeight: '600',
  },
  bottomIndicator: {
    height: 4,
    width: 40,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContentContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 50,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    minHeight: height * 0.4, // Make modal taller
  },
  modalHeader: {
    marginBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '400',
    color: '#666666',
    lineHeight: 18,
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginBottom: 32,
  },
  socialButtonsContainer: {
    gap: 16,
  },
  socialButton: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleButton: {
    backgroundColor: '#000000',
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    marginBottom: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleIcon: {
    width: 22,
    height: 22,
    marginRight: 12,
  },
  googleIcon: {
    width: 22,
    height: 22,
    marginRight: 12,
  },
  appleButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  googleButtonText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '600',
  },
  modalBottomSafeArea: {
    height: 30,
  },
  devButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  devButtonText: {
    color: 'white',
    fontWeight: 'bold',
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
});

export default WelcomeScreen;
