import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/config/logger';

// Define theme object structure
interface ThemeColors {
  background: string;
  text: string;
  secondary: string;
  card: string;
  border: string;
  primary: string;
}

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  theme: ThemeColors;
}

// Default light theme colors
const lightTheme: ThemeColors = {
  background: '#F8F8F8',
  text: '#000000',
  secondary: '#888888',
  card: '#FFFFFF',
  border: '#EEEEEE',
  primary: '#6200EE', // Assuming this is the primary color used in the app
};

// Dark theme colors
const darkTheme: ThemeColors = {
  background: '#121212',
  text: '#FFFFFF',
  secondary: '#AAAAAA',
  card: '#1E1E1E',
  border: '#333333',
  primary: '#BB86FC',
};

// Create the context with a default value
const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
  theme: lightTheme,
});

// Storage key for persistence
const THEME_STORAGE_KEY = 'app_dark_mode';

// Provider component that wraps the app
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Load saved theme preference on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === 'true');
        }
      } catch (error) {
        logger.error('Error loading theme preference:', error);
      }
    };

    loadThemePreference();
  }, []);

  // Toggle theme and save preference
  const toggleTheme = async () => {
    try {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode.toString());
    } catch (error) {
      logger.error('Error saving theme preference:', error);
    }
  };

  // Current theme based on mode
  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext); 