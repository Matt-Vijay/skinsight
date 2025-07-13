import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert, Dimensions, ActivityIndicator, Switch, Modal, TouchableWithoutFeedback, Linking, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../components/AuthComponents';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import * as NotificationService from '../services/NotificationService';
import { logger } from '@/config/logger';
import { BlurView } from 'expo-blur';
import ModernLoader from '../components/ModernLoader';

const { width, height } = Dimensions.get('window');

// Custom animated loader component

const BackgroundBlobs = () => (
  <View style={StyleSheet.absoluteFill}>
    <View style={styles.blob1} />
    <View style={styles.blob2} />
  </View>
);

const SettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const { user, logout, userProfile, fetchUserProfile, loadingProfile } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for user questionnaire data
  const [userData, setUserData] = useState({
    age: '',
    gender: '',
    skinType: ''
  });

  // State for preferences
  const [preferences, setPreferences] = useState({
    notifications: true,
    reminders: true,
  });

  // Optimistic UI state for preferences
  const [optimisticPreferences, setOptimisticPreferences] = useState(preferences);
  
  // Track toggle operations in progress to prevent multiple toggles
  const [toggleInProgress, setToggleInProgress] = useState({
    notifications: false,
    reminders: false,
  });

  // State for delete account modal
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  // Reference for the deletion interval timer
  const deleteIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  // Animation frame reference for smooth animation
  const animationFrameRef = React.useRef<number | null>(null);
  // Last timestamp for animation smoothing
  const lastTimeRef = React.useRef(0);
  // Animation for the content fade-in
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fetch profile when component mounts if not already available
  useEffect(() => {
    if (!userProfile && user?.id !== 'mock-user-id') {
      fetchUserProfile();
    }
  }, [user, userProfile, fetchUserProfile]);

  // Handle the fade-in animation when loading is complete
  useEffect(() => {
    if (!loadingProfile) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500, // 500ms fade duration
        useNativeDriver: true,
      }).start();
    }
  }, [loadingProfile, fadeAnim]);

  // Load notification preferences
  useEffect(() => {
    const loadNotificationPreferences = async () => {
      try {
        const notificationsEnabled = await NotificationService.getNotificationsEnabled();
        const remindersEnabled = await NotificationService.getRemindersEnabled();
        
        setPreferences({
          notifications: notificationsEnabled,
          reminders: remindersEnabled,
        });
        setOptimisticPreferences({
          notifications: notificationsEnabled,
          reminders: remindersEnabled,
        });
      } catch (error) {
        logger.error('Error loading notification preferences:', error);
      }
    };
    
    loadNotificationPreferences();
  }, []);

  // Toggle notifications handler
  const toggleNotifications = async (value: boolean) => {
    if (toggleInProgress.notifications) return;

    // Optimistically update the UI
    setOptimisticPreferences(prev => ({ ...prev, notifications: value }));
    setToggleInProgress(prev => ({ ...prev, notifications: true }));

    try {
      await NotificationService.setNotificationsEnabled(value);
      setPreferences(prev => ({ ...prev, notifications: value }));

      if (value) {
        const hasPermission = await NotificationService.requestNotificationPermissions();
        if (!hasPermission) {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to receive updates.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      logger.error('Error toggling notifications:', error);
      // Revert the optimistic update on error
      setOptimisticPreferences(prev => ({ ...prev, notifications: !value }));
      Alert.alert('Error', 'Could not update notification settings. Please try again.');
    } finally {
      setToggleInProgress(prev => ({ ...prev, notifications: false }));
    }
  };

  // Toggle reminders handler
  const toggleReminders = async (value: boolean) => {
    if (toggleInProgress.reminders) return;

    // Optimistically update the UI
    setOptimisticPreferences(prev => ({ ...prev, reminders: value }));
    setToggleInProgress(prev => ({ ...prev, reminders: true }));

    try {
      await NotificationService.setRemindersEnabled(value);
      setPreferences(prev => ({ ...prev, reminders: value }));

      if (value && optimisticPreferences.notifications) {
        await NotificationService.scheduleDailyReminder();
      }
    } catch (error) {
      logger.error('Error toggling reminders:', error);
      // Revert the optimistic update on error
      setOptimisticPreferences(prev => ({ ...prev, reminders: !value }));
      Alert.alert('Error', 'Could not update reminder settings. Please try again.');
    } finally {
      setToggleInProgress(prev => ({ ...prev, reminders: false }));
    }
  };

  // Initialize notifications when app loads
  useEffect(() => {
    NotificationService.initializeNotifications();
  }, []);

  const handleLinkPress = async (url: string) => {
    const isMailto = url.startsWith('mailto:');
    try {
      await Linking.openURL(url);
    } catch (error) {
      const errorMessage = isMailto
        ? "We couldn't open your email app. This can happen on a simulator, or if you don't have a default email client set up."
        : "There was an issue opening this link. Please try again later.";
      const errorTitle = isMailto ? "Could Not Open Email" : "Cannot Open URL";
      
      Alert.alert(errorTitle, errorMessage);
      logger.warn('Failed to open URL', { error, url });
    }
  };

  const handleRateApp = () => {
    Alert.alert(
      'Rate the App',
      'This feature is coming soon! It will take you to the app store to rate your experience.',
      [{ text: 'OK' }]
    );
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      logger.error('Error during logout:', error);
      Alert.alert('Logout Error', 'There was a problem logging out. Please try again.');
    }
  };

  // Function to handle account deletion
  const handleDeleteAccount = async () => {
    if (deleteInProgress) return;
    
    setDeleteInProgress(true);
    setDeleteProgress(0);
    lastTimeRef.current = performance.now();
    
    // Use requestAnimationFrame for smoother animation
    const animateProgress = (timestamp: number) => {
      // Calculate delta time for smooth animation regardless of frame rate
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      
      setDeleteProgress(prev => {
        // Simple variation but with time-based increment for smoothness
        const baseSpeed = 0.02; // Base increment per millisecond
        const variation = Math.random() * 0.01 - 0.005; // Small random variation
        const increment = (baseSpeed + variation) * deltaTime;
        
        const newProgress = prev + increment;
        
        if (newProgress >= 100) {
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          completeAccountDeletion();
          return 100;
        }
        
        return newProgress;
      });
      
      // Continue animation
      animationFrameRef.current = requestAnimationFrame(animateProgress);
    };
    
    // Start the animation
    animationFrameRef.current = requestAnimationFrame(animateProgress);
  };
  
  // Function to cancel account deletion
  const cancelDeleteAccount = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setDeleteInProgress(false);
    setDeleteProgress(0);
    setDeleteModalVisible(false);
  };
  
  // Function to complete the account deletion
  const completeAccountDeletion = async () => {
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        method: 'POST',
      });

      if (error) {
        throw new Error(error.message);
      }
      
      logger.debug('Account deleted, logging out.');
      await logout();
    } catch (error) {
      logger.error('Error during account deletion:', error);
      Alert.alert('Deletion Error', 'There was a problem deleting your account. Please try again.');
    } finally {
      // Always reset the UI state
      setDeleteInProgress(false);
      setDeleteProgress(0);
      setDeleteModalVisible(false);
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (deleteIntervalRef.current) {
        clearInterval(deleteIntervalRef.current);
      }
    };
  }, []);


  return (
    <View style={{ flex: 1, backgroundColor: '#F0F2F5', paddingTop: insets.top }}>
      <BackgroundBlobs />
      <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFill} />
      <StatusBar style={isDarkMode ? "light" : "dark"} />
        
        {/* Delete Account Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={deleteModalVisible}
          onRequestClose={cancelDeleteAccount}
        >
          <TouchableWithoutFeedback onPress={cancelDeleteAccount}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
                  <TouchableOpacity 
                    style={styles.closeButton} 
                    onPress={cancelDeleteAccount}
                  >
                    <Ionicons name="close" size={24} color={theme.text} />
                  </TouchableOpacity>
                  
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Delete Account</Text>
                  <Text style={[styles.modalText, { color: theme.secondary }]}>
                    Are you sure you want to delete your account? This action cannot be undone.
                  </Text>
                  
                  {deleteInProgress ? (
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBarContainer}>
                        <View 
                          style={[
                            styles.progressBar, 
                            { width: `${deleteProgress}%` }
                          ]} 
                        />
                      </View>
                      <TouchableOpacity 
                        style={[styles.fullWidthCancelButton]}
                        onPress={cancelDeleteAccount}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.modalButtonsContainer}>
                      <TouchableOpacity 
                        style={styles.cancelButton}
                        onPress={cancelDeleteAccount}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.deleteButton}
                        onPress={handleDeleteAccount}
                      >
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
        
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
          
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => setLoading(true)}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : loadingProfile ? (
            <View style={styles.metricsContainer}>
              <ModernLoader />
            </View>
          ) : (
            <>
              {/* User Metrics - Only showing top 3 important items */}
              <View style={styles.metricsContainer}>
                <View style={[styles.metricRow, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.metricLabel, { color: theme.text }]}>Age</Text>
                  <Text style={[styles.metricValue, { color: theme.text }]}>{userProfile?.age || 'N/A'}</Text>
                </View>
                
                {userProfile?.gender && (
                  <View style={[styles.metricRow, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.metricLabel, { color: theme.text }]}>Gender</Text>
                    <Text style={[styles.metricValue, { color: theme.text }]}>{userProfile.gender}</Text>
                  </View>
                )}
                
                <View style={[styles.metricRow, { borderBottomWidth: 0 }]}>
                  <Text style={[styles.metricLabel, { color: theme.text }]}>Skin type</Text>
                  <Text style={[styles.metricValue, { color: theme.text }]}>{userProfile?.skinType || 'N/A'}</Text>
                </View>
              </View>
            </>
          )}
          
          {/* Divider - no margin or padding */}
          <View style={[styles.noPaddingDivider, { backgroundColor: theme.border }]} />
          
          {/* Customization Section */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Customization</Text>
          
          <TouchableOpacity style={[styles.optionRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.optionText, { color: theme.text }]}>Personal details</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.optionRow, { borderBottomColor: theme.border }]}>
            <View>
              <Text style={[styles.optionText, { color: theme.text }]}>Adjust goals</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
          </TouchableOpacity>

          {/* Preferences Section */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Preferences</Text>
          
          {/* 1. Notifications Toggle */}
          <View style={[styles.toggleRow, { borderBottomColor: theme.border }]}>
            <View>
              <Text style={[styles.optionText, { color: theme.text }]}>Notifications</Text>
              <Text style={[styles.optionSubtext, { color: theme.secondary }]}>Allow push notifications</Text>
            </View>
            <Switch
              trackColor={{ false: "#E5E5E5", true: COLORS.primary }}
              thumbColor={"#FFFFFF"}
              ios_backgroundColor="#E5E5E5"
              onValueChange={toggleNotifications}
              value={optimisticPreferences.notifications}
              disabled={toggleInProgress.notifications}
            />
          </View>
          
          {/* 2. Daily Reminders Toggle */}
          <View style={[styles.toggleRow, { borderBottomColor: theme.border }]}>
            <View>
              <Text style={[styles.optionText, { color: theme.text }]}>Daily Reminders</Text>
              <Text style={[styles.optionSubtext, { color: theme.secondary }]}>Get reminded about your skincare routine</Text>
            </View>
            <Switch
              trackColor={{ false: "#E5E5E5", true: COLORS.primary }}
              thumbColor={"#FFFFFF"}
              ios_backgroundColor="#E5E5E5"
              onValueChange={toggleReminders}
              value={optimisticPreferences.reminders}
              disabled={toggleInProgress.reminders}
            />
          </View>
          
          {/* Feedback & Support Section */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Feedback & Support</Text>

          <TouchableOpacity 
            style={[styles.optionRow, { borderBottomColor: theme.border }]}
            onPress={handleRateApp}
          >
            <Text style={[styles.optionText, { color: theme.text }]}>Rate the App</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.optionRow, { borderBottomColor: theme.border }]}
            onPress={() => handleLinkPress('mailto:feedback@dewylabs.com?subject=App Feedback')}
          >
            <Text style={[styles.optionText, { color: theme.text }]}>Send Feedback</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.optionRow, { borderBottomColor: theme.border }]}
            onPress={() => handleLinkPress('mailto:support@dewylabs.com')}
          >
            <Text style={[styles.optionText, { color: theme.text }]}>Support Email</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
          </TouchableOpacity>

          {/* Legal Section */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Legal</Text>
          
          <TouchableOpacity 
            style={[styles.optionRow, { borderBottomColor: theme.border }]}
            onPress={() => handleLinkPress('https://dewylabs.com')}
          >
            <Text style={[styles.optionText, { color: theme.text }]}>Terms and Conditions</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.optionRow, { borderBottomColor: theme.border }]}
            onPress={() => handleLinkPress('https://dewylabs.com')}
          >
            <Text style={[styles.optionText, { color: theme.text }]}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
          </TouchableOpacity>

          {/* Account Section */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>
          
          {/* Updated Delete Account option to open modal */}
          <TouchableOpacity 
            style={[styles.optionRow, { borderBottomColor: theme.border }]}
            onPress={() => setDeleteModalVisible(true)}
          >
            <Text style={[styles.optionText, { color: theme.text }]}>Delete Account</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
          
          <Text style={[styles.versionText, { color: theme.secondary }]}>Version 0.5.0</Text>
        </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF5252',
    marginBottom: 15,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  metricsContainer: {
    paddingHorizontal: 20,
    marginBottom: 0,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  metricLabel: {
    fontSize: 18,
    fontWeight: '400',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginTop: 20,
    marginBottom: 25,
    marginHorizontal: 20,
  },
  noPaddingDivider: {
    height: 1,
    marginHorizontal: 0,
    marginVertical: 0,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 15,
    paddingHorizontal: 20,
    marginTop: 25,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 18,
  },
  optionSubtext: {
    fontSize: 14,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
    marginHorizontal: 20,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.85,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#E5E5E5',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 10,
    backgroundColor: '#E5E5E5',
    borderRadius: 5,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF3B30',
  },
  progressText: {
    fontSize: 14,
    marginBottom: 16,
  },
  fullWidthCancelButton: {
    backgroundColor: '#E5E5E5',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  blob1: {
    position: 'absolute',
    width: width,
    height: width,
    borderRadius: width * 0.45,
    top: height * 0.2,
    right: -width * 0.1,
    backgroundColor: 'rgba(186, 190, 255, 0.2)',
  },
  blob2: {
    position: 'absolute',
    width: width * 0.95,
    height: width * 0.95,
    borderRadius: width * 0.475,
    bottom: height * 0.15,
    left: -width * 0.15,
    backgroundColor: 'rgba(255, 168, 168, 0.15)',
  },
});

export default SettingsScreen;
