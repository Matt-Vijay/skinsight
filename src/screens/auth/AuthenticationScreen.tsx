import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Image,
  Platform,
  StatusBar as ReactNativeStatusBar,
  Pressable,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/context/AuthContext';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { ArrowLeft } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/config/supabase';
import { logger } from '@/config/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { appleLogo, googleLogo } from '@/assets/images';

const { width, height } = Dimensions.get('window');

const BackgroundBlobs = () => (
  <View style={StyleSheet.absoluteFill}>
    <View style={styles.blob1} />
    <View style={styles.blob2} />
  </View>
);

const AuthenticationScreen = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { signInWithApple, bypassSignIn } = useAuth();
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleAppleSignIn = async () => {
    Alert.alert('Apple login is yet to be implemented on this screen.');
  };

  const handleGoogleSignIn = async () => {
    if (isGoogleLoading) return;
    setIsGoogleLoading(true);

    logger.debug('--- GOOGLE SIGN-IN ATTEMPT ---');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const redirectUrl = Linking.createURL('auth/callback');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        Alert.alert('Authentication Error', error.message);
        return;
      }

      if (!data.url) {
        Alert.alert('Authentication Error', 'Could not get the Google login URL.');
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success' && result.url) {
        const url = result.url;
        const params = new URLSearchParams(url.split('#')[1]);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (!accessToken || !refreshToken) {
          Alert.alert('Authentication Error', 'Invalid login details received. Please try again.');
          return;
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          Alert.alert('Authentication Error', `Failed to set session: ${sessionError.message}`);
        } else {
          // --- Data Migration Logic ---
          try {
            const anonymous_analysis_id = await AsyncStorage.getItem('anonymous_analysis_id');
            const anonymous_questionnaire_id = await AsyncStorage.getItem('anonymous_questionnaire_id');
            const { data: { user } } = await supabase.auth.getUser();

            if (user && (anonymous_analysis_id || anonymous_questionnaire_id)) {
              logger.debug('Found anonymous data, invoking migration function...');
              const body: { [key: string]: string } = {};
              if (anonymous_analysis_id) body.anonymous_analysis_id = anonymous_analysis_id;
              if (anonymous_questionnaire_id) body.anonymous_questionnaire_id = anonymous_questionnaire_id;

              const { error: functionError } = await supabase.functions.invoke('migrate-user-data', {
                body,
              });

              if (functionError) {
                logger.error('Error migrating data:', functionError.message);
                Alert.alert('Data Migration Failed', 'We could not link your recent scan to your new account. Please contact support.');
              } else {
                logger.debug('Data migration successful.');
                // Clean up anonymous data from storage
                if (anonymous_analysis_id) await AsyncStorage.removeItem('anonymous_analysis_id');
                if (anonymous_questionnaire_id) await AsyncStorage.removeItem('anonymous_questionnaire_id');
              }
            } else {
              logger.debug('No migration data found in AsyncStorage. Skipping migration.');
            }
          } catch (e: any) {
            logger.error('Error during data migration process:', e);
            Alert.alert('Data Migration Failed', 'An unexpected error occurred while linking your scan data.');
          }
          // --- End of Data Migration Logic ---

          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            })
          );
        }
      } else if (result.type === 'cancel') {
        logger.debug('User cancelled the login process.');
      } else {
        Alert.alert('Authentication Failed', 'The login process was not completed.');
      }
    } catch (e: any) {
        Alert.alert('An Unexpected Error Occurred', e.message || 'Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <BackgroundBlobs />
      <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeAreaContent}>
        <View style={styles.topBlockContainer}>
          <View style={styles.headerContainer}>
            <View style={styles.backButtonContainer}>
              <Pressable
                style={styles.backButton}
                onPress={handleBack}
              >
                <ArrowLeft size={24} color="#333333" strokeWidth={1.5} />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Save Your Progress</Text>
            <Text style={styles.subtitle}>Sign in to keep track of your skin analysis and recommendations.</Text>
          </View>

          <View style={styles.socialButtonsContainer}>
            <TouchableOpacity
              onPress={handleAppleSignIn}
              style={[styles.socialButton, styles.appleButton, isAppleLoading && styles.disabledButton]}
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
            
            <TouchableOpacity
              onPress={handleGoogleSignIn}
              style={[styles.socialButton, styles.googleButton, isGoogleLoading && styles.disabledButton]}
              activeOpacity={0.8}
              disabled={isGoogleLoading}
            >
              <View style={styles.buttonContent}>
                <Image 
                  source={googleLogo} 
                  style={styles.googleIcon}
                  resizeMode="contain"
                  fadeDuration={0}
                />
                <Text style={styles.googleButtonText}>
                  {isGoogleLoading ? 'Signing In...' : 'Continue with Google'}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={bypassSignIn}
              style={[styles.socialButton, styles.googleButton]}
              activeOpacity={0.8}
            >
              <Text style={styles.googleButtonText}>Bypass</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  safeAreaContent: {
    flex: 1,
  },
  topBlockContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (ReactNativeStatusBar.currentHeight ?? 0) + 5 : 15,
    backgroundColor: 'transparent',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  backButtonContainer: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(240, 240, 240, 0.7)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingBottom: height * 0.2,
    backgroundColor: 'transparent',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: 20,
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
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
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
  disabledButton: {
    opacity: 0.6,
  },
  blob1: {
    position: 'absolute',
    width: width,
    height: width,
    borderRadius: width * 0.45,
    top: height * 0.2,
    right: -width * 0.1,
    backgroundColor: 'rgba(186, 190, 255, 0.35)',
  },
  blob2: {
    position: 'absolute',
    width: width * 0.95,
    height: width * 0.95,
    borderRadius: width * 0.475,
    bottom: height * 0.15,
    left: -width * 0.15,
    backgroundColor: 'rgba(255, 168, 168, 0.25)',
  },
});

export default AuthenticationScreen;
