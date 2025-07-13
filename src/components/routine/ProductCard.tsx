import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'react-native';
import { getProductImageUrl } from '../../services/productService';

export interface Product {
  id: number;
  brand: string | null;
  title: string | null;
  product_url: string | null;
  price_usd: number | null;
  product_type: string | null;
  reasoning?: string;
}

const { width } = Dimensions.get('window');

const ProductCard = ({ product, onPress, index, currentPage, initialAnim = true }: { product: Product, onPress: (product: Product) => void, index: number, currentPage?: number, initialAnim?: boolean }) => {
  const animation = useRef(new Animated.Value(initialAnim ? 0 : 1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setImageUrl(getProductImageUrl(product.id));
    }
  }, [product]);

  useEffect(() => {
    if (initialAnim) {
      Animated.timing(animation, {
        toValue: (currentPage === 2 || currentPage === undefined) ? 1 : 0,
        duration: 400,
        delay: index * 100,
        easing: Easing.bezier(0.42, 0, 0.58, 1),
        useNativeDriver: true,
      }).start();
    }
  }, [currentPage, initialAnim]);

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const animatedStyle = {
    opacity: animation,
    transform: [{
      translateY: animation.interpolate({
        inputRange: [0, 1],
        outputRange: [20, 0],
      })
    }, {
      scale: scaleAnim
    }]
  };

  return (
    <Animated.View style={[styles.productCardWrapper, animatedStyle]}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => onPress(product)}
      >
        <BlurView
          intensity={100}
          tint="light"
          style={styles.productCardContainer}
        >
          <View style={styles.productCardContent}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={[styles.productCardImage, { resizeMode: 'cover' }]}
              />
            ) : (
              <View style={styles.productCardImagePlaceholder} />
            )}
            <View style={styles.productCardTextContainer}>
              <Text style={styles.productCardTitle} numberOfLines={2} ellipsizeMode="tail">{product.title}</Text>
              {product.reasoning ? (
                <Text style={styles.productCardReasoning} numberOfLines={2} ellipsizeMode="tail">{product.reasoning}</Text>
              ) : (
                <>
                  <Text style={styles.productCardBrand} numberOfLines={1} ellipsizeMode="tail">{product.brand}</Text>
                  <Text style={styles.productCardProductType} numberOfLines={1} ellipsizeMode="tail">{product.product_type}</Text>
                </>
              )}
            </View>
          </View>
        </BlurView>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  productCardWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 16,
    width: width - 48,
    alignSelf: 'center',
  },
  productCardContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    padding: 15,
    overflow: 'hidden',
  },
  productCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productCardImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  productCardImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  productCardTextContainer: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  productCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productCardReasoning: {
    fontSize: 14,
    color: '#555',
    lineHeight: 18,
  },
  productCardBrand: {
    fontSize: 14,
    color: '#555',
  },
  productCardProductType: {
    fontSize: 12,
    color: '#777',
    fontStyle: 'italic',
    marginTop: 2,
  },
});

export default ProductCard;
