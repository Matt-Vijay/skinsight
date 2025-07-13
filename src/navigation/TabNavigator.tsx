import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, Animated, Platform, Easing, Pressable } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS as AppColors } from '@/components/AuthComponents';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, RouteProp, ParamListBase } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { DevStackParamList } from './DevNavigator';
import * as Haptics from 'expo-haptics';
import { ScanFace, ScanSearch, Plus } from 'lucide-react-native';
import MaskedView from '@react-native-masked-view/masked-view';

// Import screens
import HomeScreen from '@/screens/HomeScreen';
import RoutineScreen from '@/screens/RoutineScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import FaceScanScreen from '@/screens/FaceScanScreen';
import AnalysisScreen from '@/screens/AnalysisScreen';
import SubmissionLoadingScreen from '@/screens/SubmissionLoadingScreen';

// Define navigation prop type based on the centralized RootStackParamList
type AppNavigationProp = StackNavigationProp<DevStackParamList>;

const Tab = createBottomTabNavigator();
const { width, height } = Dimensions.get('window');

const activeColor = AppColors.primary;
const inactiveColor = '#888888';

const TabBarIcon = ({ focused, name, size }: { focused: boolean, name: string, size: number }) => {
  const animation = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: focused ? 1 : 0,
      duration: 250,
      easing: Easing.bezier(0.42, 0, 0.58, 1),
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Active Icon */}
      <Animated.View style={{ opacity: animation, position: 'absolute' }}>
        <Ionicons name={name as any} size={size} color={activeColor} />
      </Animated.View>
      {/* Inactive Icon */}
      <Animated.View style={{ opacity: animation.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), position: 'absolute' }}>
        <Ionicons name={name as any} size={size} color={inactiveColor} />
      </Animated.View>
    </View>
  );
};

const TabBarLabel = ({ focused, label }: { focused: boolean, label: string }) => {
  const animation = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: focused ? 1 : 0,
      duration: 250,
      easing: Easing.bezier(0.42, 0, 0.58, 1),
      useNativeDriver: true,
    }).start();
  }, [focused]);
  
  const labelStyle: {
    fontSize: number;
    marginTop: number;
    textAlign: 'center';
  } = {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  };

  return (
    <View style={{ width: 60, height: 15 }}>
      {/* Active Label */}
      <Animated.View style={{ opacity: animation, position: 'absolute', width: '100%' }}>
        <Text style={[labelStyle, { color: activeColor }]}>{label}</Text>
      </Animated.View>
      {/* Inactive Label */}
      <Animated.View style={{ opacity: animation.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), position: 'absolute', width: '100%' }}>
        <Text style={[labelStyle, { color: inactiveColor }]}>{label}</Text>
      </Animated.View>
    </View>
  );
};

const PressableMenuItem = ({ onPress, label, icon: Icon }: { onPress: () => void, label: string, icon: React.ElementType }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const easing = Easing.bezier(0.42, 0, 0.58, 1);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.timing(scaleAnim, {
      toValue: 0.95,
      duration: 150,
      easing,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 200,
      easing,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.View style={[styles.menuItemContainer, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.menuItemBorder}>
          <View style={styles.menuItemInner}>
            <MaskedView
              style={{ height: 80, width: 80 }}
              maskElement={<Icon size={80} color="black" strokeWidth={1.2} />}
            >
              <LinearGradient
                colors={['#FFA8A8', '#A8C5FF']}
                style={{ flex: 1 }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            </MaskedView>
            <Text style={styles.menuItemText}>{label}</Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: RouteProp<ParamListBase, string> }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1, 
          borderTopColor: '#F0F0F0',
          height: 85,
          paddingBottom: 25,
          paddingTop: 12,
          paddingRight: 97, // Make space for the FAB on the right
          justifyContent: 'flex-start', // Group tabs to the left
        },
        tabBarShowLabel: false, // We are using a custom label component
        tabBarItemStyle: {
          marginHorizontal: 10, // Add horizontal margin for spacing
          alignItems: 'center',
          justifyContent: 'center',
        },
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen} 
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, size }: { focused: boolean, size: number }) => (
            <View style={{ alignItems: 'center' }}>
              <TabBarIcon focused={focused} name="home-outline" size={size} />
              <TabBarLabel focused={focused} label="Home" />
            </View>
          ),
        }}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />
      
      <Tab.Screen 
        name="Routine" 
        component={RoutineScreen}
        options={{
          tabBarIcon: ({ focused, size }: { focused: boolean, size: number }) => (
            <View style={{ alignItems: 'center' }}>
              <TabBarIcon focused={focused} name="calendar-outline" size={size} />
              <TabBarLabel focused={focused} label="Routine" />
            </View>
          ),
        }}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />
      
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{
          tabBarIcon: ({ focused, size }: { focused: boolean, size: number }) => (
            <View style={{ alignItems: 'center' }}>
              <TabBarIcon focused={focused} name="settings-outline" size={size} />
              <TabBarLabel focused={focused} label="Settings" />
            </View>
          ),
        }}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />
    </Tab.Navigator>
  );
};

// Add floating action button (FAB) component
function TabNavigatorWithFAB() {
  const navigation = useNavigation<AppNavigationProp>();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Animation values
  const fabRotation = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const menuItemsOpacity = useRef(new Animated.Value(0)).current;

  // Convert rotation value to interpolated string for the FAB icon
  const spin = fabRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '135deg'] // Rotates to an 'X'
  });

  const toggleMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newIsOpen = !isMenuOpen;
    setIsMenuOpen(newIsOpen);

    const toValue = newIsOpen ? 1 : 0;
    const duration = 300;
    const easing = Easing.bezier(0.42, 0, 0.58, 1);

    Animated.parallel([
      Animated.timing(fabRotation, {
        toValue,
        duration,
        easing,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue,
        duration,
        easing,
        useNativeDriver: true,
      }),
      Animated.timing(menuItemsOpacity, {
        toValue,
        duration,
        easing,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleFaceScanPress = () => {
    toggleMenu();
    setTimeout(() => {
      navigation.navigate('FaceScanScreen');
    }, 300);
  };

  const handleProductScanPress = () => {
    toggleMenu();
    // To be implemented
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <TabNavigator />

      <Animated.View 
        style={[styles.overlay, { opacity: overlayOpacity }]}
        pointerEvents={isMenuOpen ? 'auto' : 'none'}
      >
        <TouchableOpacity 
          style={StyleSheet.absoluteFill}
          onPress={toggleMenu}
          activeOpacity={1}
        />
      </Animated.View>

      <Animated.View style={[
        styles.menuContainer,
        { 
          opacity: menuItemsOpacity,
        }
      ]}
        pointerEvents={isMenuOpen ? 'auto' : 'none'}
      >
        <PressableMenuItem label="Face" onPress={handleFaceScanPress} icon={ScanFace} />
        <PressableMenuItem label="Product" onPress={handleProductScanPress} icon={ScanSearch} />
      </Animated.View>

      <TouchableOpacity 
        style={styles.fabContainer} 
        onPress={toggleMenu}
        activeOpacity={0.9}
      >
        <View style={styles.fab}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <MaskedView
              style={{ width: 38, height: 38 }}
              maskElement={<Plus size={38} color="black" strokeWidth={2.5} />}
            >
              <LinearGradient
                colors={['#FFA8A8', '#A8C5FF']}
                style={{ flex: 1 }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            </MaskedView>
          </Animated.View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    right: 30,
    bottom: 45, 
    zIndex: 999,
  },
  fab: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 998,
  },
  menuContainer: {
    position: 'absolute',
    right: 65, // Position to the left of the FAB
    bottom: 135, // Position above the FAB
    alignItems: 'flex-end',
    zIndex: 998,
    gap: 15,
  },
  menuItemContainer: {
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 8,
  },
  menuItemBorder: {
    width: 170,
    height: 130,
    borderRadius: 14,
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.primary,
  },
  menuItemInner: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginTop: 8,
  },
});

export default TabNavigatorWithFAB;
