import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { fontSize, fontWeight } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { useCartStore } from '../../store/cartStore';

export default function CartScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { cartItems, removeFromCart, updateQty, cartTotal, clearCart } = useCartStore();

  const shipping = cartTotal > 50 ? 0 : 7;
  const tax      = parseFloat((cartTotal * 0.05).toFixed(2));
  const total    = cartTotal + shipping + tax;

  const renderItem = ({ item }) => (
    <View style={styles.cartItem}>
      <Image source={{ uri: item.product.image }} style={styles.itemImg} resizeMode="cover" />
      <View style={styles.itemInfo}>
        <Text style={styles.itemBrand} numberOfLines={1}>{item.product.mark}</Text>
        <Text style={styles.itemName} numberOfLines={2}>{item.product.name}</Text>
        <Text style={styles.itemPrice}>
          ${((item.product.discount
            ? item.product.price * (1 - item.product.discount / 100)
            : item.product.price) * item.qty).toFixed(2)}
        </Text>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity onPress={() => removeFromCart(item.product._id)} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={16} color={colors.error} />
        </TouchableOpacity>
        <View style={styles.qtyRow}>
          <TouchableOpacity
            onPress={() => updateQty(item.product._id, Math.max(1, item.qty - 1))}
            style={styles.qtyBtn}
          >
            <Ionicons name="remove" size={14} color={colors.gold} />
          </TouchableOpacity>
          <Text style={styles.qtyVal}>{item.qty}</Text>
          <TouchableOpacity
            onPress={() => updateQty(item.product._id, Math.min(item.product.stock, item.qty + 1))}
            style={styles.qtyBtn}
          >
            <Ionicons name="add" size={14} color={colors.gold} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (cartItems.length === 0) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <Ionicons name="bag-outline" size={72} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySubtitle}>Add some products to get started</Text>
        <Button
          title="Browse Products"
          onPress={() => navigation.navigate('Products')}
          style={{ marginTop: spacing.xl, paddingHorizontal: 40 }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>My Cart</Text>
        <TouchableOpacity onPress={clearCart}>
          <Text style={styles.clearBtn}>Clear</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={cartItems}
        keyExtractor={(item) => item.product._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* Summary */}
      <LinearGradient colors={['transparent', colors.bg]} style={styles.summaryWrap}>
        <View style={styles.summaryCard}>
          <SummaryRow label="Subtotal" value={`$${cartTotal.toFixed(2)}`} />
          <SummaryRow label="Shipping" value={shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`} valueColor={shipping === 0 ? colors.success : undefined} />
          <SummaryRow label="Tax (5%)"  value={`$${tax.toFixed(2)}`} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
          </View>
          <Button
            title="Proceed to Checkout"
            onPress={() => navigation.navigate('Checkout')}
            size="lg"
            style={{ marginTop: spacing.base }}
          />
          {shipping > 0 && (
            <Text style={styles.freeShippingHint}>
              Add ${(50 - cartTotal).toFixed(2)} more for free shipping
            </Text>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

function SummaryRow({ label, value, valueColor }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  label: { color: colors.textSecondary, fontSize: fontSize.base },
  value: { color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.medium },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bgCardLight,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  title: { flex: 1, color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  clearBtn: { color: colors.error, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  list: { paddingHorizontal: spacing.base, paddingBottom: 320 },
  cartItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm, gap: spacing.md,
  },
  itemImg: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.bgCardLight },
  itemInfo: { flex: 1 },
  itemBrand: { color: colors.gold, fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: 1 },
  itemName: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginVertical: 2 },
  itemPrice: { color: colors.gold, fontSize: fontSize.base, fontWeight: fontWeight.bold },
  itemActions: { alignItems: 'flex-end', gap: spacing.sm },
  deleteBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#1A0000', borderWidth: 1, borderColor: colors.error + '40',
    alignItems: 'center', justifyContent: 'center',
  },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.bgCardLight,
    borderWidth: 1, borderColor: colors.borderGold,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyVal: { color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.bold, minWidth: 20, textAlign: 'center' },
  summaryWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingTop: 24,
  },
  summaryCard: {
    backgroundColor: colors.bgCard,
    borderTopWidth: 1, borderColor: colors.border,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.xl, paddingBottom: 40,
  },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: spacing.md, marginTop: spacing.xs,
  },
  totalLabel: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  totalValue: { color: colors.gold, fontSize: fontSize.xl, fontWeight: fontWeight.black },
  freeShippingHint: {
    color: colors.neonBlue, fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing.sm,
  },
  emptyTitle: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginTop: spacing.lg },
  emptySubtitle: { color: colors.textMuted, fontSize: fontSize.base, marginTop: spacing.xs },
});
