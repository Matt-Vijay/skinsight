import 'react-native-get-random-values';
// import 'react-native-reanimated';
import './src/polyfills'; // Import polyfills first
import React, { useEffect, useState, useCallback } from 'react';
import { 
  StatusBar as ExpoStatusBar 
} from 'expo-status-bar';
import {
  View,
  StyleSheet
} from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import Navigation from './src/navigation';
import * as SplashScreen from 'expo-splash-screen';
import { logger } from '@/config/logger';
import { useFonts } from 'expo-font';
import 'react-native-url-polyfill/auto';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Main app content with access to theme
const AppContent = () => {
  const { isDarkMode } = useTheme();
  
  return (
    <>
      <ExpoStatusBar style={isDarkMode ? "light" : "dark"} />
      <Navigation />
    </>
  );
};

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  const [fontsLoaded] = useFonts({
    // Add your fonts here if you have any
  });

  useEffect(() => {
    async function prepare() {
      try {
        if (fontsLoaded) {
          // You can add any other async tasks here
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (e) {
        logger.warn(String(e));
      } finally {
        setAppIsReady(true);
      }
    }

    if (fontsLoaded) {
      prepare();
    } else {
        // If fonts are not loading for some reason, don't block the app forever
        prepare();
    }
  }, [fontsLoaded]);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);
  
  if (!appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container} onLayout={onLayoutRootView}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <ThemeProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 