import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Dimensions, Pressable, ScrollView, ActivityIndicator, Animated, Easing, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import ProductCard, { Product } from '../components/routine/ProductCard';
import ProductDetailModal from '../components/routine/ProductDetailModal';
import { streak } from '../assets/images';
import { logger } from '../config/logger';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { Plus } from 'lucide-react-native';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import ModernLoader from '../components/ModernLoader';

const { width, height } = Dimensions.get('window');

const THEME = {
  darkText: '#333333',
  background: '#F0F2F5',
  gradient: ['#FFC3B8', '#A8C5FF'],
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

const BackgroundBlobs = () => (
  <View style={StyleSheet.absoluteFill}>
    <View style={styles.blob1} />
    <View style={styles.blob2} />
  </View>
);

const RoutineScreen = () => {
  const { user, logout } = useAuth();
  const [routine, setRoutine] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isStreakModalVisible, setStreakModalVisible] = useState(false);
  const streakAnim = useRef(new Animated.Value(1)).current;
  const streakCount = 7;

  const handleStreakPressIn = () => {
    Animated.timing(streakAnim, {
      toValue: 0.9,
      duration: 80,
      useNativeDriver: true,
    }).start();
  };

  const handleStreakPressOut = () => {
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
      if (newValue === false) {
        streakAnim.stopAnimation();
        Animated.spring(streakAnim, { toValue: 1, friction: 3, tension: 60, useNativeDriver: true }).start();
      }
      return newValue;
    });
  };

  const productOrder: { [key: string]: number } = {
    'cleanser': 1,
    'toner': 2,
    'toner pad': 2,
    'serum': 3,
    'moisturizer': 4,
    'sunscreen': 5,
  };

  const fetchRoutine = useCallback(async () => {
    if (!user) {
      // Don't set an error, just wait for the user object to be available
      return;
    }

    if (user.id === 'mock-user-id') {
      const fakeProducts = [
        { id: '1', product_name: 'Radiant Glow Cleanser', brand: 'Skinsight', product_type: 'Cleanser', image_url: 'https://example.com/cleanser.jpg' },
        { id: '2', product_name: 'Youthful Boost Serum', brand: 'Skinsight', product_type: 'Serum', image_url: 'https://example.com/serum.jpg' },
        { id: '3', product_name: 'Hydro-Plump Moisturizer', brand: 'Skinsight', product_type: 'Moisturizer', image_url: 'https://example.com/moisturizer.jpg' },
        { id: '4', product_name: 'SunShield SPF 50', brand: 'Skinsight', product_type: 'Sunscreen', image_url: 'https://example.com/sunscreen.jpg' },
      ];
      // @ts-ignore
      setRoutine(fakeProducts);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null); // Clear previous errors
      const { data: analysisData, error: analysisError } = await supabase
        .from('analysis_data')
        .select('routine_ids_array')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (analysisError) {
        throw new Error(analysisError.message);
      }

      // If no routine is found, don't treat it as an error.
      // The UI will handle the empty state.
      if (!analysisData || !analysisData.routine_ids_array || analysisData.routine_ids_array.length === 0) {
        setRoutine([]);
        setLoading(false);
        return;
      }

      const productIds = analysisData.routine_ids_array;

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds);

      if (productsError) {
        throw new Error(productsError.message);
      }
      
      const sortedProducts = productsData.sort((a, b) => {
        const orderA = a.product_type ? productOrder[a.product_type.toLowerCase()] || 99 : 99;
        const orderB = b.product_type ? productOrder[b.product_type.toLowerCase()] || 99 : 99;
        return orderA - orderB;
      });

      setRoutine(sortedProducts);
    } catch (err: any) {
      logger.error("Failed to fetch routine:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // We only want to fetch the routine when the user object becomes available.
    if (user) {
      fetchRoutine();
    }
  }, [user, fetchRoutine]);

  const handleProductPress = (product: Product) => {
    setSelectedProduct(product);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedProduct(null);
  };

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };
  
  const animatedStyle = {
    transform: [{ scale: scaleAnim }],
  };

  const renderContent = () => {
    if (error) {
      return <Text style={styles.errorText}>{error}</Text>;
    }

    const AddCard = (
      <Animated.View style={[styles.addCardWrapper, animatedStyle]}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => {}}
        >
          <View style={styles.addCard}>
            <BlurView
              intensity={70}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
            
            <MaskedView
              style={StyleSheet.absoluteFill}
              maskElement={
                <View style={styles.borderMask} />
              }
            >
              <LinearGradient
                colors={['rgba(255,168,168,0.7)', 'rgba(168,197,255,0.7)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1 }}
              />
            </MaskedView>
            
            <View style={styles.iconContainer}>
              <MaskedView
                style={{ width: 32, height: 32 }}
                maskElement={<Plus size={32} color="black" strokeWidth={3} />}
              >
                <LinearGradient
                  colors={['#FFA8A8', '#A8C5FF']}
                  style={{ flex: 1 }}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              </MaskedView>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.productsContainer}
      >
        {AddCard}
        {loading ? (
          <ModernLoader />
        ) : routine.length > 0 ? (
          routine.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={handleProductPress}
              index={index}
              initialAnim={true}
            />
          ))
        ) : (
          !loading && <Text style={styles.infoText}>No routine found.</Text>
        )}
      </ScrollView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: THEME.background }}>
      <BackgroundBlobs />
      <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Your Routine</Text>
            <Pressable
              onPressIn={handleStreakPressIn}
              onPressOut={handleStreakPressOut}
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
          {renderContent()}
        </View>
      </SafeAreaView>
      <ProductDetailModal
        visible={isModalVisible}
        onClose={handleCloseModal}
        product={selectedProduct}
      />
      <StreakModal visible={isStreakModalVisible} onClose={toggleStreakModal} streakCount={streakCount} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  header: {
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: THEME.darkText,
  },
  logoutButton: {
    fontSize: 16,
    color: '#E53935',
    fontWeight: '600',
  },
  productsContainer: {
    paddingTop: 10,
    alignItems: 'center',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: 'red',
  },
  infoText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: THEME.darkText,
  },
  addCardWrapper: {
    shadowColor: "rgba(168, 197, 255, 0.5)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 16,
    width: width - 48,
    height: 60,
  },
  addCard: {
    height: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  borderMask: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'black',
  },
  iconContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blob1: {
    position: 'absolute',
    width: width,
    height: width,
    borderRadius: width * 0.45,
    top: height * 0.2,
    right: -width * 0.1,
    backgroundColor: 'rgba(186, 190, 255, 0.2)',
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
    transform: [{ translateX: -20 }],
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
    marginTop: -15,
  },
});

export default RoutineScreen;
