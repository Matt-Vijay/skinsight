import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Dimensions, Pressable, Animated, Easing, UIManager, Platform, LayoutAnimation, Image, ImageBackground, Modal } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarPlus2, Laugh, Smile, Meh, Frown, Angry, SquarePen, HeartHandshake, Sun, Check, Moon, TentTree, SendHorizontal, ListCheck, Circle, MousePointerClick } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import Svg, { Circle as SvgCircle, Path, Defs, LinearGradient as SvgLinearGradient, Stop, Filter, FeGaussianBlur } from 'react-native-svg';
import ModernLoader from '../components/ModernLoader';

import { dewyName } from '../assets/images';
import { supabase } from '../config/supabase';
import { logger } from '../config/logger';

const { width, height } = Dimensions.get('window');

const THEME = {
  gradient: ['#FFC3B8', '#A8C5FF'],
  darkText: '#333333',
  lightText: '#666666',
  cardBackground: '#FFFFFF',
  cardBorder: '#F0F0F0',
  background: '#F0F2F5',
  green: '#A8C5FF', // Excellent
  blue: '#B5BFFC', // Good
  yellow: '#C3B6F9', // Average
  coral: '#E9AEEB', // Needs Improvement
  red: '#FF6F61', // Critical
  uvGreen: '#A1EFA7',
  uvYellow: '#FAD079',
  uvOrange: '#FFC87A',
  uvRed: '#FF9A8C',
  uvPurple: '#D9B8FF',
} as const;

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const GaugeChart = ({ size, strokeWidth, progress, color }: { size: number, strokeWidth: number, progress: number, color: string }) => {
    const radius = (size - strokeWidth) / 2;
    const cx = size / 2;
    const cy = size / 2;

    const polarToCartesian = (angle: number) => {
        const angleRad = (angle * Math.PI) / 180.0;
        const x = cx + radius * Math.cos(angleRad);
        const y = cy + radius * Math.sin(angleRad);
        return { x, y };
    };

    const startAngle = -175;
    const endAngle = -5;
    const angleRange = endAngle - startAngle;

    const backgroundStart = polarToCartesian(startAngle);
    const backgroundEnd = polarToCartesian(endAngle);

    const largeArcFlag = "0";

    const backgroundPath = `M ${backgroundStart.x} ${backgroundStart.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${backgroundEnd.x} ${backgroundEnd.y}`;

    const scoreAngle = startAngle + progress * angleRange;
    const scoreEnd = polarToCartesian(scoreAngle);
    const progressPath = `M ${backgroundStart.x} ${backgroundStart.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${scoreEnd.x} ${scoreEnd.y}`;
    
    return (
        <View style={{ width: size, height: size / 1.8, overflow: 'hidden' }}>
            <Svg width={size} height={size}>
                {/* Background circle */}
                <Path
                    d={backgroundPath}
                    stroke="rgba(0,0,0,0.07)"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                />
                {/* Progress circle */}
                <Path
                    d={progressPath}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                />
            </Svg>
        </View>
    );
};

const OverallSkinScoreCard = ({ score, daysSinceScan, loading }: { score: number | null, daysSinceScan: number | null, loading: boolean }) => {
    const getRating = (score: number | null) => {
        if (score === null) return { text: 'N/A', color: THEME.lightText };
        if (score > 80) return { text: 'Excellent', color: THEME.green };
        if (score > 60) return { text: 'Good', color: THEME.blue };
        if (score > 40) return { text: 'Average', color: THEME.yellow };
        if (score > 20) return { text: 'Needs Improvement', color: THEME.coral };
        return { text: 'Critical', color: THEME.red };
    };

    const rating = getRating(score);

    if (loading) {
        return (
            <BlurView intensity={100} tint="light" style={styles.skinScoreCard}>
                <ModernLoader />
            </BlurView>
        );
    }

    return (
        <BlurView intensity={100} tint="light" style={styles.skinScoreCard}>
            <View style={styles.skinScoreHeader}>
                <HeartHandshake color={'rgba(0,0,0,0.6)'} size={20} strokeWidth={2.5} />
                <Text style={styles.skinScoreTitle}>Overall Score</Text>
            </View>
            <Text style={styles.lastScanText}>
                {daysSinceScan !== null ? `Last scan: ${daysSinceScan} days ago` : ''}
            </Text>
            
            <View style={styles.donutContainer}>
                <GaugeChart size={130} strokeWidth={10} progress={(score || 0) / 100} color={rating.color} />
                <View style={styles.scoreTextContainer}>
                    <Text style={styles.scoreNumber}>{score !== null ? score : 'N/A'}</Text>
                    <Text style={styles.scoreTotal}>/100</Text>
                </View>
            </View>
            <Text style={[styles.ratingText, { color: rating.color }]}>{rating.text}</Text>
        </BlurView>
    );
};

const EnvironmentCard = ({ locationData, weatherData, loading }: { locationData: { city: string | null, latitude: number, longitude: number }, weatherData: { uvIndex: number | null, humidity: number | null, aqi: number | null }, loading: boolean }) => {
    const { city, latitude, longitude } = locationData;
    const { uvIndex, humidity, aqi } = weatherData;

    let displayLocation = city || 'Loading...';
    if (displayLocation.length >= 20) {
      displayLocation = `${displayLocation.substring(0, 17)}...`;
    }

    const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

    const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${longitude},${latitude},9,0/400x400?access_token=${MAPBOX_ACCESS_TOKEN}`;

    if (loading) {
        return (
            <View style={styles.environmentCard}>
                <ModernLoader />
            </View>
        );
    }

    const aqiData = getAqiData(aqi);
    const humidityData = getHumidityData(humidity);
    const uvData = getUvData(uvIndex);

    return (
        <View style={styles.environmentCard}>
            <ImageBackground
                source={{ uri: mapUrl }}
                style={[StyleSheet.absoluteFillObject, { top: 35 }]}
                imageStyle={{ opacity: 0.7 }}
            />
            <View style={styles.environmentCardContent}>
                <View style={[styles.skinScoreHeader, { transform: [{ translateY: -6 }] }]}>
                    <TentTree size={20} color={'rgba(0,0,0,0.6)'} strokeWidth={2.5} />
                    <Text style={[styles.skinScoreTitle, styles.textWithShadow, { color: 'rgba(0,0,0,0.7)' }]}>Environment</Text>
                    <Text style={[styles.locationText, styles.textWithShadow, { color: 'rgba(0,0,0,0.7)', marginLeft: 6 }]}>- {displayLocation}</Text>
                    <SendHorizontal size={14} color={'rgba(0,0,0,0.7)'} style={{ marginLeft: 5 }}/>
                </View>
                <View style={{flex: 1, justifyContent: 'center'}}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-around', gap: 8}}>
                        <MetricDisplay title="AQI" value={aqi !== null ? `${aqi}` : '-'} level={aqiData.level} levelColor={aqiData.color} recommendation={aqiData.recommendation} />
                        <MetricDisplay title="Humidity" value={humidity !== null ? `${Math.round(humidity * 100)}%` : '-'} level={humidityData.level} levelColor={humidityData.color} recommendation={humidityData.recommendation} />
                        <MetricDisplay title="UV Index" value={uvIndex !== null ? `${uvIndex}` : '-'} level={uvData.level} levelColor={uvData.color} recommendation={uvData.recommendation} />
                    </View>
                </View>
            </View>
        </View>
    );
};

const getUvData = (uvIndex: number | null) => {
    if (uvIndex === null) return { level: 'N/A', recommendation: 'Unavailable', color: THEME.lightText };
    if (uvIndex <= 2) {
        return { level: 'Low', recommendation: 'Sunscreen advised', color: THEME.green };
    }
    if (uvIndex <= 5) {
        return { level: 'Moderate', recommendation: 'Sunscreen needed', color: THEME.yellow };
    }
    if (uvIndex <= 7) {
        return { level: 'High', recommendation: 'Sunscreen vital', color: THEME.coral };
    }
    if (uvIndex <= 10) {
        return { level: 'Very High', recommendation: 'Extra sunscreen', color: THEME.red };
    }
    return { level: 'Extreme', recommendation: 'Stay inside', color: THEME.red };
};

const getAqiData = (aqi: number | null) => {
    if (aqi === null) return { level: 'N/A', recommendation: 'Unavailable', color: THEME.lightText };
    if (aqi <= 50) return { level: 'Good', recommendation: 'Enjoy outdoors!', color: THEME.green };
    if (aqi <= 100) return { level: 'Moderate', recommendation: 'Good for most', color: THEME.yellow };
    if (aqi <= 150) return { level: 'Unhealthy SG', recommendation: 'Limit exertion', color: THEME.coral };
    if (aqi <= 200) return { level: 'Unhealthy', recommendation: 'Reduce activity', color: THEME.red };
    if (aqi <= 300) return { level: 'Very Unhealthy', recommendation: 'Avoid activity', color: THEME.red };
    return { level: 'Hazardous', recommendation: 'Stay indoors', color: THEME.red };
};

const getHumidityData = (humidity: number | null) => {
    if (humidity === null) return { level: 'N/A', recommendation: 'Unavailable', color: THEME.lightText };
    const humidityPercent = humidity * 100;
    if (humidityPercent < 30) return { level: 'Low', recommendation: 'Moisturize skin', color: THEME.yellow };
    if (humidityPercent <= 60) return { level: 'Optimal', recommendation: 'Ideal humidity', color: THEME.green };
    return { level: 'High', recommendation: 'Risk of breakouts', color: THEME.coral };
};

const MetricDisplay = ({ title, value, level, levelColor, recommendation }: { title: string, value: string, level: string, levelColor: string, recommendation?: string }) => {
  const valueFontSize = (title === 'Humidity' && value.length >= 4) ? 28 : 36;
  
  const renderLevel = () => {
    if (level === 'Unhealthy SG') {
      return (
        <Text style={[styles.metricLevel, { color: levelColor, fontSize: 12 }]}>
          Unhealthy (SG)
        </Text>
      );
    }

    const levelStyle: any[] = [styles.metricLevel, { color: levelColor }];
    if (level === 'Very Unhealthy') {
      levelStyle.push({ fontSize: 12 });
    }
    
    return <Text style={levelStyle}>{level}</Text>;
  };
  
  return (
    <View style={styles.metricShadow}>
      <BlurView
        intensity={40}
        tint="light"
        style={[
          styles.metricContainer,
          { backgroundColor: 'rgba(255,255,255,0.15)' }
        ]}
      >
        <Text style={styles.metricTitle}>{title}</Text>
        <Text style={[styles.metricValue, { fontSize: valueFontSize }]}>{value}</Text>
        {renderLevel()}
        {recommendation && (
          <Text style={styles.metricRecommendation}>{recommendation}</Text>
        )}
      </BlurView>
    </View>
  );
};

const GradientFlame = ({ size }: { size: number }) => {
    const flamePath = "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z";
    const svgSize = size * 1.4;

    return (
        <View
            style={{
                shadowColor: THEME.gradient[0],
                shadowOpacity: 0.7,
                shadowRadius: 7,
                shadowOffset: { width: 0, height: 0 },
            }}
            collapsable={false}
        >
            <Svg width={svgSize} height={svgSize} viewBox="-3 -3 30 30">
                <Defs>
                    <SvgLinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor={THEME.gradient[0]} />
                        <Stop offset="1" stopColor={THEME.gradient[1]} />
                    </SvgLinearGradient>
                </Defs>
                <Path d={flamePath} fill="url(#grad)" />
            </Svg>
        </View>
    );
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const StreakModal = ({ visible, onClose, streakCount }: { visible: boolean; onClose: () => void; streakCount: number; }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [modalActuallyVisible, setModalActuallyVisible] = useState(visible);

  useEffect(() => {
    if (visible) {
      setModalActuallyVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setModalActuallyVisible(false);
      });
    }
  }, [visible, fadeAnim]);

  if (!modalActuallyVisible) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={modalActuallyVisible}
      onRequestClose={onClose}
    >
      <AnimatedPressable style={[styles.modalOverlay, { opacity: fadeAnim }]} onPress={onClose}>
        <Animated.View style={[
          styles.modalContent,
          {
            opacity: fadeAnim,
            transform: [{
              scale: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.95, 1],
              })
            }]
          }
        ]}>
          <View style={styles.streakDisplay}>
            <GradientFlame size={100} />
            <View style={styles.streakTextContainer}>
              <Text style={styles.streakModalCount}>{streakCount}</Text>
              <Text style={styles.streakModalDays}>days</Text>
            </View>
          </View>
          <Text style={styles.modalText}>
            Log your AM and PM routines to keep your streak alive!
          </Text>
        </Animated.View>
      </AnimatedPressable>
    </Modal>
  );
};

const UvIndexCard = () => {
    return (
        <BlurView intensity={100} tint="light" style={styles.actionCard} />
    );
};

const MorningRoutineCard = () => {
    const { user } = useAuth();
    const [isCompleted, setIsCompleted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [routineType, setRoutineType] = useState<'am' | 'pm'>('am');
    const [logId, setLogId] = useState<string | null>(null);

    useEffect(() => {
        const currentHour = new Date().getHours();
        const type = (currentHour >= 4 && currentHour < 16) ? 'am' : 'pm';
        setRoutineType(type);
    }, []);

    useEffect(() => {
        if (!user || !routineType) return;

        const fetchRoutineStatus = async () => {
            setIsLoading(true);
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase.from('routine_logs').select('id').eq('user_id', user.id).eq('routine_type', routineType).eq('log_date', today).single();

            if (error && error.code !== 'PGRST116') {
                logger.error('Error fetching routine status:', error);
            } else if (data) {
                setIsCompleted(true);
                setLogId(data.id);
            } else {
                setIsCompleted(false);
                setLogId(null);
            }
            setIsLoading(false);
        };
        fetchRoutineStatus();
    }, [user, routineType]);

    const handlePress = () => {
        if (!user) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        const newCompletedState = !isCompleted;
        setIsCompleted(newCompletedState);

        if (newCompletedState) {
            supabase.from('routine_logs').insert({ user_id: user.id, routine_type: routineType }).select('id').single().then(({ data, error }) => {
                if (error) {
                    logger.error('Error logging routine:', error);
                    setIsCompleted(false);
                } else if (data) {
                    setLogId(data.id);
                }
            });
        } else {
            if (logId) {
                supabase.from('routine_logs').delete().eq('id', logId).then(({ error }) => {
                    if (error) {
                        logger.error('Error deleting routine log:', error);
                        setIsCompleted(true);
                    } else {
                        setLogId(null);
                    }
                });
            }
        }
    };

    const incompleteColors: [string, string] = routineType === 'am' ? ['#FFC3B8', '#FFDDB8'] : ['#323334', '#5E5F61'];
    const completeColors: [string, string] = ['#A8C5FF', '#C3B6F9'];
    
    const cardTitle = routineType === 'am' ? 'Morning Routine' : 'Night Routine';
    const IncompleteIcon = routineType === 'am' ? Sun : Moon;

    if (isLoading) {
        return <View style={[styles.actionCard, { backgroundColor: '#E0E0E0' }]}><ModernLoader /></View>;
    }

    return (
        <TouchableOpacity onPress={handlePress} style={styles.actionCard} activeOpacity={0.8}>
            <LinearGradient colors={isCompleted ? completeColors : incompleteColors} style={StyleSheet.absoluteFill} />
            <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>{cardTitle}</Text>
                <View>
                    {isCompleted ? (
                        <Check size={80} color="white" strokeWidth={2.5} />
                    ) : (
                        <IncompleteIcon size={80} color="white" strokeWidth={2} />
                    )}
                </View>
                <Text style={[styles.actionSubtitle, { opacity: isCompleted ? 0 : 1 }]}>
                    Tap to log
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const skinLogOptions = [
  { icon: Laugh, text: 'Excellent', color: 'rgba(168, 197, 255, 0.4)' },
  { icon: Smile, text: 'Good',      color: 'rgba(181, 191, 252, 0.4)' },
  { icon: Meh, text: 'Normal',    color: 'rgba(195, 182, 249, 0.4)' },
  { icon: Frown, text: 'Irritated', color: 'rgba(233, 174, 235, 0.4)' },
  { icon: Angry, text: 'Severe',    color: 'rgba(255, 111, 97, 0.4)' },
];

const FeelingOptionButton = ({ option, isSelected, onPress }: { option: { icon: React.ElementType; text: string; color: string; }, isSelected: boolean, onPress: () => void }) => {
  const Icon = option.icon;
  return (
    <Pressable onPress={onPress}>
      <View style={[
        styles.optionButton,
        { backgroundColor: option.color },
        isSelected && styles.selectedOption,
      ]}>
        <View style={styles.optionContent}>
            <Icon style={styles.optionIcon} color={isSelected ? '#000' : 'rgba(0,0,0,0.7)'} size={18} />
            <Text style={[styles.optionText, isSelected && styles.selectedOptionText]}>{option.text}</Text>
        </View>
      </View>
    </Pressable>
  );
};

const SkinDailyLog = ({ selected, setSelected }: { selected: string | null, setSelected: React.Dispatch<React.SetStateAction<string | null>>}) => {
  const [isCardVisible, setIsCardVisible] = useState(true);

  useEffect(() => {
    // When a selection is made, start a timer to hide the card
    if (selected) {
      const timer = setTimeout(() => {
        // Configure the animation for the next layout change
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        // Trigger the layout change by updating state, which will unmount the component
        setIsCardVisible(false);
      }, 3000);

      // Clean up the timer if the selection is cleared or component unmounts
      return () => clearTimeout(timer);
    } else {
      // If selection is cleared, make the card visible again.
      setIsCardVisible(true);
    }
  }, [selected]);

  const handlePress = (optionText: string) => {
    setSelected(optionText);
  };

  const renderOption = (option: { icon: React.ElementType; text: string; color: string; }, index: number) => {
    const isSelected = selected === option.text;
    
    return (
      <FeelingOptionButton 
        key={option.text}
        option={option}
        isSelected={isSelected}
        onPress={() => handlePress(option.text)}
      />
    );
  };

  const selectedItem = skinLogOptions.find(opt => opt.text === selected);

  if (!isCardVisible) {
    return null;
  }

  return (
    <BlurView intensity={100} tint="light" style={styles.dailyLogCard}>
      <View style={[styles.mainRow, selected && styles.mainRowSelected]}>
        <CalendarPlus2 color={selected ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.6)'} size={selected ? 28 : 20} strokeWidth={2.5}/>
        
        {!selected ? (
          <Text style={styles.dailyLogTitle}>Daily Skin Log</Text>
        ) : selectedItem ? (
          <View style={{ transform: [{ scale: 1.2 }] }}>
            <FeelingOptionButton 
              option={selectedItem}
              isSelected={true}
              onPress={() => {}}
            />
          </View>
        ) : null}

        <Pressable onPress={() => setSelected(null)} style={[styles.editButton, !selected && { display: 'none' }]}>
          <SquarePen color={'rgba(0,0,0,0.7)'} size={22}/>
        </Pressable>
      </View>

      {!selected && (
        <>
          <Text style={styles.dailyLogQuestion}>How does your skin feel today?</Text>
          <View style={styles.optionsContainer}>
            <View style={styles.optionsRow}>
              {skinLogOptions.slice(0, 3).map(renderOption)}
            </View>
            <View style={styles.optionsRow}>
              {skinLogOptions.slice(3, 5).map(renderOption)}
            </View>
          </View>
        </>
      )}
    </BlurView>
  );
};

const BackgroundBlobs = () => (
  <View style={StyleSheet.absoluteFill}>
    <View style={styles.blob1} />
    <View style={styles.blob2} />
  </View>
);

const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [isStreakModalVisible, setStreakModalVisible] = useState(false);
  const streakAnim = useRef(new Animated.Value(1)).current;
  const streakCount = 7;
  const [score, setScore] = useState<number | null>(null);
  const [daysSinceScan, setDaysSinceScan] = useState<number | null>(null);
  const [loadingScore, setLoadingScore] = useState(true);
  const [locationData, setLocationData] = useState<{ city: string | null, latitude: number, longitude: number }>({ city: null, latitude: 34.0522, longitude: -118.2437 });
  const [weatherData, setWeatherData] = useState<{ uvIndex: number | null, humidity: number | null, aqi: number | null }>({ uvIndex: null, humidity: null, aqi: null });
  const [loadingWeather, setLoadingWeather] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const isInitialMount = useRef(true);

  useEffect(() => {
    const fetchWeatherData = async () => {
      if (user?.id === 'mock-user-id') {
        setLocationData({ city: 'San Francisco', latitude: 37.7749, longitude: -122.4194 });
        setWeatherData({ uvIndex: 5, humidity: 0.6, aqi: 45 });
        setLoadingWeather(false);
        return;
      }
      setLoadingWeather(true);

      try {
        const cachedData = await AsyncStorage.getItem('weatherData');
        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData);
          const isStale = (new Date().getTime() - timestamp) > 12 * 60 * 60 * 1000; // 12 hours
          if (!isStale) {
            setWeatherData(data);
            setLoadingWeather(false);
            return;
          }
        }

        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          logger.error('Permission to access location was denied');
          setLoadingWeather(false);
          return;
        }

        let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = location.coords;

        let city = null;
        try {
          const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (reverseGeocode.length > 0) {
            city = reverseGeocode[0].city;
          }
        } catch (e) {
          logger.error('Reverse geocoding failed', e);
        }

        setLocationData({ city, latitude, longitude });

        const { data, error } = await supabase.functions.invoke('get-weather-data', {
          body: { latitude, longitude },
        });

        if (error) throw error;

        setWeatherData(data);
        await AsyncStorage.setItem('weatherData', JSON.stringify({ data, timestamp: new Date().getTime() }));
      } catch (error) {
        logger.error('Error fetching weather data:', error);
      } finally {
        setLoadingWeather(false);
      }
    };

    fetchWeatherData();
  }, []);

  useEffect(() => {
    const fetchScore = async (retryCount = 0) => {
      if (!user) {
        setLoadingScore(false);
        return;
      }
      if (user.id === 'mock-user-id') {
        setScore(88);
        setDaysSinceScan(2);
        setLoadingScore(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('analysis_data')
          .select('overall_score')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (error) {
          if (error.code === 'PGRST116' && retryCount < 1) {
            logger.log('Score not found, retrying in 2s...');
            setTimeout(() => {
              fetchScore(retryCount + 1);
            }, 2000);
            return;
          }
          throw error;
        }

        if (data) {
          setScore(data.overall_score);
          setDaysSinceScan(null);
        }
      } catch (error) {
        logger.error('Error fetching overall score:', error);
      } finally {
        setLoadingScore(false);
      }
    };

    fetchScore();
  }, [user]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [selected]);

  
  const handlePressIn = () => {
    Animated.timing(streakAnim, {
      toValue: 0.9,
      duration: 80,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(streakAnim, {
      toValue: 1,
      friction: 3,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  const toggleStreakModal = () => {
    setStreakModalVisible(currentValue => {
      const newValue = !currentValue;
      // If we are closing the modal, ensure the button animation resets.
      if (newValue === false) {
        streakAnim.stopAnimation();
        Animated.spring(streakAnim, { toValue: 1, friction: 3, tension: 60, useNativeDriver: true }).start();
      }
      return newValue;
    });
  };

  const getDaysSinceScanColor = () => {
    if (daysSinceScan === null) return THEME.lightText;
    if (daysSinceScan <= 3) return THEME.green;
    if (daysSinceScan <= 7) return THEME.yellow;
    return THEME.red;
  };


  return (
    <Animated.View style={{ flex: 1, backgroundColor: THEME.background, paddingTop: insets.top, opacity: fadeAnim }}>
      <BackgroundBlobs />
      <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFill} />
      <StatusBar style="dark" />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Home</Text>
            <Pressable 
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              onPress={toggleStreakModal}
            >
              <Animated.View style={{ transform: [{ scale: streakAnim }] }}>
                <BlurView intensity={100} tint="light" style={styles.profilePill}>
                  <View style={{ transform: [{ translateX: -3 }] }}>
                    <View style={styles.streakContainer}>
                        <GradientFlame size={23} />
                        <Text style={styles.streakText}>{streakCount}</Text>
                    </View>
                  </View>
                </BlurView>
              </Animated.View>
            </Pressable>
          </View>
          
          <SkinDailyLog selected={selected} setSelected={setSelected} />
          
          <View style={styles.cardsRow}>
            <OverallSkinScoreCard score={score} daysSinceScan={daysSinceScan} loading={loadingScore} />
            <MorningRoutineCard />
          </View>
          
          <EnvironmentCard locationData={locationData} weatherData={weatherData} loading={loadingWeather} />
          
          <View>
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>
          
          <View style={styles.bottomPadding} />
        </ScrollView>
        <StreakModal visible={isStreakModalVisible} onClose={toggleStreakModal} streakCount={streakCount} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 40,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: THEME.darkText,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.darkText,
    marginBottom: 12,
    marginTop: 12,
  },
  dailyLogCard: {
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  mainRowSelected: {
    justifyContent: 'space-between',
    marginBottom: 0,
    flex: 1,
  },
  dailyLogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'rgba(0,0,0,0.6)',
    marginLeft: 8,
  },
  dailyLogQuestion: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(0,0,0,0.7)',
    marginBottom: 24,
    textAlign: 'center',
  },
  optionsContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  optionButton: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  selectedOption: {
    borderColor: 'transparent',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  optionIcon: {
    marginRight: 8,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(0,0,0,0.7)',
  },
  selectedOptionText: {
    color: '#000',
  },
  bottomPadding: {
    height: 20,
  },
  blob1: {
    position: 'absolute',
    width: width,
    height: width,
    borderRadius: width * 0.45,
    top: height * 0.2,
    right: -width * 0.1,
    backgroundColor: 'rgba(186, 190, 255, 0.3)',
  },
  blob2: {
    position: 'absolute',
    width: width * 0.95,
    height: width * 0.95,
    borderRadius: width * 0.475,
    bottom: height * 0.15,
    left: -width * 0.15,
    backgroundColor: 'rgba(255, 168, 168, 0.15)',
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardsRow: {
    flexDirection: 'row',
    marginHorizontal: -6,
  },
  skinScoreCard: {
    flex: 4,
    borderRadius: 24,
    padding: 16,
    marginHorizontal: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    height: 190,
    justifyContent: 'space-between',
  },
  actionCard: {
    flex: 4,
    borderRadius: 24,
    marginHorizontal: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 16,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 190,
  },
  skinScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
  },
  skinScoreTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: 'rgba(0, 0, 0, 0.7)',
      marginLeft: 8,
  },
  lastScanText: {
      fontSize: 12,
      fontWeight: '500',
      color: 'rgba(0,0,0,0.5)',
      alignSelf: 'flex-start',
      marginTop: 4,
  },
  donutContainer: {
      marginVertical: 8,
      justifyContent: 'center',
      alignItems: 'center',
  },
  scoreTextContainer: {
      position: 'absolute',
      flexDirection: 'row',
      alignItems: 'baseline',
      bottom: 8,
  },
  scoreNumber: {
      fontSize: 32,
      fontWeight: 'bold',
      color: THEME.darkText,
  },
  scoreTotal: {
      fontSize: 16,
      fontWeight: 'bold',
      color: THEME.lightText,
      marginLeft: 1,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 0,
  },
  actionCardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(0,0,0,0.5)',
  },
  actionContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: 'transparent',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
    uvLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.lightText,
  },
  uvLocationText: {
    fontSize: 14,
    color: THEME.lightText,
  },
  textWithShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  uvContent: {
    alignItems: 'center',
  },
  uvIndexValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: THEME.darkText,
  },
  uvIndexLevel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  uvRecommendation: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME.lightText,
  },
  profilePill: {
    width: 75,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },

  streakText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'rgba(0,0,0,0.7)',
  },
  environmentCard: {
    borderRadius: 24,
    marginTop: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    overflow: 'hidden',
    height: 210,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  mapBackground: {
    flex: 1,
  },
  environmentCardContent: {
    padding: 16,
    flex: 1,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  modalText: {
    color: 'white',
    textAlign: 'center',
    marginTop: -5,
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 28,
  },
  streakDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  streakTextContainer: {
    alignItems: 'center',
    transform: [{ translateX: -20 }], // Overlap the flame slightly for a compact look
  },
  streakModalCount: {
    fontSize: 80,
    fontWeight: 'bold',
    color: 'white',
    lineHeight: 80,
  },
  streakModalDays: {
    fontSize: 24,
    color: 'white',
    fontWeight: '500',
    marginTop: -15, // Pull 'days' text up closer to the number
  },
  metricShadow: {
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderRadius: 18,
  },
  metricContainer: {
    alignItems: 'center',
    paddingHorizontal: 2,
    borderRadius: 18,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(0,0,0,0.7)',
  },
  metricValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'rgba(0,0,0,0.9)',
  },
  metricLevel: {
    fontSize: 14,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.08)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  metricRecommendation: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(0,0,0,0.7)',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 2,
    height: 32, // approx 2 lines
    textAlignVertical: 'center',
  },
});

export default HomeScreen;
