import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Badge from '../../components/ui/Badge';
import Loader from '../../components/ui/Loader';
import { colors } from '../../theme/colors';
import { fontSize, fontWeight } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { useOrderStore } from '../../store/orderStore';

export default function OrdersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { orders, loading, fetchOrders } = useOrderStore();

  useEffect(() => { fetchOrders(); }, []);

  const renderOrder = ({ item }) => {
    const date = new Date(item.createdAt).toLocaleDateString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => navigation.navigate('OrderDetail', { orderId: item._id })}
        activeOpacity={0.85}
      >
        <View style={styles.orderTop}>
          <View>
            <Text style={styles.orderId}>#{item.orderId}</Text>
            <Text style={styles.orderDate}>{date}</Text>
          </View>
          <Badge label={item.status} status={item.status} />
        </View>
        <View style={styles.orderMid}>
          <Text style={styles.itemCount}>
            {item.orderItems.length} item{item.orderItems.length !== 1 ? 's' : ''}
          </Text>
          <View style={styles.orderRight}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${item.totalPrice.toFixed(2)}</Text>
          </View>
        </View>
        <View style={styles.orderBottom}>
          <View style={styles.paymentRow}>
            <Ionicons
              name={item.isPaid ? 'checkmark-circle' : 'time-outline'}
              size={14}
              color={item.isPaid ? colors.success : colors.warning}
            />
            <Text style={[styles.paymentText, { color: item.isPaid ? colors.success : colors.warning }]}>
              {item.isPaid ? 'Paid' : 'Payment Pending'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>My Orders</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <Loader />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          renderItem={renderOrder}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={64} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptySubtitle}>Your orders will appear here</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bgCardLight, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  title: { flex: 1, color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  list: { padding: spacing.base, paddingBottom: 100 },
  orderCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.base, marginBottom: spacing.md,
  },
  orderTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: spacing.md,
  },
  orderId: { color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.bold },
  orderDate: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
  orderMid: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.md,
  },
  itemCount: { color: colors.textSecondary, fontSize: fontSize.sm },
  orderRight: { alignItems: 'flex-end' },
  totalLabel: { color: colors.textMuted, fontSize: fontSize.xs },
  totalValue: { color: colors.gold, fontSize: fontSize.lg, fontWeight: fontWeight.black },
  orderBottom: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm,
  },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  paymentText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  emptySubtitle: { color: colors.textMuted, fontSize: fontSize.base },
});
