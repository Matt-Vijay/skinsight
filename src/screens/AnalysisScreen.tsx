import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  Pressable, 
  ScrollView, 
  Dimensions, 
  Animated,
  Platform,
  StatusBar as ReactNativeStatusBar,
  Easing,
  InteractionManager,
  ViewStyle,
  Alert,
  Modal,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Image,
} from 'react-native';
import { FasterImageView } from '@candlefinance/faster-image';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Shield, Droplet, ChevronsUpDown, ChevronsDownUp, ChevronsRightLeft, ChevronsLeftRight, MousePointerClick, FlaskConical, CalendarDays, ArrowRight, Info, ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';
import MaskedView from '@react-native-masked-view/masked-view';
import * as Haptics from 'expo-haptics';
import { supabase, saveAnonymousAnalysis } from '../config/supabase';
import { logger } from '../config/logger';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProductCard, { Product } from '../components/routine/ProductCard';
import ProductDetailModal from '../components/routine/ProductDetailModal';

const imageUrlCache = new Map<number, string>();

const getProductImageUrl = (productId: number): string | null => {
  if (imageUrlCache.has(productId)) {
    return imageUrlCache.get(productId)!;
  }
  const imagePath = `${productId}.jpg`;
  const { data } = supabase.storage.from('product-images').getPublicUrl(imagePath);
  
  if (data?.publicUrl) {
    imageUrlCache.set(productId, data.publicUrl);
    return data.publicUrl;
  }
  return null;
};

const { width, height } = Dimensions.get('window');
const BACK_BUTTON_WIDTH = 40;
const BACK_BUTTON_MARGIN = 12;
const cardPadding = 20;

interface AnalysisMetrics {
  hydration: number;
  barrier: number;
  hydrationSummary: string;
  barrierSummary: string;
}

interface RoutineProduct extends Product {
  product_id: number;
  reasoning: string;
}

interface RoutineData {
  routine_title: string;
  routine_summary: string;
  products: RoutineProduct[];
}

interface ProductDetails {
  id: number;
  title: string;
  brand: string;
  product_type: string;
  price_usd: number;
}

interface AnalysisBlueprint {
  motif: string;
  approach: {
    title: string;
    summary: string;
  };
  habit: {
    title: string;
    summary: string;
    study: string;
  };
  ingredient: {
    title: string;
    summary: string;
    study: string;
  };
}

const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalView: {
    margin: 20,
    width: width * 0.9,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  productImage: {
    width: 150,
    height: 150,
    borderRadius: 15,
    marginBottom: 15,
    backgroundColor: '#FFFFFF',
  },
  imagePlaceholder: {
    width: 150,
    height: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 20,
  },
  brandText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  typeText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  summaryText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 20,
    width: '100%',
    justifyContent: 'center',
  },
  priceText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  infoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  infoText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  backButton: {
    backgroundColor: '#333',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 50,
    elevation: 2,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
  skeletonText: {
    backgroundColor: '#EAEAEA',
    borderRadius: 4,
  },
});

type PrimaryState = 'Excellent' | 'Good' | 'Fair' | 'Needs Work';

interface AnalysisResponse {
  analysis: {
    overallScore: number;
    primaryState: PrimaryState;
    overallSummary: string;
    metrics: AnalysisMetrics;
    blueprint: AnalysisBlueprint;
  };
  routine: RoutineData;
}

interface SkinAnalysisData {
  primaryState: PrimaryState;
  overallScore: number;
  metrics: AnalysisMetrics;
  overallSummary: string;
  routine?: RoutineData;
  blueprint?: AnalysisBlueprint;
}

type ProcessedAnalysisData = (SkinAnalysisData | AnalysisResponse) & { blueprint?: AnalysisBlueprint };

const analysisPages = [
  { title: 'Your Key Skin Metrics', subtitle: '' },
  { title: 'Your Routine Blueprint.', subtitle: '' },
  { title: 'Recommended Routine.', subtitle: '' },
];

const useChevronAnimation = (isExpanded: boolean) => {
  const [chevronAnim] = useState(new Animated.Value(isExpanded ? 1 : 0));

  useEffect(() => {
    Animated.timing(chevronAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isExpanded, chevronAnim]);

  const downUpOpacity = chevronAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const upDownOpacity = chevronAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return { downUpOpacity, upDownOpacity };
};

const WordAnimatedText = React.memo(({
  text,
  start,
  textStyle,
  containerStyle,
  staggerMs = 35,
  durationMs = 200,
  fadeOutDurationMs = 0,
}: { 
  text: string; 
  start: boolean; 
  textStyle?: any; 
  containerStyle?: any;
  staggerMs?: number;
  durationMs?: number;
  fadeOutDurationMs?: number;
}) => {
  // Use a regex to split into words and keep trailing spaces
  const words = useMemo(() => (text || '').match(/\S+\s*/g) || [], [text]);
  const wordAnims = useMemo(() => words.map(() => new Animated.Value(0)), [words]);
  const animation = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (animation.current) {
      animation.current.stop();
    }
    if (start) {
      wordAnims.forEach(anim => anim.setValue(0));
      animation.current = Animated.stagger(
        staggerMs,
        wordAnims.map(anim =>
          Animated.timing(anim, {
            toValue: 1,
            duration: durationMs,
            useNativeDriver: true,
          })
        )
      );
      animation.current.start();
    } else {
      // Only run fade-out if a duration is specified
      if (fadeOutDurationMs > 0) {
        animation.current = Animated.parallel(
          wordAnims.map(anim =>
            Animated.timing(anim, {
              toValue: 0,
              duration: fadeOutDurationMs,
              useNativeDriver: true,
            })
          )
        );
        animation.current.start();
      } else {
        // Otherwise, just hide them instantly
        wordAnims.forEach(anim => anim.setValue(0));
      }
    }
  }, [start, staggerMs, durationMs, wordAnims, fadeOutDurationMs]);

  return (
    <View style={[styles.titleContainer, containerStyle]}>
      {words.map((word, wordIndex) => (
        <Animated.Text key={`${word}-${wordIndex}`} style={[styles.titleTextStyle, textStyle, { opacity: wordAnims[wordIndex] }]}>
          {word}
        </Animated.Text>
      ))}
    </View>
  );
});

const polarToCartesian = (cx: number, cy: number, radius: number, angle: number) => {
  const angleRad = (angle * Math.PI) / 180.0;
  const x = cx + radius * Math.cos(angleRad);
  const y = cy + radius * Math.sin(angleRad);
  return { x, y };
};

const containerWidthForGauge = width - (cardPadding * 2);
const gaugeSize = containerWidthForGauge * 0.75;
const strokeWidthForGauge = 12;
const radiusForGauge = (gaugeSize - strokeWidthForGauge) / 2;
const cxForGauge = gaugeSize / 2;
const cyForGauge = gaugeSize / 2;
const startAngleForGauge = -170;
const endAngleForGauge = -10;
const angleRangeForGauge = endAngleForGauge - startAngleForGauge;

const backgroundStartPoint = polarToCartesian(cxForGauge, cyForGauge, radiusForGauge, startAngleForGauge);
const backgroundEndPoint = polarToCartesian(cxForGauge, cyForGauge, radiusForGauge, endAngleForGauge);
const backgroundPathForGauge = `M ${backgroundStartPoint.x} ${backgroundStartPoint.y} A ${radiusForGauge} ${radiusForGauge} 0 0 1 ${backgroundEndPoint.x} ${backgroundEndPoint.y}`;

const progressPaths = Array.from({ length: 101 }, (_, i) => {
  if (i === 0) return '';
  const scoreAngle = startAngleForGauge + (i / 100) * angleRangeForGauge;
  const scoreEnd = polarToCartesian(cxForGauge, cyForGauge, radiusForGauge, scoreAngle);
  return `M ${backgroundStartPoint.x} ${backgroundStartPoint.y} A ${radiusForGauge} ${radiusForGauge} 0 0 1 ${scoreEnd.x} ${scoreEnd.y}`;
});

const OverallScoreCard = React.memo(({ analysisData, onCardPress }: { analysisData: SkinAnalysisData, onCardPress?: () => void }) => {
  const { overallScore, primaryState: state, overallSummary } = analysisData;
  const score = Math.round(overallScore);
  const [isScoreExpanded, setIsScoreExpanded] = useState(false);
  const [canShowText, setCanShowText] = useState(false);
  const scoreCardAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const FADE_OUT_DURATION = 150;
  const EXPAND_DURATION = 250;
  
  const { downUpOpacity, upDownOpacity } = useChevronAnimation(isScoreExpanded);

  const handleToggle = useCallback(() => {
    onCardPress?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const expanding = !isScoreExpanded;
    setIsScoreExpanded(expanding);
    setCanShowText(false);

    animationRef.current?.stop();
    animationRef.current = Animated.timing(scoreCardAnim, {
      toValue: expanding ? 1 : 0,
      duration: EXPAND_DURATION,
      easing: Easing.bezier(0.42, 0, 0.58, 1),
      useNativeDriver: false,
    });

    animationRef.current.start(() => {
      if (expanding) setCanShowText(true);
    });
  }, [isScoreExpanded, scoreCardAnim, onCardPress]);

  const animatedHeight = scoreCardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 500],
  });

  const animatedStyle: Animated.WithAnimatedObject<any> = {
    maxHeight: animatedHeight,
    opacity: scoreCardAnim,
    overflow: 'hidden',
  };

  const containerWidth = width - (cardPadding * 2);
  const gaugeSize = containerWidth * 0.75;
  const strokeWidth = 12;

  const progressPath = progressPaths[score];

  return (
    <Pressable onPress={handleToggle} style={styles.overallScoreGlassContainer}>
      <BlurView
        intensity={100}
        tint="light"
        style={styles.overallScoreBlurContainer}
      >
        <View style={styles.scoreHeader}>
          <Text style={styles.scoreTitle}>OVERALL SCORE</Text>
          <View style={styles.chevronContainer}>
            <Animated.View style={[{ opacity: upDownOpacity }, styles.chevron]}>
              <ChevronsUpDown size={20} color="#666666" />
            </Animated.View>
            <Animated.View style={[styles.chevron, { opacity: downUpOpacity }]}>
              <ChevronsDownUp size={20} color="#666666" />
            </Animated.View>
          </View>
        </View>
        <View style={styles.gaugeContainer}>
          <Svg width={gaugeSize} height={gaugeSize / 2} style={styles.svg}>
            <Path d={backgroundPathForGauge} stroke="#e9e9e9" strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
            {score > 0 && <Path d={progressPath} stroke="#333" strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />}
          </Svg>
          <View style={styles.scoreTextContainer}>
            <Text style={styles.scoreValue}>{score}</Text>
            <Text style={styles.scoreState}>{state}</Text>
          </View>
        </View>
        <Animated.View style={animatedStyle}>
          <View>
            <View style={styles.separator} />
            <View style={styles.expandedContent}>
              <WordAnimatedText 
                text={overallSummary}
                start={canShowText}
                textStyle={styles.expandedText}
                containerStyle={{ paddingHorizontal: 0, marginBottom: 0, justifyContent: 'center' }}
                staggerMs={20}
                durationMs={150}
                fadeOutDurationMs={FADE_OUT_DURATION}
              />
            </View>
          </View>
        </Animated.View>
      </BlurView>
    </Pressable>
  );
}, (prevProps, nextProps) => 
  prevProps.analysisData.overallScore === nextProps.analysisData.overallScore &&
  prevProps.analysisData.primaryState === nextProps.analysisData.primaryState &&
  prevProps.analysisData.overallSummary === nextProps.analysisData.overallSummary
);

const NotificationCard = ({ icon: Icon, title, text, iconColor = '#333333', isExpanded, onToggle }: { icon: React.ElementType, title: string, text: string, iconColor?: string, isExpanded: boolean, onToggle: () => void }) => {
  const anim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: isExpanded ? 1 : 0,
      duration: 250,
      easing: Easing.bezier(0.645, 0.045, 0.355, 1),
      useNativeDriver: false,
    }).start();
  }, [isExpanded]);

  const { downUpOpacity, upDownOpacity } = useChevronAnimation(isExpanded);

  const animatedContentStyle: Animated.WithAnimatedObject<ViewStyle> = {
    maxHeight: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 500] }),
    opacity: anim,
    overflow: 'hidden',
  };

  return (
    <View style={styles.notificationCardWrapper}>
      <BlurView
        intensity={100}
        tint="light"
        style={styles.notificationCardBlurContainer}
      >
        <Pressable onPress={onToggle}>
          <View style={styles.notificationHeader}>
            <View style={styles.notificationIconContainer}>
              <Icon size={24} color={iconColor} strokeWidth={1.5} />
            </View>
            <View style={styles.notificationTextContainer}>
              <Text style={styles.notificationTitle}>{title}</Text>
            </View>
            <View style={styles.chevronContainer}>
              <Animated.View style={[{ opacity: upDownOpacity }, styles.chevron]}>
                <ChevronsUpDown size={20} color="#666666" />
              </Animated.View>
              <Animated.View style={[styles.chevron, { opacity: downUpOpacity }]}>
                <ChevronsDownUp size={20} color="#666666" />
              </Animated.View>
            </View>
          </View>
          <Animated.View style={animatedContentStyle}>
            <Text style={styles.notificationText}>{text}</Text>
          </Animated.View>
        </Pressable>
      </BlurView>
    </View>
  );
};

const InfoCard = React.memo(({ title, value, IconComponent, isExpanded, onToggle, animation, summary }: { title: string; value: number; IconComponent: React.ElementType; isExpanded: boolean; onToggle: () => void; animation: Animated.Value; summary: string }) => {
  const { downUpOpacity, upDownOpacity } = useChevronAnimation(isExpanded);
  const iconColor = '#333';
  const valueTranslateY = title === 'Hydration' ? 30 : 0;
  const [startTyping, setStartTyping] = useState(false);
  const typingStarted = useRef(false);

  useEffect(() => {
    let listenerId: string;
    if (isExpanded) {
      typingStarted.current = false;
      listenerId = animation.addListener(({ value }) => {
        if (value >= 0.95 && !typingStarted.current) {
          typingStarted.current = true;
          InteractionManager.runAfterInteractions(() => {
            setStartTyping(true);
          });
        }
      });
    } else {
      setStartTyping(false);
    }

    return () => {
      if (listenerId) {
        animation.removeListener(listenerId);
      }
    };
  }, [isExpanded, animation]);

  const handleToggle = useCallback(() => {
    requestAnimationFrame(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    onToggle();
  }, [onToggle]);

  const cardInitialWidth = (width / 2) - 30;
  const cardFinalWidth = width - 40;
  const animatedWidth = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [cardInitialWidth, cardFinalWidth],
  });

  const contentOpacity = animation.interpolate({
    inputRange: [0.5, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const contentContainerWidth = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, cardFinalWidth - cardInitialWidth],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.infoCardWrapper, { width: animatedWidth }]}>
      <BlurView
        intensity={100}
        tint="light"
        style={styles.infoCardBlurContainer}
      >
        <Pressable
          onPress={handleToggle}
          style={{ flex: 1 }}
        >
          <View style={styles.infoCardHeader}>
            <Text style={styles.infoCardTitle}>{title}</Text>
            <View style={styles.chevronContainer}>
              <Animated.View style={[{ opacity: upDownOpacity }, styles.chevron]}>
                <ChevronsLeftRight size={20} color="#666666" />
              </Animated.View>
              <Animated.View style={[styles.chevron, { opacity: downUpOpacity }]}>
                <ChevronsRightLeft size={20} color="#666666" />
              </Animated.View>
            </View>
          </View>
          <View style={styles.infoCardBody}>
            <View style={styles.iconContainer}>
              <MaskedView
                style={styles.maskedViewStyle}
                maskElement={
                  <View style={styles.maskElementContainer}>
                    <IconComponent size={110} color="black" />
                  </View>
                }
              >
                <View style={styles.iconBackground} />
                <Animated.View style={[styles.iconFill, { height: `${value}%`, backgroundColor: iconColor }]} />
              </MaskedView>
              <View style={styles.infoCardValueContainer}>
                <Text style={[styles.infoCardValue, { marginTop: valueTranslateY }]}>{value}</Text>
              </View>
            </View>
            <Animated.View style={{ width: contentContainerWidth, opacity: contentOpacity, flexDirection: 'row', alignItems: 'center', height: '100%' }}>
              <View style={styles.verticalSeparator} />
              <View style={styles.expandedInfoContent}>
                <WordAnimatedText 
                  key={isExpanded ? 'expanded' : 'collapsed'}
                  text={summary}
                  start={startTyping}
                  textStyle={styles.expandedText}
                  containerStyle={{ paddingHorizontal: 0, marginBottom: 0, justifyContent: 'center' }}
                  staggerMs={20}
                  durationMs={150}
                />
              </View>
            </Animated.View>
          </View>
        </Pressable>
      </BlurView>
    </Animated.View>
  );
}, (prev, next) =>
  prev.isExpanded === next.isExpanded &&
  prev.value === next.value &&
  prev.summary === next.summary
);

const BlueprintCard = ({ icon: Icon, title, text, iconColor = '#333333', index, studyTitle, content, currentPage, isFlippable = true }: { icon: React.ElementType, title: string, text?: string, iconColor?: string, index: number, studyTitle: string, content?: { title: string, summary: string }, currentPage: number, isFlippable?: boolean }) => {
  const animation = useRef(new Animated.Value(0)).current;
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnimation = useRef(new Animated.Value(0)).current;
  const [cardHeight, setCardHeight] = useState(0);

  useEffect(() => {
    Animated.timing(animation, {
      toValue: currentPage === 1 ? 1 : 0,
      duration: 400,
      delay: 100 * index,
      easing: Easing.bezier(0.42, 0, 0.58, 1),
      useNativeDriver: true,
    }).start();
  }, [currentPage]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(flipAnimation, {
      toValue: isFlipped ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
      setIsFlipped(!isFlipped);
  };

  const animatedStyle = {
    opacity: animation,
    transform: [{
      translateY: animation.interpolate({
        inputRange: [0, 1],
        outputRange: [20, 0],
      })
    }]
  };

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const frontAnimatedStyle = {
    transform: [{ rotateX: frontInterpolate }],
  };

  const backAnimatedStyle = {
    transform: [{ rotateX: backInterpolate }],
  };

  return (
    <Animated.View style={[styles.blueprintCardWrapper, animatedStyle]}>
      <Pressable onPress={handlePress} disabled={!isFlippable}>
        <View>
          <Animated.View 
            style={[styles.blueprintCardFace, frontAnimatedStyle]}
            onLayout={(event) => {
              if (cardHeight === 0) {
                setCardHeight(event.nativeEvent.layout.height);
              }
            }}
          >
        <BlurView
          intensity={100}
          tint="light"
          style={styles.blueprintCardBlurContainer}
        >
              <View>
          <View style={styles.blueprintCardHeader}>
                  <View style={styles.blueprintIconContainer}>
                    <Icon size={20} color={iconColor} strokeWidth={1.5} />
            </View>
                  <Text style={styles.blueprintCardTitle}>{title}</Text>
            </View>
                {content ? (
                  <>
                    <Text style={styles.blueprintCardHighlight}>{content.title}</Text>
                    <Text style={styles.blueprintCardText}>{content.summary}</Text>
                  </>
                ) : text ? (
                  <Text style={styles.blueprintCardText}>{text}</Text>
                ) : null}
          </View>
        </BlurView>
          </Animated.View>
          {isFlippable && (
            <Animated.View style={[styles.blueprintCardFace, styles.blueprintCardBack, { height: cardHeight > 0 ? cardHeight : undefined }, backAnimatedStyle]}>
                <BlurView
                    intensity={100}
                    tint="light"
                    style={[styles.blueprintCardBlurContainer, { height: '100%' }]}
                >
                  <Text style={[styles.blueprintCardText, { textAlign: 'center' }]} numberOfLines={5} ellipsizeMode="tail">{studyTitle}</Text>
                </BlurView>
            </Animated.View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

const AnalysisScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { user } = useAuth();
  const { analysisData: rawAnalysisDataFromParams } = route.params as { analysisData?: AnalysisResponse | SkinAnalysisData };
  const insets = useSafeAreaInsets();

  const rawAnalysisData = useMemo(() => rawAnalysisDataFromParams, [rawAnalysisDataFromParams]);
  
  useEffect(() => {
    const saveAnalysis = async () => {
      if (rawAnalysisData) {
        try {
          logger.debug('AnalysisScreen: rawAnalysisData found, attempting to save.');
          
          // The data shape can vary, so we normalize it before sending.
          const dataForSupabase = 'analysis' in rawAnalysisData
            ? rawAnalysisData 
            : {
                analysis: {
                    overallScore: rawAnalysisData.overallScore,
                    overallSummary: rawAnalysisData.overallSummary,
                    metrics: rawAnalysisData.metrics,
                    blueprint: rawAnalysisData.blueprint,
                    primaryState: rawAnalysisData.primaryState,
                },
                routine: rawAnalysisData.routine,
            };

          await saveAnonymousAnalysis(dataForSupabase);
          logger.debug('AnalysisScreen: Successfully saved anonymous analysis.');

        } catch (error) {
          logger.error('AnalysisScreen: Failed to save anonymous analysis.', error);
        }
      } else {
        logger.warn('AnalysisScreen: No rawAnalysisData found on mount.');
      }
    };
  
    saveAnalysis();
  }, [rawAnalysisData]);

  const fallbackBlueprint: AnalysisBlueprint = {
    motif: "Personalized Science",
    approach: {
      title: "Personalized Science",
      summary: "We analyze your skin's needs to create a routine that is both effective and simple to follow."
    },
    habit: {
      title: "Stay Hydrated",
      summary: "Drinking enough water is essential for healthy skin.",
      study: "Learn how this lifestyle change can positively impact your skin health over time."
    },
    ingredient: {
      title: "Hyaluronic Acid",
      summary: "A common ingredient that helps skin retain moisture.",
      study: "Hyaluronic acid: A key molecule in skin aging. (Dermato-Endocrinology, 2012)"
    }
  };

  const analysisData: ProcessedAnalysisData | undefined = useMemo(() => {
    if (!rawAnalysisData) {
      return undefined;
    }
  
    let blueprint: AnalysisBlueprint | undefined;
  
    if ('analysis' in rawAnalysisData) {
      blueprint = rawAnalysisData.analysis.blueprint;
    } else if (rawAnalysisData.blueprint) {
      blueprint = rawAnalysisData.blueprint;
    }
  
    return {
      ...rawAnalysisData,
      blueprint: blueprint,
    };
  }, [rawAnalysisData]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [currentPage, setCurrentPage] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const layoutAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const overallScoreCardAnim = useRef(new Animated.Value(0)).current;
  const infoCardsRowAnim = useRef(new Animated.Value(0)).current;
  const simpleTextAnim = useRef(new Animated.Value(0)).current;
  const simpleTextMarginAnim = useRef(new Animated.Value(0)).current;

  // REFACTORED: State is now completely detached for each card.
  const [isHydrationExpanded, setIsHydrationExpanded] = useState(false);
  const [isBarrierExpanded, setIsBarrierExpanded] = useState(false);
  const [topCard, setTopCard] = useState<'Hydration' | 'Barrier' | null>(null);

  // Animation values for card expansion (width)
  const hydrationExpansionAnim = useRef(new Animated.Value(0)).current;
  const barrierExpansionAnim = useRef(new Animated.Value(0)).current;

  // NEW: Dedicated animation values for positioning
  const cardHeight = (width / 2) - 30;
  const cardGap = 20;
  const barrierCardInitialX = (width / 2) - 30 + cardGap;
  const hydrationPos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const barrierPos = useRef(new Animated.ValueXY({ x: barrierCardInitialX, y: 0 })).current;

  const philosophyTextAnim = useRef(new Animated.Value(0)).current;
  const [isInitialOverlayVisible, setIsInitialOverlayVisible] = useState(true);
  const [isRoutineOverlayVisible, setIsRoutineOverlayVisible] = useState(true);
  const overlayAnim = useRef(new Animated.Value(1)).current;
  const routineOverlayAnim = useRef(new Animated.Value(0)).current;
  const [isBlueprintOverlayVisible, setIsBlueprintOverlayVisible] = useState(true);
  const blueprintOverlayAnim = useRef(new Animated.Value(0)).current;
  const [isAnimating, setIsAnimating] = useState(false);
  const buttonStateAnim = useRef(new Animated.Value(0)).current;
  const disclaimerAnim = useRef(new Animated.Value(1)).current;
  const [expandedNotifications, setExpandedNotifications] = useState<Record<number, boolean>>({});
  const notificationAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const handleProductPress = (product: Product) => {
    setSelectedProduct(product);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedProduct(null);
  };

  const animateButtonToState = (pageIndex: number) => {
    Animated.timing(buttonStateAnim, {
      toValue: pageIndex === 1 ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    if (currentPage === 1) {
      const animations = notificationAnims.map(anim =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          easing: Easing.bezier(0.42, 0, 0.58, 1),
          useNativeDriver: true,
        })
      );
      Animated.stagger(100, animations).start();

      Animated.timing(philosophyTextAnim, {
        toValue: 1,
        duration: 350,
        delay: 300,
        useNativeDriver: true,
      }).start();
      
      if (isBlueprintOverlayVisible) {
        Animated.timing(blueprintOverlayAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.bezier(0.42, 0, 0.58, 1),
          useNativeDriver: true,
        }).start();
      }
    } else if (currentPage === 2) {
      if (isRoutineOverlayVisible) {
        Animated.timing(routineOverlayAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.bezier(0.42, 0, 0.58, 1),
          useNativeDriver: true,
        }).start();
      }
    } else {
      notificationAnims.forEach(anim => anim.setValue(0));
      philosophyTextAnim.setValue(0);
    }
  }, [currentPage, isRoutineOverlayVisible, routineOverlayAnim, isBlueprintOverlayVisible, blueprintOverlayAnim]);

  useEffect(() => {
    const animations = [
      Animated.timing(hydrationExpansionAnim, {
        toValue: isHydrationExpanded ? 1 : 0,
        duration: 250,
        useNativeDriver: false,
        easing: Easing.bezier(0.42, 0, 0.58, 1),
      }),
      Animated.timing(barrierExpansionAnim, {
        toValue: isBarrierExpanded ? 1 : 0,
        duration: 250,
        useNativeDriver: false,
        easing: Easing.bezier(0.42, 0, 0.58, 1),
      }),
    ];
    Animated.parallel(animations).start();
  }, [isHydrationExpanded, isBarrierExpanded, hydrationExpansionAnim, barrierExpansionAnim]);

  useEffect(() => {
    Animated.timing(simpleTextMarginAnim, {
      toValue: isHydrationExpanded || isBarrierExpanded ? 1 : 0,
      duration: 250,
      easing: Easing.bezier(0.42, 0, 0.58, 1),
      useNativeDriver: true,
    }).start();
  }, [isHydrationExpanded, isBarrierExpanded]);

  useEffect(() => {
    Animated.timing(layoutAnim, {
      toValue: currentPage > 0 ? 1 : 0,
      duration: 250,
      useNativeDriver: false, 
    }).start();
  }, [currentPage]);

  useEffect(() => {
    Animated.timing(disclaimerAnim, {
      toValue: currentPage === 0 ? 1 : 0,
      duration: 100,
      easing: Easing.bezier(0.42, 0, 0.58, 1),
      useNativeDriver: false,
    }).start();
  }, [currentPage]);

  useEffect(() => {
    if (currentPage !== 0) {
      overallScoreCardAnim.setValue(0);
      infoCardsRowAnim.setValue(0);
      simpleTextAnim.setValue(0);
      return;
    }

    if (analysisData && currentPage === 0) {
      Animated.stagger(100, [
        Animated.timing(overallScoreCardAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.bezier(0.42, 0, 0.58, 1),
          useNativeDriver: true,
        }),
        Animated.timing(infoCardsRowAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.bezier(0.42, 0, 0.58, 1),
          useNativeDriver: true,
        }),
        Animated.timing(simpleTextAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.bezier(0.42, 0, 0.58, 1),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [analysisData, currentPage]);

  useEffect(() => {
    const listenerId = scrollX.addListener(({ value }) => {
      scrollViewRef.current?.scrollTo({ x: value, animated: false });
    });
    return () => {
      scrollX.removeListener(listenerId);
    };
  }, [scrollX]);

  const handleToggleCard = useCallback((card: 'Hydration' | 'Barrier') => {
    // Determine the next state of the card being toggled *before* any state changes.
    const willBeExpanded = card === 'Hydration' ? !isHydrationExpanded : !isBarrierExpanded;

    // --- 1. Update Expansion State ---
    // This is the ONLY place we set the expansion state. It's fully detached.
    if (card === 'Hydration') {
      setIsHydrationExpanded(willBeExpanded);
    } else {
      setIsBarrierExpanded(willBeExpanded);
    }

    // --- 2. Update Top Card State (The Core Logic) ---
    if (willBeExpanded) {
      // **EXPANDING LOGIC**
      // A card only becomes the top card if it's expanding into an empty field.
      // If another card is already the top card, we respect that and do nothing.
      // This enforces the "first expanded, stays on top" rule.
      if (topCard === null) {
        setTopCard(card);
      }
    } else {
      // **COLLAPSING LOGIC**
      // We only need to act if the card being collapsed *is* the current top card.
      if (topCard === card) {
        const otherCardIsExpanded = card === 'Hydration' ? isBarrierExpanded : isHydrationExpanded;
        if (otherCardIsExpanded) {
          // If the other card is still open, promote it to be the new top card.
          setTopCard(card === 'Hydration' ? 'Barrier' : 'Hydration');
        } else {
          // If the other card is also closed, there is no top card.
          setTopCard(null);
        }
      }
    }
  }, [isHydrationExpanded, isBarrierExpanded, topCard]);

  // NEW: Effect to handle positioning based on state
  useEffect(() => {
    // Determine target positions based on the logic cases
    let hydroTarget = { x: 0, y: 0 };
    let barrierTarget = { x: barrierCardInitialX, y: 0 };
    let containerHeight = cardHeight;

    if (isHydrationExpanded && !isBarrierExpanded) {
      // Case 2: Hydration expanded, Barrier closed
      barrierTarget = { x: 0, y: cardHeight + cardGap };
      containerHeight = cardHeight * 2 + cardGap;
    } else if (!isHydrationExpanded && isBarrierExpanded) {
      // Case 3: Barrier expanded, Hydration closed
      barrierTarget = { x: 0, y: 0 };
      hydroTarget = { x: 0, y: cardHeight + cardGap };
      containerHeight = cardHeight * 2 + cardGap;
    } else if (isHydrationExpanded && isBarrierExpanded) {
      // Case 4: Both expanded
      if (topCard === 'Hydration') {
        barrierTarget = { x: 0, y: cardHeight + cardGap };
      } else { // topCard === 'Barrier'
        hydroTarget = { x: 0, y: cardHeight + cardGap };
        barrierTarget = { x: 0, y: 0 };
      }
      containerHeight = cardHeight * 2 + cardGap;
    }
    // Case 1 (both closed) is the default state

    // Animate to the target positions
    Animated.parallel([
      Animated.timing(hydrationPos, {
        toValue: hydroTarget,
        duration: 250,
        useNativeDriver: false,
        easing: Easing.bezier(0.42, 0, 0.58, 1),
      }),
      Animated.timing(barrierPos, {
        toValue: barrierTarget,
        duration: 250,
        useNativeDriver: false,
        easing: Easing.bezier(0.42, 0, 0.58, 1),
      })
    ]).start();

  }, [isHydrationExpanded, isBarrierExpanded, topCard, cardHeight, cardGap, barrierCardInitialX]);

  const handleContinuePress = useCallback(() => {
    if (isAnimating) return;
    if (currentPage < analysisPages.length - 1) { 
      const nextPage = currentPage + 1;
      animateButtonToState(nextPage);
      setIsAnimating(true);
      Animated.timing(scrollX, {
        toValue: width * nextPage,
        duration: 400,
        easing: Easing.bezier(0.85, 0, 0.15, 1),
        useNativeDriver: true,
      }).start(() => {
        setCurrentPage(nextPage);
        setIsAnimating(false);
      });
      requestAnimationFrame(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    } else if (currentPage === analysisPages.length - 1) {
      requestAnimationFrame(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
      navigation.navigate('Authentication');
    }
  }, [isAnimating, currentPage, scrollX, navigation]);

  const handleBackPress = useCallback(() => {
    if (isAnimating) return;
    if (currentPage > 0) {
      const prevPage = currentPage - 1;
      animateButtonToState(prevPage);
      setIsAnimating(true);
      Animated.timing(scrollX, {
        toValue: width * prevPage,
        duration: 400,
        easing: Easing.bezier(0.85, 0, 0.15, 1),
        useNativeDriver: true,
      }).start(() => {
        setCurrentPage(prevPage);
        setIsAnimating(false);
      });
      requestAnimationFrame(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    }
  }, [isAnimating, currentPage, scrollX]);
  
  const exitFlow = useCallback(() => {
    if (user) {
      navigation.getParent()?.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        })
      );
    } else {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Welcome' }],
        })
      );
    }
  }, [user, navigation]);
  
  const backButtonContainerStyle = useMemo(() => ({
    width: layoutAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, BACK_BUTTON_WIDTH + BACK_BUTTON_MARGIN],
    }),
  }), [layoutAnim]);

  const overallScoreCardAnimationStyle = useMemo(() => ({
    opacity: overallScoreCardAnim,
    transform: [{
      translateY: overallScoreCardAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [20, 0]
      }),
    }],
  }), []);

  const infoCardsRowAnimationStyle = useMemo(() => ({
    opacity: infoCardsRowAnim,
    transform: [{
      translateY: infoCardsRowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [20, 0]
      }),
    }],
  }), []);

  const philosophyTextStyle = useMemo(() => ({
    opacity: philosophyTextAnim,
    transform: [{
      translateY: philosophyTextAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [20, 0]
      }),
    }],
  }), [philosophyTextAnim]);

  const simpleRoutineTextStyle = useMemo(() => {
    const initialTranslateY = simpleTextAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [20, 0]
    });

    const marginTranslateY = simpleTextMarginAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 5],
    });

    return {
      opacity: simpleTextAnim,
      transform: [{
        translateY: Animated.add(initialTranslateY, marginTranslateY)
      }],
    };
  }, [simpleTextAnim, simpleTextMarginAnim]);

  const bothCardsClosed = !isHydrationExpanded && !isBarrierExpanded;
  const targetHeight = bothCardsClosed 
    ? cardHeight 
    : cardHeight * 2 + cardGap;
  
  const heightAnim = useRef(new Animated.Value(cardHeight)).current;

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: targetHeight,
      duration: 250,
      easing: Easing.bezier(0.42, 0, 0.58, 1),
      useNativeDriver: false,
    }).start();
  }, [targetHeight]);


  const infoCardsContainerStyle = useMemo(() => ({
    height: heightAnim,
  }), [heightAnim]);

  const hydrationCardStyle = useMemo(() => ({
    transform: [{ translateX: hydrationPos.x }, { translateY: hydrationPos.y }],
  }), [hydrationPos]);

  const barrierCardStyle = useMemo(() => ({
    transform: [{ translateX: barrierPos.x }, { translateY: barrierPos.y }],
  }), [barrierPos]);

  const dismissOverlay = useCallback(() => {
    if (isInitialOverlayVisible) {
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsInitialOverlayVisible(false);
      });
    }
  }, [isInitialOverlayVisible, overlayAnim]);

  const dismissRoutineOverlay = useCallback(() => {
    if (isRoutineOverlayVisible) {
      Animated.timing(routineOverlayAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsRoutineOverlayVisible(false);
      });
    }
  }, [isRoutineOverlayVisible, routineOverlayAnim]);

  const dismissBlueprintOverlay = useCallback(() => {
    if (isBlueprintOverlayVisible) {
      Animated.timing(blueprintOverlayAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsBlueprintOverlayVisible(false);
      });
    }
  }, [isBlueprintOverlayVisible, blueprintOverlayAnim]);

  const BackgroundBlobs = () => (
    <View style={StyleSheet.absoluteFill}>
      <View style={styles.blob1} />
      <View style={styles.blob2} />
    </View>
  );

  const handleToggleNotification = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedNotifications(prev => ({
        ...prev,
        [index]: !prev[index],
    }));
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar style="dark" />
      <BackgroundBlobs />
      <BlurView 
        intensity={95} 
        tint="light" 
        style={StyleSheet.absoluteFill}
        shouldRasterizeIOS={true}
        renderToHardwareTextureAndroid={true}
      />

      <View style={styles.safeAreaContent}>
        <View style={[styles.topBlockContainer, { paddingTop: insets.top }]}>
          <View style={styles.headerContainer}>
            <Animated.View style={[styles.backButtonContainer, backButtonContainerStyle]}>
              <Animated.View style={{ opacity: layoutAnim }}>
                <Pressable
                  onPress={handleBackPress}
                  style={styles.backButton}
                  disabled={currentPage === 0}
                >
                  <ArrowLeft size={24} color="#333333" strokeWidth={1.5} />
                </Pressable>
              </Animated.View>
            </Animated.View>
            <View style={styles.progressBarWrapper}>
              {Array.from({ length: 3 }).map((_, index) => {
                const progress = scrollX.interpolate({
                  inputRange: [width * (index - 1), width * index],
                  outputRange: [0, 1],
                  extrapolate: 'clamp',
                });
                
                const isLast = index === 2;

                if (isLast) {
                  return (
                    <LinearGradient
                      key={index}
                      colors={['#FFD0D04D', '#B8D0FF4D']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.progressStep}
                    >
                      <Animated.View style={{ width: '100%', height: '100%', transform: [{ scaleX: progress }], transformOrigin: 'left' }}>
                        <LinearGradient
                          colors={['#FFA8A8', '#A8C5FF']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.gradientFill}
                        />
                      </Animated.View>
                    </LinearGradient>
                  );
                }

                return (
                  <View key={index} style={[styles.progressStep, { backgroundColor: '#E5E5E5' }]}>
                    <Animated.View style={[styles.progressIndicator, { transform: [{ scaleX: progress }], transformOrigin: 'left' }]} />
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.middleBlock}>
          {analysisPages.map((page, index) => {
            const pageOpacity = scrollX.interpolate({
              inputRange: [
                width * (index - 0.5),
                width * index,
                width * (index + 0.5),
              ],
              outputRange: [0, 1, 0],
              extrapolate: 'clamp',
            });

            if (index === 0) {
              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.pageContainer,
                    { opacity: pageOpacity, zIndex: currentPage === index ? 1 : 0 },
                  ]}
                  pointerEvents={currentPage === index ? 'auto' : 'none'}
                >
                  {analysisData && (
                    <ScrollView 
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.scrollContentContainer}
                      removeClippedSubviews={true}
                    >
                      <WordAnimatedText 
                        text="Your Key Skin Metrics." 
                        start={currentPage === 0}
                        textStyle={styles.titleTextStyle}
                        containerStyle={styles.titleContainer}
                      />
                      <Animated.View style={[overallScoreCardAnimationStyle, { zIndex: isInitialOverlayVisible ? 10 : 1 }]}>
                        <OverallScoreCard analysisData={'analysis' in analysisData ? analysisData.analysis : analysisData} onCardPress={dismissOverlay} />
                      </Animated.View>
                      <Animated.View style={[infoCardsRowAnimationStyle, { width: '100%' }]}>
                        <Animated.View style={[styles.infoCardsRow, infoCardsContainerStyle]}>
                          <Animated.View style={[{ position: 'absolute', left: 0 }, hydrationCardStyle]}>
                            <InfoCard
                              title="Hydration"
                              value={'analysis' in analysisData ? analysisData.analysis.metrics.hydration : analysisData.metrics.hydration}
                              summary={'analysis' in analysisData ? analysisData.analysis.metrics.hydrationSummary : analysisData.metrics.hydrationSummary}
                              IconComponent={Droplet}
                              isExpanded={isHydrationExpanded}
                              onToggle={() => handleToggleCard('Hydration')}
                              animation={hydrationExpansionAnim}
                            />
                          </Animated.View>
                          <Animated.View style={[{ position: 'absolute', left: 0 }, barrierCardStyle]}>
                            <InfoCard
                              title="Barrier"
                              value={'analysis' in analysisData ? analysisData.analysis.metrics.barrier : analysisData.metrics.barrier}
                              summary={'analysis' in analysisData ? analysisData.analysis.metrics.barrierSummary : analysisData.metrics.barrierSummary}
                              IconComponent={Shield}
                              isExpanded={isBarrierExpanded}
                              onToggle={() => handleToggleCard('Barrier')}
                              animation={barrierExpansionAnim}
                            />
                          </Animated.View>
                        </Animated.View>
                      </Animated.View>
                      <Animated.View style={[styles.simpleRoutineTextContainer, simpleRoutineTextStyle, { flex: 1, justifyContent: 'center' }]}>
                        <Text style={styles.simpleRoutineText}>
                          A smart routine is a simple one, we focus on what truly works.
                        </Text>
                      </Animated.View>
                    </ScrollView>
                  )}
                </Animated.View>
              )
            }

            if (index === 1) {
              const blueprintData = analysisData?.blueprint;
            
              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.page,
                    { opacity: pageOpacity, zIndex: currentPage === index ? 1 : 0 },
                  ]}
                  pointerEvents={currentPage === index ? 'auto' : 'none'}
                >
                  <WordAnimatedText
                    text={analysisPages[1].title}
                    start={currentPage === 1}
                    textStyle={styles.titleTextStyle}
                    containerStyle={styles.titleContainerPage2}
                  />
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={{ flex: 1, width: '100%' }}
                    contentContainerStyle={styles.scrollContentContainerPage2}
                  >
                    {blueprintData && (
                      <View style={{width: '100%'}}>
                        <BlueprintCard
                          icon={FlaskConical}
                          title="Our Approach"
                          content={blueprintData.approach}
                          iconColor="#6366F1"
                          index={0}
                          studyTitle="This explains the scientific reasoning behind our approach to your skin."
                          currentPage={currentPage}
                          isFlippable={false}
                        />
                        <BlueprintCard
                          icon={CalendarDays}
                          title="Lifestyle Habit"
                          content={{ title: blueprintData.habit.title, summary: blueprintData.habit.summary }}
                          iconColor="#EC4899"
                          index={1}
                          studyTitle={blueprintData.habit.study}
                          currentPage={currentPage}
                        />
                        <BlueprintCard
                          icon={Droplet}
                          title="Key Ingredient"
                          content={blueprintData.ingredient}
                          iconColor="#10B981"
                          index={2}
                          studyTitle={blueprintData.ingredient.study}
                          currentPage={currentPage}
                          isFlippable={true}
                        />
                      </View>
                    )}
                  </ScrollView>
                </Animated.View>
              );
            }

            if (index === 2) {
              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.page,
                    { opacity: pageOpacity, zIndex: currentPage === index ? 1 : 0 },
                  ]}
                  pointerEvents={currentPage === index ? 'auto' : 'none'}
                >
                  <WordAnimatedText
                    text={analysisPages[2].title}
                    start={currentPage === 2}
                    textStyle={styles.titleTextStyle}
                    containerStyle={styles.titleContainerPage2}
                  />
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={{ flex: 1, width: '100%' }}
                    contentContainerStyle={styles.scrollContentContainerPage2}
                  >
                    {analysisData && 'routine' in analysisData && analysisData.routine && (
                      <View style={styles.productsContainer}>
                        {analysisData.routine.products.map((product, productIndex) => {
                          const productForCard: Product = {
                            id: product.product_id,
                            title: product.title,
                            brand: product.brand,
                            product_type: product.product_type,
                            price_usd: product.price_usd,
                            product_url: product.product_url,
                            reasoning: product.reasoning,
                          };
                          return (
                            <ProductCard 
                              key={productIndex} 
                              product={productForCard} 
                              onPress={() => handleProductPress(productForCard)}
                              index={productIndex}
                              currentPage={currentPage}
                            />
                          );
                        })}
                      </View>
                    )}
                  </ScrollView>
                </Animated.View>
              );
            }

            return (
              <Animated.View
                key={index}
                style={[
                  styles.page,
                  { opacity: pageOpacity, zIndex: currentPage === index ? 1 : 0 },
                ]}
                pointerEvents={currentPage === index ? 'auto' : 'none'}
              >
                <Text style={styles.questionTitle}>{page.title}</Text>
                <Text style={styles.questionSubtitle}>{page.subtitle}</Text>
              </Animated.View>
            );
          })}
        </View>
        
        <Animated.ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          style={styles.hiddenScrollView}
          bounces={false}
        >
          <View style={{ width: width * analysisPages.length, height: 1 }} />
        </Animated.ScrollView>

        <View style={[styles.footer, { marginBottom: insets.bottom > 0 ? insets.bottom : 20, paddingBottom: 20 }]}>
          <View style={{ 
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text style={styles.disclaimerText}>
              This educational plan is not a substitute for medical advice. Please consult a dermatologist for any medical concerns.
            </Text>
          </View>
          <Pressable 
            style={[styles.continueButton]} 
            onPress={handleContinuePress}
          >
            <Animated.View
              style={{
                opacity: buttonStateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0],
                }),
              }}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </Animated.View>

            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  opacity: buttonStateAnim,
                  justifyContent: 'center',
                  alignItems: 'center',
                },
              ]}
              pointerEvents="none"
            >
              <MaskedView
                style={styles.buttonTextContainer}
                maskElement={
                  <View style={styles.buttonMaskContainer}>
                    <Text style={styles.seeRoutineButtonText}>See Routine</Text>
                    <ArrowRight size={22} color="black" style={styles.arrowIcon} />
                  </View>
                }
              >
                <LinearGradient
                  colors={['#FF8C8C', '#8CB2FF']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{ flex: 1 }}
                />
              </MaskedView>
            </Animated.View>
          </Pressable>
        </View>
      </View>

      {isInitialOverlayVisible && (
        <>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: overlayAnim, zIndex: 5 }]}>
            <Pressable
              onPress={dismissOverlay}
              style={styles.fullScreenOverlay}
            />
          </Animated.View>
          <Animated.View style={[styles.instructionOverlay, { opacity: overlayAnim, zIndex: 15 }]} pointerEvents="none">
            <MousePointerClick color="white" size={32} style={{ marginBottom: 12 }} />
            <Text style={styles.instructionOverlayText}>Tap on score cards to view elaboration</Text>
          </Animated.View>
        </>
      )}

      

      {currentPage === 2 && isRoutineOverlayVisible && (
        <>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: routineOverlayAnim, zIndex: 5 }]}>
            <Pressable
              onPress={dismissRoutineOverlay}
              style={styles.fullScreenOverlay}
            />
          </Animated.View>
          <Animated.View style={[styles.instructionOverlay, { opacity: routineOverlayAnim, zIndex: 15 }]} pointerEvents="none">
            <MousePointerClick color="white" size={32} style={{ marginBottom: 12 }} />
            <Text style={styles.instructionOverlayText}>click cards to view detailed product information</Text>
            <Text style={[styles.instructionOverlayText, { marginTop: 24 }]}>your routine can be modified once you're logged in</Text>
          </Animated.View>
        </>
      )}

      {currentPage === 1 && isBlueprintOverlayVisible && (
        <>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: blueprintOverlayAnim, zIndex: 20 }]}>
            <Pressable
              onPress={dismissBlueprintOverlay}
              style={styles.fullScreenOverlay}
            />
          </Animated.View>
          <Animated.View style={[styles.instructionOverlay, { opacity: blueprintOverlayAnim, zIndex: 30 }]} pointerEvents="none">
            <MousePointerClick color="white" size={32} style={{ marginBottom: 12 }} />
            <Text style={styles.instructionOverlayText}>Tap the 'Lifestyle Habit' and 'Key Ingredient' cards for the research behind our approach.</Text>
          </Animated.View>
        </>
      )}
      <ProductDetailModal 
        visible={isModalVisible}
        onClose={handleCloseModal}
        product={selectedProduct}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  safeAreaContent: {
    flex: 1,
  },
  topBlockContainer: {
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 0,
    backgroundColor: 'transparent',
    height: 50,
  },
  backButtonContainer: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(240, 240, 240, 0.7)',
    borderRadius: 20,
  },
  progressBarWrapper: {
    flex: 1,
    height: 4,
    flexDirection: 'row',
  },
  progressStep: {
    flex: 1,
    height: '100%',
    borderRadius: 2,
    marginHorizontal: 1.5,
    overflow: 'hidden',
  },
  progressIndicator: {
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: 2,
  },
  gradientFill: {
    flex: 1,
    borderRadius: 2,
  },
  middleBlock: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  page: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingTop: 10,
  },
  hiddenScrollView: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    zIndex: -1,
  },
  questionTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  questionSubtitle: {
    fontSize: 16,
    color: '#555555',
    marginBottom: 15,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 8,
  },
  continueButton: {
    backgroundColor: '#000000',
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  pageContainer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  scrollContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: 'center',
    flexGrow: 1,
  },
  scrollContentContainerPage2: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 0,
    alignItems: 'center',
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  overallScoreContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 25,
    paddingBottom: 35,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  overallScoreGlassContainer: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  overallScoreGlassBorder: {
    borderRadius: 26,
    padding: 1,
    overflow: 'hidden',
  },
  overallScoreBlurContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    paddingTop: 25,
    paddingBottom: 35,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  chevronIconContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
  },
  scoreHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 5, 
    marginBottom: 15,
  },
  gaugeContainer: {
    width: '100%',
    height: (width - cardPadding * 2) * 0.75 / 2,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  svg: {
    overflow: 'hidden',
  },
  scoreTextContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 5,
    transform: [{ translateY: 25 }],
  },
  scoreTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 1,
    textAlign: 'center',
    flex: 1,
    marginLeft: 20, 
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 70,
  },
  scoreState: {
    fontSize: 20,
    fontWeight: '500',
    color: '#555',
    marginTop: 4,
    marginBottom: 0,
  },
  infoCardsRow: {
    position: 'relative',
    width: '100%',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 15,
    height: (width / 2) - 30,
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 5,
    marginBottom: -5,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
  infoCardBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 0,
  },
  iconContainer: {
    width: (width / 2) - 60,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  maskedViewStyle: {
    height: 125,
    width: 125,
  },
  maskElementContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  iconFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
  },
  infoCardValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  infoCardValueContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blob1: {
    position: 'absolute',
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: width * 0.425,
    top: height * 0.2,
    left: width * 0.05,
    backgroundColor: 'rgba(255, 168, 168, 0.2)',
  },
  blob2: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width * 0.45,
    top: height * 0.35,
    right: -width * 0.05,
    backgroundColor: 'rgba(186, 190, 255, 0.3)',
  },
  separator: {
    height: 1,
    backgroundColor: '#EAEAEA',
    marginTop: 35,
    marginBottom: 15,
    width: '90%',
    alignSelf: 'center',
  },
  verticalSeparator: {
    width: 1,
    height: '60%',
    backgroundColor: '#EAEAEA',
    marginRight: 8,
  },
  expandedContent: {
    paddingHorizontal: 0,
  },
  expandedInfoContent: {
    flex: 1,
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  expandedText: {
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  chevronContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevron: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  titleTextStyle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#333',
  },
  philosophyContainer: {
    marginTop: 30,
    marginBottom: 20,
  },
  philosophyText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#555',
    textAlign: 'center',
    lineHeight: 25,
  },
  fullScreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  instructionOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionOverlayText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: '60%',
    lineHeight: 26,
  },
  notificationContainer: {
    width: '100%',
  },
  notificationCardWrapper: {
    width: '100%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  notificationCardGlassBorder: {
    borderRadius: 16,
    padding: 1,
    overflow: 'hidden',
  },
  notificationCardBlurContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    paddingVertical: 24,
    paddingHorizontal: 20,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationIconContainer: {
    marginRight: 15,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  notificationText: {
    paddingTop: 10,
    fontSize: 14,
    color: '#555555',
    lineHeight: 20,
  },
  pageSubtitleStyle: {
    fontSize: 16,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 22,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: 0,
    marginBottom: 15,
  },
  buttonTextContainer: {
    height: 24, 
    flexDirection: 'row',
  },
  buttonMaskContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeRoutineButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'black',
  },
  arrowIcon: {
    marginLeft: 8,
    marginTop: 1,
  },
  titleContainerPage2: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    marginBottom: 15,
  },
  productsContainer: {
    width: '100%',
    paddingTop: 10,
  },
  routineTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'left',
  },
  routineSummary: {
    fontSize: 14,
    color: '#555',
    marginBottom: 20,
    textAlign: 'left',
  },
  infoCardWrapper: {
    backgroundColor: 'transparent',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  infoCardGlassBorder: {
    borderRadius: 26,
    padding: 1,
    overflow: 'hidden',
  },
  infoCardBlurContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    padding: 15,
    height: (width / 2) - 30,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  simpleRoutineTextContainer: {
    paddingHorizontal: 20,
  },
  simpleRoutineText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
  },
  blueprintCardWrapper: {
    width: '100%',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  blueprintCardBlurContainer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 2,
    minHeight: 120,
    justifyContent: 'center',
  },
  blueprintCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  blueprintIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  blueprintCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  blueprintCardHighlight: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 6,
  },
  blueprintCardText: {
    fontSize: 15,
    color: '#333333',
    lineHeight: 22,
    marginVertical: 3,
  },
  blueprintCardFace: {
    backfaceVisibility: 'hidden',
  },
  blueprintCardBack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default AnalysisScreen; 