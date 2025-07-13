import React from 'react';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { User } from '@supabase/supabase-js';
import { Easing } from 'react-native';

// Import screens
import WelcomeScreen from '../screens/WelcomeScreen';
import QuestionnaireScreen from '../screens/questionnaire/QuestionnaireScreen';
import FaceScanScreen from '../screens/FaceScanScreen';
import SubmissionLoadingScreen from '../screens/SubmissionLoadingScreen';
import AnalysisScreen from '../screens/AnalysisScreen';
import AuthenticationScreen from '../screens/auth/AuthenticationScreen';
import { ImageURIs } from '@/types/questionnaireTypes';

// Define the types for our navigation parameters
export type AuthStackParamList = {
  Welcome: undefined;
  Questionnaire: undefined;
  FaceScanScreen: {
    submissionId: string;
  };
  SubmissionLoadingScreen: {
    imageUris?: ImageURIs;
    anonymousQuestionnaireId: string;
  };
  AnalysisScreen: {
    analysisData: any; // Consider creating a type for this
  };
  Authentication: undefined;
};

const Stack = createStackNavigator<AuthStackParamList>();

function AuthNavigator() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: '#FFFFFF' },
        gestureEnabled: false, // Disable gestures to prevent accidental navigation
        cardStyleInterpolator: ({ current: { progress } }) => ({
          cardStyle: {
            opacity: progress,
          },
        }),
      }}
      initialRouteName="Welcome"
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen 
        name="Questionnaire" 
        component={QuestionnaireScreen}
      />
      <Stack.Screen 
        name="FaceScanScreen" 
        component={FaceScanScreen}
      />
      <Stack.Screen
        name="SubmissionLoadingScreen"
        component={SubmissionLoadingScreen}
      />
      <Stack.Screen 
        name="AnalysisScreen" 
        component={AnalysisScreen} 
        options={{
          cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
        }}
      />
      <Stack.Screen name="Authentication" component={AuthenticationScreen} />
    </Stack.Navigator>
  );
}

export default AuthNavigator;
