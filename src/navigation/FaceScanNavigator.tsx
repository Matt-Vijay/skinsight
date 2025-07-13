import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import FaceScanScreen from '@/screens/FaceScanScreen';
import SubmissionLoadingScreen from '@/screens/SubmissionLoadingScreen';
import AnalysisScreen from '@/screens/AnalysisScreen';

export type FaceScanStackParamList = {
  FaceScan: undefined;
  SubmissionLoadingScreen: {
    imageUris: {
      frontImageUri: string;
      leftImageUri: string;
      rightImageUri: string;
    };
    anonymousQuestionnaireId: string;
  };
  AnalysisScreen: {
    analysisData: any; // Or a more specific type if you have one
  };
};

const Stack = createStackNavigator<FaceScanStackParamList>();

const FaceScanNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="FaceScan"
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        cardStyleInterpolator: ({ current: { progress } }) => ({
          cardStyle: {
            opacity: progress,
          },
        }),
      }}
    >
      <Stack.Screen name="FaceScan" component={FaceScanScreen} />
      <Stack.Screen
        name="SubmissionLoadingScreen"
        component={SubmissionLoadingScreen}
      />
      <Stack.Screen name="AnalysisScreen" component={AnalysisScreen} />
    </Stack.Navigator>
  );
};

export default FaceScanNavigator; 