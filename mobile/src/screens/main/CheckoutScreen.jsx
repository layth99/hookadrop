import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { colors } from '../../theme/colors';
import { fontSize, fontWeight } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useOrderStore } from '../../store/orderStore';

const PAYMENT_METHODS = [
  { id: 'cash',   label: 'Cash on Delivery', icon: 'cash-outline' },
  { id: 'card',   label: 'Credit / Debit Card', icon: 'card-outline' },
  { id: 'paypal', label: 'PayPal', icon: 'logo-paypal' },
];

export default function CheckoutScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { cartItems, cartTotal, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const { placeOrder, loading } = useOrderStore();

  const [step, setStep]   = useState(1); // 1=delivery 2=payment 3=confirm
  const [form, setForm]   = useState({
    fullname: user?.name || '',
    email:    user?.email || '',
    phone:    '',
    address:  '',
  });
  const [errors, setErrors]     = useState({});
  const [payment, setPayment]   = useState('cash');

  const shipping = cartTotal > 50 ? 0 : 7;
  const tax      = parseFloat((cartTotal * 0.05).toFixed(2));
  const total    = cartTotal + shipping + tax;

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const validateStep1 = () => {
    const e = {};
    if (!form.fullname.trim()) e.fullname = 'Full name is required';
    if (!form.phone.trim())    e.phone    = 'Phone is required';
    if (!form.address.trim())  e.address  = 'Address is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2) setStep(3);
  };

  const handlePlaceOrder = async () => {
    const orderData = {
      orderItems: cartItems.map((c) => ({ qty: c.qty, product: c.product._id })),
      paymentMethod: payment,
      fullname: form.fullname,
      email: form.email || user?.email,
      phone: form.phone,
      address: form.address,
      totalPrice: total,
      tax,
      shippingPrice: shipping,
    };
    const ok = await placeOrder(orderData);
    if (ok) {
      clearCart();
      navigation.replace('OrderSuccess');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (step > 1 ? setStep(step - 1) : navigation.goBack())} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Checkout</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.steps}>
        {['Delivery', 'Payment', 'Confirm'].map((label, i) => {
          const idx = i + 1;
          const done = step > idx;
          const active = step === idx;
          return (
            <React.Fragment key={label}>
              <View style={styles.stepItem}>
                <View style={[styles.stepCircle, active && styles.stepActive, done && styles.stepDone]}>
                  {done
                    ? <Ionicons name="checkmark" size={14} color={colors.black} />
                    : <Text style={[styles.stepNum, active && { color: colors.black }]}>{idx}</Text>
                  }
                </View>
                <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
              </View>
              {i < 2 && (
                <View style={[styles.stepLine, done && styles.stepLineDone]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Step 1 — Delivery */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.sectionTitle}>Delivery Information</Text>
              <Input label="Full Name"    value={form.fullname} onChangeText={set('fullname')} placeholder="John Doe" autoCapitalize="words" error={errors.fullname} />
              <Input label="Email"        value={form.email}    onChangeText={set('email')}    placeholder="email@example.com" keyboardType="email-address" />
              <Input label="Phone"        value={form.phone}    onChangeText={set('phone')}    placeholder="+1 234 567 8900"  keyboardType="phone-pad" error={errors.phone} />
              <Input label="Address"      value={form.address}  onChangeText={set('address')}  placeholder="123 Street, City, Country" multiline numberOfLines={3} error={errors.address} />
            </View>
          )}

          {/* Step 2 — Payment */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              {PAYMENT_METHODS.map((pm) => (
                <TouchableOpacity
                  key={pm.id}
                  onPress={() => setPayment(pm.id)}
                  style={[styles.payOption, payment === pm.id && styles.payOptionActive]}
                >
                  <Ionicons
                    name={pm.icon}
                    size={24}
                    color={payment === pm.id ? colors.gold : colors.textSecondary}
                  />
                  <Text style={[styles.payLabel, payment === pm.id && { color: colors.gold }]}>
                    {pm.label}
                  </Text>
                  <View style={{ flex: 1 }} />
                  <View style={[styles.payRadio, payment === pm.id && styles.payRadioActive]}>
                    {payment === pm.id && <View style={styles.payRadioDot} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Step 3 — Confirm */}
          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={styles.sectionTitle}>Order Summary</Text>

              {/* Delivery recap */}
              <View style={styles.recapCard}>
                <Text style={styles.recapTitle}>📦 Delivery</Text>
                <Text style={styles.recapLine}>{form.fullname}</Text>
                <Text style={styles.recapLine}>{form.phone}</Text>
                <Text style={styles.recapLine}>{form.address}</Text>
              </View>

              {/* Payment recap */}
              <View style={styles.recapCard}>
                <Text style={styles.recapTitle}>💳 Payment</Text>
                <Text style={styles.recapLine}>
                  {PAYMENT_METHODS.find((p) => p.id === payment)?.label}
                </Text>
              </View>

              {/* Items */}
              {cartItems.map((item) => (
                <View key={item.product._id} style={styles.orderItem}>
                  <Text style={styles.orderItemName} numberOfLines={1}>{item.product.name}</Text>
                  <Text style={styles.orderItemQty}>x{item.qty}</Text>
                  <Text style={styles.orderItemPrice}>
                    ${((item.product.discount
                      ? item.product.price * (1 - item.product.discount / 100)
                      : item.product.price) * item.qty).toFixed(2)}
                  </Text>
                </View>
              ))}

              {/* Totals */}
              <View style={styles.totalsCard}>
                <TotalRow label="Subtotal"  value={`$${cartTotal.toFixed(2)}`} />
                <TotalRow label="Shipping"  value={shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`} green={shipping === 0} />
                <TotalRow label="Tax"       value={`$${tax.toFixed(2)}`} />
                <View style={styles.grandRow}>
                  <Text style={styles.grandLabel}>Total</Text>
                  <Text style={styles.grandValue}>${total.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom button */}
      <View style={styles.bottomBar}>
        <Button
          title={step === 3 ? 'Place Order' : 'Continue'}
          onPress={step === 3 ? handlePlaceOrder : handleNext}
          loading={loading}
          size="lg"
          style={{ width: '100%' }}
        />
      </View>
    </View>
  );
}

function TotalRow({ label, value, green }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
      <Text style={{ color: colors.textSecondary, fontSize: fontSize.base }}>{label}</Text>
      <Text style={{ color: green ? colors.success : colors.textPrimary, fontSize: fontSize.base, fontWeight: fontWeight.medium }}>{value}</Text>
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
  steps: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingVertical: spacing.lg,
  },
  stepItem: { alignItems: 'center', gap: 4 },
  stepCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.bgCardLight, borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  stepDone:   { backgroundColor: colors.gold, borderColor: colors.gold },
  stepNum: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  stepLabel: { color: colors.textMuted, fontSize: fontSize.xs },
  stepLabelActive: { color: colors.gold, fontWeight: fontWeight.semibold },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.border, marginBottom: 16, marginHorizontal: 4 },
  stepLineDone: { backgroundColor: colors.gold },
  scroll: { paddingHorizontal: spacing.base, paddingBottom: 120 },
  stepContent: {},
  sectionTitle: {
    color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.base,
  },
  payOption: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.border,
    padding: spacing.base, marginBottom: spacing.md,
  },
  payOptionActive: { borderColor: colors.gold, backgroundColor: '#1A1200' },
  payLabel: { color: colors.textSecondary, fontSize: fontSize.base, fontWeight: fontWeight.medium },
  payRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  payRadioActive: { borderColor: colors.gold },
  payRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold },
  recapCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.base, marginBottom: spacing.md,
  },
  recapTitle: { color: colors.gold, fontSize: fontSize.base, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
  recapLine: { color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: 2 },
  orderItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  orderItemName: { flex: 1, color: colors.textPrimary, fontSize: fontSize.sm },
  orderItemQty: { color: colors.textMuted, fontSize: fontSize.sm, marginHorizontal: spacing.md },
  orderItemPrice: { color: colors.gold, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  totalsCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.base, marginTop: spacing.md,
  },
  grandRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: spacing.md, marginTop: spacing.xs,
  },
  grandLabel: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  grandValue: { color: colors.gold, fontSize: fontSize.xl, fontWeight: fontWeight.black },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.base, paddingBottom: 36,
    backgroundColor: colors.bg,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
});
