import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BackgroundCanvas from '../../components/auth/BackgroundCanvas';
import AuthCard         from '../../components/auth/AuthCard';
import AuthInput        from '../../components/auth/AuthInput';
import AuthButton       from '../../components/auth/AuthButton';
import BackBtn          from '../../components/auth/BackBtn';
import { colors }       from '../../theme/colors';
import { fontSize, fontWeight } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { authService }  from '../../services/authService';

export default function ForgotPasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [email, setEmail]     = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email.trim())               { setError('Email is required'); return false; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email address'); return false; }
    return true;
  };

  const handleSend = async () => {
    setError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim().toLowerCase());
      navigation.navigate('VerifyCode', { email: email.trim().toLowerCase() });
    } catch (err) {
      // Generic message to avoid account enumeration
      setError('If that email is registered, a code has been sent.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BackgroundCanvas style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <BackBtn onPress={() => navigation.goBack()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 72, paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Icon */}
          <View style={styles.iconWrap}>
            <Ionicons name="mail-outline" size={32} color={colors.gold} />
          </View>

          {/* Headline */}
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.sub}>
            Enter the email associated with your account and we'll send you a verification code.
          </Text>

          <AuthCard style={styles.card}>
            <AuthInput
              label="Email Address"
              value={email}
              onChangeText={(v) => { setEmail(v); setError(''); }}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoComplete="email"
              leftIcon="mail-outline"
              error={error}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />

            <AuthButton
              title="Send Code"
              onPress={handleSend}
              loading={loading}
              size="lg"
              style={styles.btn}
            />
          </AuthCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </BackgroundCanvas>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
  iconWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.goldBg,
    borderWidth: 1.5,
    borderColor: colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.black,
    letterSpacing: -0.3,
    marginBottom: spacing.md,
  },
  sub: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  card: {},
  btn: { marginTop: spacing.sm },
});
