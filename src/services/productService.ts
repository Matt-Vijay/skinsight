import { supabase } from '../config/supabase';

const imageUrlCache = new Map<number, string>();

export const getProductImageUrl = (productId: number): string | null => {
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