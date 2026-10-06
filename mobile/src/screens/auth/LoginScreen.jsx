import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar, Animated, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackgroundCanvas from '../../components/auth/BackgroundCanvas';
import AuthCard         from '../../components/auth/AuthCard';
import AuthInput        from '../../components/auth/AuthInput';
import AuthButton       from '../../components/auth/AuthButton';
import SocialRow        from '../../components/auth/SocialRow';
import Logo             from '../../components/ui/Logo';
import { colors }       from '../../theme/colors';
import { fontWeight }   from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { useAuthStore } from '../../store/authStore';

const { width, height } = Dimensions.get('window');

// Responsive type scale — bigger across the board
const T = {
  greeting: Math.max(width * 0.048, 17),
  title:    Math.max(width * 0.095, 34),
  label:    Math.max(width * 0.044, 16),
  input:    Math.max(width * 0.048, 17),
  forgot:   Math.max(width * 0.042, 15),
  footer:   Math.max(width * 0.042, 15),
  btn:      Math.max(width * 0.048, 17),
  divider:  Math.max(width * 0.038, 13),
};

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors]     = useState({});

  const passwordRef = useRef(null);
  const shakeAnim   = useRef(new Animated.Value(0)).current;

  const { login, loading, error: storeError, clearError } = useAuthStore();

  const shake = () =>
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 9,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -9, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 55, useNativeDriver: true }),
    ]).start();

  const validate = () => {
    const e = {};
    if (!email.trim())                          e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email))       e.email    = 'Enter a valid email address';
    if (!password)                              e.password = 'Password is required';
    else if (password.length < 6)              e.password = 'Minimum 6 characters';
    setErrors(e);
    if (Object.keys(e).length > 0) shake();
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    clearError();
    if (!validate()) return;
    const ok = await login(email.trim().toLowerCase(), password);
    if (ok) navigation.replace('MainTabs');
    else shake();
  };

  const handleSocialPress = (provider) => {
    alert(`${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in requires OAuth configuration.`);
  };

  // Logo size — scale with screen but cap
  const LOGO_SIZE = Math.min(Math.max(width * 0.38, 130), 175);

  return (
    <BackgroundCanvas style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* ── LOGO ──────────────────────────────────────────────── */}
          <View style={styles.logoArea}>
            <Logo size={LOGO_SIZE} />
          </View>

          {/* ── HEADLINE ─────────────────────────────────────────── */}
          <View style={styles.headlineArea}>
            <Text style={[styles.greeting, { fontSize: T.greeting }]}>
              Welcome back
            </Text>
            <Text style={[styles.title, { fontSize: T.title }]}>
              Sign In
            </Text>
          </View>

          {/* ── FORM CARD ────────────────────────────────────────── */}
          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            <AuthCard>

              {/* API error banner */}
              {storeError ? (
                <View style={styles.apiError}>
                  <Text style={[styles.apiErrorText, { fontSize: T.forgot }]}>
                    {storeError}
                  </Text>
                </View>
              ) : null}

              <AuthInput
                label="Email"
                labelSize={T.label}
                value={email}
                onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: '' })); }}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoComplete="email"
                leftIcon="mail-outline"
                error={errors.email}
                inputSize={T.input}
                onSubmitEditing={() => passwordRef.current?.focus()}
                returnKeyType="next"
              />

              <AuthInput
                inputRef={passwordRef}
                label="Password"
                labelSize={T.label}
                value={password}
                onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: '' })); }}
                placeholder="••••••••"
                secureTextEntry
                leftIcon="lock-closed-outline"
                error={errors.password}
                inputSize={T.input}
                onSubmitEditing={handleLogin}
                returnKeyType="done"
              />

              {/* Forgot password */}
              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                style={styles.forgotRow}
                hitSlop={{ top: 10, bottom: 10 }}
              >
                <Text style={[styles.forgotText, { fontSize: T.forgot }]}>
                  Forgot password?
                </Text>
              </TouchableOpacity>

              {/* Sign In button */}
              <AuthButton
                title="Sign In"
                onPress={handleLogin}
                loading={loading}
                size="lg"
                textSize={T.btn}
                style={styles.mainBtn}
              />

              <SocialRow
                onPress={handleSocialPress}
                dividerSize={T.divider}
              />
            </AuthCard>
          </Animated.View>

          {/* ── FOOTER ────────────────────────────────────────────── */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={styles.footer}
            activeOpacity={0.7}
          >
            <Text style={[styles.footerText, { fontSize: T.footer }]}>
              Don't have an account?{'  '}
            </Text>
            <Text style={[styles.footerLink, { fontSize: T.footer }]}>
              Create one
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </BackgroundCanvas>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: width * 0.055,
  },

  logoArea: {
    alignItems: 'center',
    marginBottom: height * 0.025,
  },

  headlineArea: {
    alignItems: 'center',
    marginBottom: height * 0.025,
  },
  greeting: {
    color: colors.textSecondary,
    letterSpacing: 0.3,
    marginBottom: 4,
    textAlign: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontWeight: fontWeight.black,
    letterSpacing: -0.5,
    textAlign: 'center',
  },

  apiError: {
    backgroundColor: '#1A0000',
    borderWidth: 1,
    borderColor: `${colors.error}50`,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  apiErrorText: {
    color: colors.error,
    textAlign: 'center',
  },

  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: height * 0.018,
  },
  forgotText: {
    color: colors.goldWarm,
    fontWeight: fontWeight.medium,
  },

  mainBtn: { marginTop: 2 },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: height * 0.025,
  },
  footerText: { color: colors.textMuted },
  footerLink: {
    color: colors.gold,
    fontWeight: fontWeight.semibold,
  },
});
