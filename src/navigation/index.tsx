import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import AuthNavigator from './AuthNavigator';
import TabNavigator from './TabNavigator';
import * as Linking from 'expo-linking';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';

const prefix = Linking.createURL('/');

const linking = {
  prefixes: [prefix],
  config: {
    screens: {
      Auth: {
        screens: {
          // Add auth-related deep links here if needed in the future
          'auth/callback': 'auth/callback',
        },
      },
      Main: {
        screens: {
          Home: 'home',
          Routine: 'routine',
          Settings: 'settings',
        },
      },
    },
  },
};

type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking as any} fallback={<ActivityIndicator />}>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
        }}
      >
        {user ? (
          <Stack.Screen name="Main" component={TabNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator; 