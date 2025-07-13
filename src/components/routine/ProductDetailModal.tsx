import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  Linking,
  Alert,
  Dimensions,
} from 'react-native';
import { Image } from 'react-native';
import { Info } from 'lucide-react-native';
import type { Product } from './ProductCard';
import { getProductImageUrl } from '../../services/productService';

const { width } = Dimensions.get('window');

const ProductDetailModal = ({ visible, onClose, product }: { visible: boolean, onClose: () => void, product: Product | null }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setImageUrl(getProductImageUrl(product.id));
    }
  }, [product]);

  const handleLinkPress = async (url: string | undefined | null) => {
    if (!url) {
      Alert.alert("No Link Available", "A product link is not available for this item.");
      return;
    }
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert(`Don't know how to open this URL: ${url}`);
    }
  };

  if (!product) {
    return null;
  }

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalView}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={[styles.productImage, { resizeMode: 'contain' }]}
            />
          ) : (
            <View style={styles.imagePlaceholder} />
          )}

          <Text style={styles.brandText}>{product.brand}</Text>
          <Text style={styles.nameText}>{product.title}</Text>
          <Text style={styles.typeText}>{product.product_type}</Text>
          
          {product.reasoning && (
            <Text style={styles.summaryText}>{product.reasoning}</Text>
          )}

          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>
              {product.price_usd ? `$${product.price_usd.toFixed(2)}` : 'Price not available'}
            </Text>
            <TouchableOpacity onPress={() => handleLinkPress(product.product_url)}>
              <View style={styles.infoTag}>
                <Info size={14} color="#666" />
                <Text style={styles.infoText}>on Amazon</Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    borderRadius: 18,
    marginBottom: 15,
    backgroundColor: '#FFFFFF',
  },
  imagePlaceholder: {
    width: 150,
    height: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
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
});

export default ProductDetailModal;
