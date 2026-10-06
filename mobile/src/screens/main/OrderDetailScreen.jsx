import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Badge from '../../components/ui/Badge';
import Loader from '../../components/ui/Loader';
import { colors } from '../../theme/colors';
import { fontSize, fontWeight } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { useOrderStore } from '../../store/orderStore';

const STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

export default function OrderDetailScreen({ navigation, route }) {
  const { orderId } = route.params;
  const insets = useSafeAreaInsets();
  const { orders, loading } = useOrderStore();
  const order = orders.find((o) => o._id === orderId);

  if (loading) return <Loader fullscreen />;
  if (!order)  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
      </TouchableOpacity>
      <View style={styles.center}>
        <Text style={styles.notFound}>Order not found</Text>
      </View>
    </View>
  );

  const date = new Date(order.createdAt).toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const currentStepIdx = STEPS.indexOf(order.status);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Order #{order.orderId}</Text>
        <Badge label={order.status} status={order.status} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Tracking timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Tracking</Text>
          <View style={styles.timeline}>
            {STEPS.map((step, i) => {
              const done    = i <= currentStepIdx;
              const current = i === currentStepIdx;
              return (
                <View key={step} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.dot, done && styles.dotDone, current && styles.dotCurrent]}>
                      {done && <Ionicons name="checkmark" size={10} color={colors.black} />}
                    </View>
                    {i < STEPS.length - 1 && (
                      <View style={[styles.connector, done && styles.connectorDone]} />
                    )}
                  </View>
                  <Text style={[styles.stepText, done && styles.stepTextDone, current && styles.stepTextCurrent]}>
                    {step.charAt(0).toUpperCase() + step.slice(1)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Delivery info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Information</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="person-outline"   label="Name"    value={order.fullname} />
            <InfoRow icon="call-outline"     label="Phone"   value={order.phone} />
            <InfoRow icon="location-outline" label="Address" value={order.address} />
            <InfoRow icon="calendar-outline" label="Date"    value={date} />
          </View>
        </View>

        {/* Payment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.infoCard}>
            <InfoRow
              icon="card-outline"
              label="Method"
              value={order.paymentMethod}
            />
            <InfoRow
              icon={order.isPaid ? 'checkmark-circle-outline' : 'time-outline'}
              label="Status"
              value={order.isPaid ? 'Paid' : 'Pending'}
              valueColor={order.isPaid ? colors.success : colors.warning}
            />
          </View>
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items ({order.orderItems.length})</Text>
          {order.orderItems.map((item, i) => (
            <View key={i} style={styles.orderItem}>
              <View style={styles.orderItemInfo}>
                <Text style={styles.orderItemName} numberOfLines={2}>
                  {item.product?.name || 'Product'}
                </Text>
                <Text style={styles.orderItemQty}>Qty: {item.qty}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Summary</Text>
          <View style={styles.infoCard}>
            <PriceRow label="Subtotal" value={`$${(order.totalPrice - order.shippingPrice - order.tax).toFixed(2)}`} />
            <PriceRow label="Shipping" value={`$${order.shippingPrice.toFixed(2)}`} />
            <PriceRow label="Tax"      value={`$${order.tax.toFixed(2)}`} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${order.totalPrice.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value, valueColor }) {
  return (
    <View style={infoStyles.row}>
      <Ionicons name={icon} size={16} color={colors.gold} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={[infoStyles.value, valueColor && { color: valueColor }]}>{value}</Text>
      </View>
    </View>
  );
}

function PriceRow({ label, value }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
      <Text style={{ color: colors.textSecondary, fontSize: fontSize.base }}>{label}</Text>
      <Text style={{ color: colors.textPrimary, fontSize: fontSize.base }}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, alignItems: 'flex-start' },
  label: { color: colors.textMuted, fontSize: fontSize.xs, marginBottom: 2 },
  value: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { color: colors.textMuted, fontSize: fontSize.base },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md, gap: spacing.md,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bgCardLight, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.bold },
  scroll: { paddingHorizontal: spacing.base },
  section: { marginBottom: spacing.xl },
  sectionTitle: { color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.bold, marginBottom: spacing.md },
  timeline: { paddingLeft: spacing.sm },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  timelineLeft: { alignItems: 'center' },
  dot: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.bgCardLight, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  dotDone:    { backgroundColor: colors.gold, borderColor: colors.gold },
  dotCurrent: { backgroundColor: colors.gold, borderColor: colors.gold, shadowColor: colors.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 6 },
  connector: { width: 2, height: 28, backgroundColor: colors.border, marginTop: 2 },
  connectorDone: { backgroundColor: colors.gold },
  stepText: { color: colors.textMuted, fontSize: fontSize.sm, paddingTop: 2, paddingBottom: spacing.md },
  stepTextDone:    { color: colors.textSecondary },
  stepTextCurrent: { color: colors.gold, fontWeight: fontWeight.bold },
  infoCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.base,
  },
  orderItem: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  orderItemInfo: {},
  orderItemName: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginBottom: 4 },
  orderItemQty: { color: colors.textMuted, fontSize: fontSize.xs },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: spacing.sm, marginTop: spacing.xs,
  },
  totalLabel: { color: colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.bold },
  totalValue: { color: colors.gold, fontSize: fontSize.lg, fontWeight: fontWeight.black },
});
