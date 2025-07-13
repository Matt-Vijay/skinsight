import { logger } from '@/config/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import uuid from 'react-native-uuid';

// --- Production Keys ---
const prodUrl = 'https://bscdfxgqaftuqufbzkqt.supabase.co';
const prodAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzY2RmeGdxYWZ0dXF1ZmJ6a3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MjA4MzQsImV4cCI6MjA1ODQ5NjgzNH0.5INmHQs5ZtmjuCdDJ3PN3fELkMqVw7_XGtIowUgWHwM';

// --- Local Keys (for development with Supabase CLI) ---
// Use 10.0.2.2 for Android emulator to connect to host machine's localhost
const localUrl = Platform.OS === 'android' ? 'http://10.0.2.2:54321' : 'http://127.0.0.1:54321';
const localAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// ALWAYS use production keys for this feature to work.
// The local development server does not support invoking Edge Functions in this way.
const SUPABASE_URL = prodUrl;
const SUPABASE_ANON_KEY = prodAnonKey;

// Make sure we have valid configurations
if (!SUPABASE_URL) {
  logger.error('Invalid Supabase URL. Please set a valid URL in src/config/supabase.ts');
}

if (!SUPABASE_ANON_KEY) {
  logger.error('Invalid Supabase Anonymous Key. Please set a valid key in src/config/supabase.ts');
}

// Create the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for mobile OAuth flows
  },
});

// Check if the client was initialized correctly
if (!supabase) {
  logger.error('Failed to initialize Supabase client');
}

// Database setup helper
export const checkDatabaseSetup = async () => {
  try {
    logger.debug('Checking database setup...');
    
    // Check if profiles table exists
    const { data: profilesExists, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (profilesError) {
      if (profilesError.message.includes('relation "profiles" does not exist')) {
        logger.error('Profiles table does not exist. You need to create it in the Supabase dashboard.');
        logger.debug(`
          SQL to create profiles table:
          
          CREATE TABLE profiles (
            id UUID REFERENCES auth.users(id) PRIMARY KEY,
            full_name TEXT,
            email TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
          );
          
          -- Enable RLS
          ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
          
          -- Create policies
          CREATE POLICY "Users can view their own profile" 
          ON profiles FOR SELECT 
          USING (auth.uid() = id);
          
          CREATE POLICY "Users can update their own profile" 
          ON profiles FOR UPDATE 
          USING (auth.uid() = id);
          
          -- Create trigger to auto-create profile on signup
          CREATE OR REPLACE FUNCTION public.handle_new_user() 
          RETURNS TRIGGER AS $$
          BEGIN
            INSERT INTO public.profiles (id, full_name, email)
            VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email);
            RETURN new;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
          
          CREATE OR REPLACE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
        `);
        return { ready: false, missingTables: ['profiles'] };
      } else {
        logger.error('Error checking profiles table:', profilesError.message);
        throw profilesError;
      }
    }
    
    logger.debug('Database setup looks good!');
    return { ready: true };
  } catch (error: any) {
    logger.error('Database setup check failed:', error.message || 'Unknown error');
    return { ready: false, error };
  }
};

// Auth functions
export const signUpWithEmail = async (email: string, password: string, fullName: string) => {
  try {
    logger.debug(`Attempting to sign up user: ${email}`);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      }
    });

    if (error) {
      logger.error('Sign up error:', error.message);
      throw error;
    }
    logger.debug('Sign up successful:', data);
    return { data, error: null };
  } catch (error: any) {
    logger.error('Sign up exception:', error.message || 'Unknown error');
    return { data: null, error };
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    logger.debug(`Attempting to sign in user: ${email}`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.error('Sign in error:', error.message);
      throw error;
    }
    logger.debug('Sign in successful');
    return { data, error: null };
  } catch (error: any) {
    logger.error('Sign in exception:', error.message || 'Unknown error');
    return { data: null, error };
  }
};

export const resetPassword = async (email: string) => {
  try {
    logger.debug(`Checking if user exists for password reset: ${email}`);
    
    // Try to check if user exists by looking up a matching profile
    // Note: This only works if you have a profiles table with email column
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .single();
    
    // If no profile found or error, we can try a different approach
    // This is not foolproof as Supabase doesn't expose a direct "user exists" API in the client
    if (!userProfile && !email.includes('@example.com')) { // Skip check for test emails
      logger.debug(`No profile found for ${email}, not sending password reset`);
      // Return a generic message for security
      return { data: null, error: { message: "For security purposes, if that email address is in our system, we'll send you instructions to reset your password." } };
    }
    
    // User likely exists or is a test email, proceed with password reset
    logger.debug(`Sending password reset OTP to: ${email}`);
    
    // Use OTP for password reset with the reset password email template
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: undefined, // Don't use magic link redirect - we want the 6-char token only
    });

    if (error) {
      // Handle "for security purposes" errors silently
      if (error.message.includes('For security purposes')) {
        logger.debug('Password reset OTP request processed');
        return { data: null, error: null };
      }
      // Don't log the error message, just return it
      return { data: null, error };
    }
    
    logger.debug('Password reset OTP sent successfully');
    return { data, error: null };
  } catch (error: any) {
    // Handle "for security purposes" errors silently in catch block too
    if (error.message && error.message.includes('For security purposes')) {
      logger.debug('Password reset OTP request processed');
      return { data: null, error: null };
    }
    // Don't log the error message, just return it
    return { data: null, error };
  }
};

export const signOut = async () => {
  try {
    logger.debug('Attempting to sign out user');
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error('Sign out error:', error.message);
      throw error;
    }
    logger.debug('Sign out successful');
    return { error: null };
  } catch (error: any) {
    logger.error('Sign out exception:', error.message || 'Unknown error');
    return { error };
  }
};

// Storage functions
export const uploadImage = async (file: any, path: string, contentType: string) => {
  try {
    logger.debug(`Uploading image to ${path}`);
    const { data, error } = await supabase.storage
      .from('skin-images')
      .upload(path, file, {
        contentType,
        upsert: true,
      });

    if (error) {
      logger.error('Upload error:', error.message);
      throw error;
    }
    
    logger.debug('Upload successful:', data);
    return { data, error: null };
  } catch (error: any) {
    logger.error('Upload exception:', error.message || 'Unknown error');
    return { data: null, error };
  }
};

export const getImageUrl = (path: string) => {
  const { data } = supabase.storage.from('skin-images').getPublicUrl(path);
  return data.publicUrl;
};

// Profile functions
export const getUserProfile = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'Not authenticated' } };
    
    logger.debug('Getting profile for user ID:', user.id);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (error) {
      logger.error('Get profile error:', error.message);
      throw error;
    }
    
    logger.debug('Profile retrieved successfully:', data);
    return { data, error: null };
  } catch (error: any) {
    logger.error('Get profile exception:', error.message || 'Unknown error');
    return { data: null, error };
  }
};

export const updateUserProfile = async (updates: any) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'Not authenticated' } };
    
    logger.debug('Updating profile for user ID:', user.id);
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select();
    
    if (error) {
      logger.error('Update profile error:', error.message);
      throw error;
    }
    
    logger.debug('Profile updated successfully:', data);
    return { data, error: null };
  } catch (error: any) {
    logger.error('Update profile exception:', error.message || 'Unknown error');
    return { data: null, error };
  }
};

// OTP functions
export const sendOTP = async (email: string, isPasswordReset = false) => {
  try {
    logger.debug(`Sending OTP to ${email} for ${isPasswordReset ? 'password reset' : 'verification'}`);
    
    if (isPasswordReset) {
      // For password reset, use resetPasswordForEmail
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: undefined,
      });
      
      if (error) {
        logger.error('Password reset OTP error:', error.message);
        return { error };
      }
      return { data, error: null };
    } else {
      // For signup verification, use signInWithOtp
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false, // Don't create a new user, just send the OTP
        }
      });
      
      if (error) {
        logger.error('Signup verification OTP error:', error.message);
        return { error };
      }
      return { data, error: null };
    }
  } catch (error: any) {
    logger.error('OTP send exception:', error.message || 'Unknown error');
    return { error };
  }
};

export const verifyOTP = async (email: string, token: string, isPasswordReset = false) => {
  try {
    logger.debug(`Verifying OTP for ${email}`);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: isPasswordReset ? 'recovery' : 'email',
    });

    if (error) {
      logger.error('OTP verification error:', error.message);
      return { data: null, error, valid: false };
    }
    
    logger.debug('OTP verified successfully');
    return { data, error: null, valid: true };
  } catch (error: any) {
    logger.error('OTP verification exception:', error.message);
    return { data: null, error, valid: false };
  }
};

export const saveAnonymousAnalysis = async (analysisData: any) => {
  try {
    logger.debug('Saving anonymous analysis data');

    const dataToInsert = {
      id: uuid.v4(),
      overall_score: analysisData.analysis.overallScore,
      overall_score_elaboration: analysisData.analysis.overallSummary,
      hydration_score: analysisData.analysis.metrics.hydration,
      hydration_score_elaboration: analysisData.analysis.metrics.hydrationSummary,
      barrier_score: analysisData.analysis.metrics.barrier,
      barrier_score_elaboration: analysisData.analysis.metrics.barrierSummary,
      important_habit: analysisData.analysis.blueprint.habit.title,
      important_ingredient: analysisData.analysis.blueprint.ingredient.title,
      routine_ids_array: analysisData.routine.products.map((p: any) => p.product_id),
    };

    const { error } = await supabase.from('anonymous_analysis_data').insert([dataToInsert]);

    if (error) {
      logger.error('Error saving anonymous analysis data:', error.message);
      throw error;
    }

    await AsyncStorage.setItem('anonymous_analysis_id', dataToInsert.id as string);

    logger.debug('Anonymous analysis data saved successfully');
    return { error: null };
  } catch (error: any) {
    logger.error('Save anonymous analysis exception:', error.message || 'Unknown error');
    return { error };
  }
};
