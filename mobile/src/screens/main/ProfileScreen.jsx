import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { colors } from '../../theme/colors';
import { fontSize, fontWeight } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { useAuthStore } from '../../store/authStore';

const MENU_ITEMS = [
  { id: 'orders',    icon: 'receipt-outline',       label: 'My Orders',      screen: 'Orders' },
  { id: 'wishlist',  icon: 'heart-outline',          label: 'Wishlist',       screen: 'Wishlist' },
  { id: 'addresses', icon: 'location-outline',       label: 'My Addresses',   screen: null },
  { id: 'notifs',    icon: 'notifications-outline',  label: 'Notifications',  screen: null },
  { id: 'support',   icon: 'headset-outline',        label: 'Support',        screen: null },
  { id: 'about',     icon: 'information-circle-outline', label: 'About',      screen: null },
];

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, logout, updateProfile, loading } = useAuthStore();

  const [editing, setEditing]   = useState(false);
  const [name, setName]         = useState(user?.name || '');
  const [phone, setPhone]       = useState(user?.phone || '');

  const handleSave = async () => {
    await updateProfile({ name, phone });
    setEditing(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.replace('Login');
        },
      },
    ]);
  };

  const initials = (user?.name || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <LinearGradient
          colors={['#1A1200', '#0A0A0A']}
          style={styles.profileHeader}
        >
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.avatar}>
              <Text style={styles.initials}>{initials}</Text>
            </LinearGradient>
            {!editing && (
              <TouchableOpacity style={styles.editBadge} onPress={() => setEditing(true)}>
                <Ionicons name="pencil" size={14} color={colors.black} />
              </TouchableOpacity>
            )}
          </View>

          {!editing ? (
            <>
              <Text style={styles.userName}>{user?.name || 'User'}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </>
          ) : (
            <View style={styles.editForm}>
              <Input
                value={name}
                onChangeText={setName}
                placeholder="Full name"
                autoCapitalize="words"
                style={{ marginBottom: spacing.sm }}
              />
              <Input
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone number"
                keyboardType="phone-pad"
              />
              <View style={styles.editBtns}>
                <Button title="Cancel" variant="outline" onPress={() => setEditing(false)} style={{ flex: 1 }} />
                <Button title="Save"   onPress={handleSave} loading={loading} style={{ flex: 1 }} />
              </View>
            </View>
          )}
        </LinearGradient>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatBox icon="receipt-outline"  label="Orders"   value="0" onPress={() => navigation.navigate('Orders')} />
          <StatBox icon="heart-outline"    label="Wishlist"  value="0" onPress={() => navigation.navigate('Wishlist')} />
          <StatBox icon="location-outline" label="Addresses" value="0" />
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => item.screen && navigation.navigate(item.screen)}
              activeOpacity={0.75}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={20} color={colors.gold} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <View style={styles.logoutSection}>
          <Button
            title="Logout"
            variant="outline"
            onPress={handleLogout}
            style={styles.logoutBtn}
            textStyle={{ color: colors.error }}
          />
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

function StatBox({ icon, label, value, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={statStyles.box} activeOpacity={0.75}>
      <Ionicons name={icon} size={22} color={colors.gold} />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const statStyles = StyleSheet.create({
  box: {
    flex: 1, alignItems: 'center', gap: 4,
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.base,
  },
  value: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  label: { color: colors.textMuted, fontSize: fontSize.xs },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  profileHeader: {
    alignItems: 'center', paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.base, marginBottom: spacing.base,
  },
  avatarWrap: { position: 'relative', marginBottom: spacing.md },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.gold, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 10,
  },
  initials: { color: colors.black, fontSize: fontSize['2xl'], fontWeight: fontWeight.black },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.gold, borderWidth: 2, borderColor: colors.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  userName: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  userEmail: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 4 },
  editForm: { width: '100%', marginTop: spacing.md },
  editBtns: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  statsRow: {
    flexDirection: 'row', gap: spacing.md,
    paddingHorizontal: spacing.base, marginBottom: spacing.xl,
  },
  menu: {
    marginHorizontal: spacing.base,
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.base,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  menuIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: colors.bgCardLight,
    borderWidth: 1, borderColor: colors.borderGold,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, color: colors.textPrimary, fontSize: fontSize.base },
  logoutSection: { paddingHorizontal: spacing.base, marginTop: spacing.xl },
  logoutBtn: {
    borderColor: colors.error + '60',
    backgroundColor: '#1A000010',
  },
});
