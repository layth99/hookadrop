import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Dimensions, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import { colors } from '../../theme/colors';
import { fontSize, fontWeight } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { useProductStore } from '../../store/productStore';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen({ navigation, route }) {
  const { productId } = route.params;
  const insets = useSafeAreaInsets();

  const { getProduct, loading }          = useProductStore();
  const { addToCart, cartItems }         = useCartStore();
  const { toggleWishlist, isWishlisted } = useWishlistStore();

  const [product, setProduct]   = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty]           = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    const p = getProduct(productId);
    setProduct(p);
    // Check if already in cart
    const inCart = cartItems.find((c) => c.product._id === productId);
    if (inCart) setQty(inCart.qty);
  }, [productId]);

  if (loading || !product) return <Loader fullscreen />;

  const images = [product.image, product.image1, product.image2, product.image3].filter(Boolean);
  const discounted = product.discount
    ? product.price - (product.price * product.discount) / 100
    : product.price;
  const wishlisted = isWishlisted(product._id);
  const inStock    = product.stock > 0;

  const handleAddToCart = () => {
    addToCart(product, qty);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image carousel */}
        <View style={styles.imageSection}>
          <Image
            source={{ uri: images[activeImg] }}
            style={styles.mainImage}
            resizeMode="cover"
          />
          {/* Gradient overlay */}
          <LinearGradient
            colors={['transparent', colors.bg]}
            style={styles.imageGradient}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 0, y: 1 }}
          />

          {/* Back & Wishlist */}
          <View style={[styles.topActions, { top: insets.top + 12 }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.actionBtn}>
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleWishlist(product)} style={styles.actionBtn}>
              <Ionicons
                name={wishlisted ? 'heart' : 'heart-outline'}
                size={22}
                color={wishlisted ? colors.error : colors.textPrimary}
              />
            </TouchableOpacity>
          </View>

          {/* Discount badge */}
          {product.discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{product.discount}%</Text>
            </View>
          )}

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <View style={styles.thumbRow}>
              {images.map((img, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setActiveImg(i)}
                  style={[styles.thumb, i === activeImg && styles.thumbActive]}
                >
                  <Image source={{ uri: img }} style={styles.thumbImg} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Details */}
        <View style={styles.details}>
          {/* Brand & name */}
          <Text style={styles.brand}>{product.mark}</Text>
          <Text style={styles.name}>{product.name}</Text>

          {/* Price row */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>${discounted.toFixed(2)}</Text>
            {product.discount > 0 && (
              <Text style={styles.originalPrice}>${product.price.toFixed(2)}</Text>
            )}
            <View style={{ flex: 1 }} />
            <Badge
              label={inStock ? `${product.stock} in stock` : 'Out of Stock'}
              status={inStock ? 'confirmed' : 'cancelled'}
            />
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description */}
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{product.description}</Text>

          {/* Category */}
          <View style={styles.infoRow}>
            <InfoChip icon="grid-outline"      label="Category" value={product.category} />
            <InfoChip icon="pricetag-outline"  label="Brand"    value={product.mark} />
          </View>

          {/* Quantity selector */}
          {inStock && (
            <View style={styles.qtySection}>
              <Text style={styles.sectionTitle}>Quantity</Text>
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  onPress={() => setQty(Math.max(1, qty - 1))}
                  style={[styles.qtyBtn, qty <= 1 && styles.qtyBtnDisabled]}
                >
                  <Ionicons name="remove" size={20} color={qty <= 1 ? colors.textMuted : colors.gold} />
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{qty}</Text>
                <TouchableOpacity
                  onPress={() => setQty(Math.min(product.stock, qty + 1))}
                  style={[styles.qtyBtn, qty >= product.stock && styles.qtyBtnDisabled]}
                >
                  <Ionicons name="add" size={20} color={qty >= product.stock ? colors.textMuted : colors.gold} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <LinearGradient
        colors={['transparent', colors.bg]}
        style={styles.bottomBar}
      >
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalPrice}>${(discounted * qty).toFixed(2)}</Text>
        </View>
        <Button
          title={addedToCart ? '✓ Added to Cart' : inStock ? 'Add to Cart' : 'Out of Stock'}
          onPress={handleAddToCart}
          disabled={!inStock || addedToCart}
          size="lg"
          style={styles.addBtn}
          variant={addedToCart ? 'outline' : 'primary'}
        />
      </LinearGradient>
    </View>
  );
}

function InfoChip({ icon, label, value }) {
  return (
    <View style={chipStyles.container}>
      <Ionicons name={icon} size={14} color={colors.gold} />
      <View>
        <Text style={chipStyles.label}>{label}</Text>
        <Text style={chipStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.bgCardLight, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, flex: 1,
  },
  label: { color: colors.textMuted, fontSize: fontSize.xs },
  value: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  imageSection: { height: 380, position: 'relative' },
  mainImage: { width, height: 360 },
  imageGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
  },
  topActions: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
  },
  actionBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(10px)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  discountBadge: {
    position: 'absolute', top: 60, right: spacing.base,
    backgroundColor: colors.error,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full,
  },
  discountText: { color: colors.white, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  thumbRow: {
    position: 'absolute', bottom: 12, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  thumb: {
    width: 52, height: 52, borderRadius: radius.md,
    overflow: 'hidden', borderWidth: 2, borderColor: colors.border,
  },
  thumbActive: { borderColor: colors.gold },
  thumbImg: { width: '100%', height: '100%' },
  details: { padding: spacing.base, paddingTop: spacing.md },
  brand: {
    color: colors.gold, fontSize: fontSize.xs,
    fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4,
  },
  name: {
    color: colors.textPrimary, fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold, lineHeight: 32, marginBottom: spacing.md,
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.base },
  price: { color: colors.gold, fontSize: fontSize['2xl'], fontWeight: fontWeight.black },
  originalPrice: {
    color: colors.textMuted, fontSize: fontSize.base,
    textDecorationLine: 'line-through',
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.base },
  sectionTitle: {
    color: colors.textPrimary, fontSize: fontSize.base,
    fontWeight: fontWeight.semibold, marginBottom: spacing.sm,
  },
  description: {
    color: colors.textSecondary, fontSize: fontSize.base,
    lineHeight: 24, marginBottom: spacing.base,
  },
  infoRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.base },
  qtySection: { marginBottom: 120 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  qtyBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.bgCardLight,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnDisabled: { opacity: 0.4 },
  qtyValue: {
    color: colors.textPrimary, fontSize: fontSize.xl,
    fontWeight: fontWeight.bold, minWidth: 32, textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingTop: 20, paddingBottom: 36, paddingHorizontal: spacing.base,
  },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.md,
  },
  totalLabel: { color: colors.textSecondary, fontSize: fontSize.base },
  totalPrice: { color: colors.gold, fontSize: fontSize.xl, fontWeight: fontWeight.black },
  addBtn: { width: '100%' },
});
