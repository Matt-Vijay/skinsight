import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User, SupabaseClient } from '@supabase/supabase-js';
import { 
  supabase, 
  signInWithEmail, 
  signUpWithEmail, 
  resetPassword, 
  signOut,
  sendOTP,
  verifyOTP
} from '../config/supabase';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { logger } from '@/config/logger';
import { clearQuestionnaireCache } from '../services/questionnaireCache';
import { v4 as uuidv4 } from 'uuid';

// Define user profile data structure
interface UserProfile {
  age: string;
  gender: string;
  skinType: string;
}

// Define types for our context
interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isInitialAuth: boolean;
  loginLoading: boolean;
  loadingProfile: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  finalizeUser: (session: Session) => void;
  setIsInitialAuth: (isInitial: boolean) => void;
  fetchUserProfile: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: any }>;
  sendVerificationOTP: (email: string, isPasswordReset?: boolean) => Promise<{ error: any }>;
  verifyOTPCode: (email: string, token: string, isPasswordReset?: boolean) => Promise<{ error: any, valid: boolean }>;
  changePassword: (password: string) => Promise<{ error: any }>;
  signInWithApple: () => Promise<{ error: any, data?: { session: Session | null, user: User | null } }>;
  bypassSignIn: () => void;
  supabase: SupabaseClient;
}

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  userProfile: null,
  loading: true,
  isInitialAuth: false,
  loginLoading: false,
  loadingProfile: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  logout: async () => {},
  finalizeUser: () => {},
  setIsInitialAuth: () => {},
  fetchUserProfile: async () => {},
  requestPasswordReset: async () => ({ error: null }),
  sendVerificationOTP: async () => ({ error: null }),
  verifyOTPCode: async () => ({ error: null, valid: false }),
  changePassword: async () => ({ error: null }),
  signInWithApple: async () => ({ error: null, data: { session: null, user: null } }),
  bypassSignIn: () => {},
  supabase: supabase,
});

// Hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialAuth, setIsInitialAuth] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          logger.info('Session check failed, user is logged out:', error.message);
          setUser(null);
          setSession(null);
          setUserProfile(null);
          return;
        }
        
        if (data && data.session) {
          setSession(data.session);
          setUser(data.session.user);
        } else {
          setUser(null);
          setSession(null);
        }
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
    
    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (_event === 'SIGNED_OUT') {
          setUser(null);
          setUserProfile(null);
        } else if (session?.user) {
          setUser(session.user);
        }
      }
    );
    
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []); // Remove isInitialAuth dependency to prevent infinite loops

  // Helper function to get skin type label
  const getSkinType = (type: string | null): string => {
    if (!type) return 'Not specified';
    const skinTypes: {[key: string]: string} = {
      'dry': 'Dry',
      'oily': 'Oily',
      'combination': 'Combination',
      'normal': 'Normal',
      'sensitive': 'Sensitive'
    };
    return skinTypes[type.toLowerCase()] || type;
  };

  // Fetch user profile data - memoized to prevent unnecessary re-renders
  const fetchUserProfile = useCallback(async () => {
    if (loadingProfile || !user) return;

    setLoadingProfile(true);
    try {
      // Fetch profile and questionnaire data in parallel
      const [profileResponse, questionnaireResponse] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
        supabase.from('user_questionnaire_results').select('gender, skin_type, birthdate').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single()
      ]);

      const { data: profileData, error: profileError } = profileResponse;
      if (profileError && profileError.code !== 'PGRST116') { // Ignore error if no profile found
        throw profileError;
      }

      const { data: questionnaireData, error: questionnaireError } = questionnaireResponse;
      if (questionnaireError && questionnaireError.code !== 'PGRST116') { // Ignore error if no questionnaire found
        throw questionnaireError;
      }
      
      let age = '';
      if (questionnaireData?.birthdate) {
        const birthDate = new Date(questionnaireData.birthdate);
        const today = new Date();
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--;
        }
        age = calculatedAge.toString();
      }
      
      const genderValue = questionnaireData?.gender?.[0];
      const gender = genderValue && genderValue !== "Prefer not to say" ? genderValue : '';

      setUserProfile({
        age: age,
        gender: gender,
        skinType: getSkinType(questionnaireData?.skin_type?.[0]),
      });

    } catch (err) {
      logger.error('Error fetching user profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  }, [user, loadingProfile]);

  const finalizeUser = (session: Session) => {
    setUser(session.user);
    setIsInitialAuth(false);
  };

  const signInWithApple = async () => {
    try {
      logger.debug('Starting Apple Sign-In process...');
      
      // Generate nonce first
      const nonce = uuidv4();
      logger.debug('Generated nonce for Apple Sign-In');

      // Check if Apple Sign-In is available
      if (!appleAuth.isSupported) {
        throw new Error('Apple Sign-In is not supported on this device');
      }

      logger.debug('Requesting Apple authentication...');
      
      // Create a timeout promise to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Apple Sign-In timed out after 30 seconds')), 30000);
      });

      const appleAuthPromise: Promise<any> = appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
        nonce: nonce, // Pass the nonce to Apple request
      });

      // Race between the auth request and timeout
      const appleAuthRequestResponse = await Promise.race([appleAuthPromise, timeoutPromise]);
      
      logger.debug('Apple authentication response received');

      if (!appleAuthRequestResponse.identityToken) {
        throw new Error('Apple Sign-In failed: No identity token received');
      }

      if (!appleAuthRequestResponse.nonce) {
        logger.warn('No nonce returned from Apple, this might cause issues');
      }

      logger.debug('Signing in with Supabase using Apple token...');
      
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: appleAuthRequestResponse.identityToken,
        nonce: nonce,
      });

      if (error) {
        logger.error('Supabase Apple Sign-In error:', error.message);
        return { error };
      }

      if (data?.session && data?.user) {
        logger.debug('Apple Sign-In successful, setting session...');
        setSession(data.session);
        setUser(data.user);
        
        // Handle data migration if needed
        try {
          const anonymous_analysis_id = await AsyncStorage.getItem('anonymous_analysis_id');
          const anonymous_questionnaire_id = await AsyncStorage.getItem('anonymous_questionnaire_id');

          if (anonymous_analysis_id || anonymous_questionnaire_id) {
            logger.debug('Found anonymous data, invoking migration function...');
            const body: { [key: string]: string } = {};
            if (anonymous_analysis_id) body.anonymous_analysis_id = anonymous_analysis_id;
            if (anonymous_questionnaire_id) body.anonymous_questionnaire_id = anonymous_questionnaire_id;

            const { error: functionError } = await supabase.functions.invoke('migrate-user-data', {
              body,
            });

            if (functionError) {
              logger.error('Error migrating data:', functionError.message);
            } else {
              logger.debug('Data migration successful.');
              // Clean up anonymous data from storage
              if (anonymous_analysis_id) await AsyncStorage.removeItem('anonymous_analysis_id');
              if (anonymous_questionnaire_id) await AsyncStorage.removeItem('anonymous_questionnaire_id');
            }
          }
        } catch (migrationError: any) {
          logger.error('Error during data migration process:', migrationError);
          // Don't fail the sign-in process for migration errors
        }
      } else {
        logger.error('Apple Sign-In succeeded but no session/user data received');
        throw new Error('Sign-in succeeded but no session data received');
      }

      logger.debug('Apple Sign-In process completed successfully');
      return { error: null, data };
    } catch (error: any) {
      logger.error('Apple sign-in error:', error.message);
      
      // Provide more specific error messages
      if (error.message.includes('timeout')) {
        return { error: { message: 'Apple Sign-In timed out. Please try again.' } };
      } else if (error.message.includes('canceled')) {
        return { error: { message: 'Apple Sign-In was canceled.' } };
      } else if (error.message.includes('not supported')) {
        return { error: { message: 'Apple Sign-In is not available on this device.' } };
      }
      
      return { error: { message: error.message || 'Apple Sign-In failed. Please try again.' } };
    }
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    setLoginLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data.user) {
        setUser(data.user); 
        await fetchUserProfile(); // Now calls the main fetcher
      }

      return { data, error };
    } catch (err) {
      logger.error('Error signing in:', err);
      throw err;
    } finally {
      setLoginLoading(false);
    }
  };

  // Auth actions
  const authActions = {
    signUp: async (email: string, password: string, fullName: string) => {
      try {
        // Create the user with Supabase - this will automatically send a verification email
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          }
        });

        if (signUpError) {
          logger.error('Sign up error:', signUpError.message);
          return { error: signUpError };
        }

        // For new sign-ups, we immediately try to get the session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          logger.error('Error retrieving session after signup:', sessionError.message);
        } else if (sessionData.session) {
          setSession(sessionData.session);
          setUser(sessionData.session.user);
        }
        
        return { error: null };
      } catch (error: any) {
        logger.error('Signup error:', error.message);
        return { error };
      }
    },

    logout: async () => {
      try {
        const { error } = await signOut();
        if (error) {
          logger.error('Error signing out:', error.message);
        }
        // Also clear the questionnaire cache on logout
        await clearQuestionnaireCache();
      } catch (error: any) {
        logger.error('Logout error:', error.message);
      } finally {
        // Always clear local state on logout, regardless of server result
        setUser(null);
        setSession(null);
        setUserProfile(null);
      }
    },

    requestPasswordReset: async (email: string) => {
      try {
        setLoading(true);
        const { error } = await resetPassword(email);
        return { error };
      } catch (error: any) {
        logger.error('Password reset request error:', error.message);
        return { error };
      } finally {
        setLoading(false);
      }
    },

    sendVerificationOTP: async (email: string, isPasswordReset = false) => {
      try {
        // Don't set global loading state
        const { error } = await sendOTP(email, isPasswordReset);
        return { error };
      } catch (error: any) {
        logger.error('OTP send error:', error.message);
        return { error };
      }
    },

    verifyOTPCode: async (email: string, token: string, isPasswordReset = false) => {
      try {
        // Don't set global loading state
        const { data, error, valid } = await verifyOTP(email, token, isPasswordReset);
        if (error) return { error, valid: false };
        
        // Only set session if this is NOT a password reset flow
        // and we actually have a session
        if (!isPasswordReset && data?.session) {
          setSession(data.session);
          setUser(data.session.user);
        }
        
        return { error: null, valid };
      } catch (error: any) {
        logger.error('OTP verification error:', error.message);
        return { error, valid: false };
      }
    },

    changePassword: async (password: string) => {
      try {
        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        return { error };
      } catch (error: any) {
        logger.error('Password change error:', error.message);
        return { error };
      } finally {
        setLoading(false);
      }
    },
  };

  const bypassSignIn = () => {
    const mockUser = {
      id: 'mock-user-id',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as User;
    const mockSession = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: mockUser,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    } as Session;
    setUser(mockUser);
    setSession(mockSession);
    setUserProfile({
      age: '25',
      gender: 'Male',
      skinType: 'Oily',
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userProfile,
        loading,
        isInitialAuth,
        loginLoading,
        loadingProfile,
        signIn,
        signUp: authActions.signUp,
        logout: authActions.logout,
        finalizeUser,
        setIsInitialAuth,
        fetchUserProfile,
        requestPasswordReset: authActions.requestPasswordReset,
        sendVerificationOTP: authActions.sendVerificationOTP,
        verifyOTPCode: authActions.verifyOTPCode,
        changePassword: authActions.changePassword,
        signInWithApple,
        bypassSignIn,
        supabase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
