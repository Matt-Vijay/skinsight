import React from 'react';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { Easing } from 'react-native';
import WelcomeScreen from '../screens/WelcomeScreen';
import QuestionnaireScreen from '../screens/questionnaire/QuestionnaireScreen';
import FaceScanScreen from '../screens/FaceScanScreen';
import SubmissionLoadingScreen from '../screens/SubmissionLoadingScreen';
import AnalysisScreen from '../screens/AnalysisScreen';
import TabNavigator from './TabNavigator';
import AuthenticationScreen from '../screens/auth/AuthenticationScreen';

export type DevStackParamList = {
  Welcome: undefined;
  Questionnaire: undefined;
  FaceScanScreen: undefined;
  SubmissionLoadingScreen: { submissionId: string };
  AnalysisScreen: undefined;
  Main: undefined;
  Authentication: undefined;
};

const Stack = createStackNavigator<DevStackParamList>();

const DevNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
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
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen 
        name="Questionnaire" 
        component={QuestionnaireScreen}
      />
      <Stack.Screen name="FaceScanScreen" component={FaceScanScreen} />
      <Stack.Screen name="SubmissionLoadingScreen" component={SubmissionLoadingScreen} />
      <Stack.Screen 
        name="AnalysisScreen" 
        component={AnalysisScreen}
      />
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="Authentication" component={AuthenticationScreen} />
    </Stack.Navigator>
  );
};

export default DevNavigator; 