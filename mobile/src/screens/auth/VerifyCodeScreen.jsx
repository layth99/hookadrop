import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BackgroundCanvas from '../../components/auth/BackgroundCanvas';
import AuthCard         from '../../components/auth/AuthCard';
import AuthButton       from '../../components/auth/AuthButton';
import AuthOtpInput     from '../../components/auth/AuthOtpInput';
import BackBtn          from '../../components/auth/BackBtn';
import { colors }       from '../../theme/colors';
import { fontSize, fontWeight } from '../../theme/typography';
import { spacing }      from '../../theme/spacing';
import { authService }  from '../../services/authService';

const RESEND_COOLDOWN = 60;

export default function VerifyCodeScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const email  = route?.params?.email || '';

  const [otp, setOtp]           = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);

  const otpRef = useRef(null);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleVerify = async () => {
    if (otp.length < 4) { setError('Please enter the 4-digit code'); return; }
    setError('');
    setLoading(true);
    try {
      await authService.verifyCode(email, otp);
      navigation.navigate('NewPassword', { email, code: otp });
    } catch (err) {
      setError(err.message || 'Invalid or expired code. Please try again.');
      otpRef.current?.clear();
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || resending) return;
    setResending(true);
    setError('');
    try {
      await authService.forgotPassword(email);
      otpRef.current?.clear();
      setOtp('');
      setCountdown(RESEND_COOLDOWN);
      setCanResend(false);
    } catch {
      // Silent — same generic message to avoid enumeration
    } finally {
      setResending(false);
    }
  };

  // Mask email for display: jo**@gmail.com
  const maskedEmail = email.replace(/(.{2})(.+)(@.+)/, (_, a, b, c) =>
    `${a}${'*'.repeat(Math.min(b.length, 4))}${c}`
  );

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
            <Ionicons name="shield-checkmark-outline" size={32} color={colors.gold} />
          </View>

          {/* Headline */}
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.sub}>
            We sent a 4-digit code to{'\n'}
            <Text style={styles.emailText}>{maskedEmail}</Text>
          </Text>

          <AuthCard>
            {/* OTP Input */}
            <View style={styles.otpWrap}>
              <AuthOtpInput
                ref={otpRef}
                length={4}
                onComplete={(code) => { setOtp(code); setError(''); }}
                onChangeCode={(code) => { setOtp(code); if (code.length < 4) setError(''); }}
              />
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorWrap}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <AuthButton
              title="Verify Code"
              onPress={handleVerify}
              loading={loading}
              disabled={otp.length < 4}
              size="lg"
              style={styles.btn}
            />

            {/* Resend */}
            <View style={styles.resendRow}>
              <Text style={styles.resendLabel}>Didn't receive the code? </Text>
              {canResend ? (
                <TouchableOpacity onPress={handleResend} disabled={resending}>
                  <Text style={[styles.resendLink, resending && { opacity: 0.5 }]}>
                    {resending ? 'Sending…' : 'Resend'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.resendTimer}>
                  Resend in {countdown}s
                </Text>
              )}
            </View>
          </AuthCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </BackgroundCanvas>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg },
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
  emailText: {
    color: colors.gold,
    fontWeight: fontWeight.semibold,
  },
  otpWrap: {
    paddingVertical: spacing.base,
    marginBottom: spacing.base,
  },
  errorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.base,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
    flex: 1,
  },
  btn: { marginTop: spacing.xs },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  resendLabel: { color: colors.textMuted, fontSize: fontSize.sm },
  resendLink: {
    color: colors.gold,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  resendTimer: {
    color: colors.goldDim,
    fontSize: fontSize.sm,
  },
});
