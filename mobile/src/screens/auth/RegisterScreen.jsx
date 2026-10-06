import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackgroundCanvas from '../../components/auth/BackgroundCanvas';
import AuthCard         from '../../components/auth/AuthCard';
import AuthInput        from '../../components/auth/AuthInput';
import AuthButton       from '../../components/auth/AuthButton';
import SocialRow        from '../../components/auth/SocialRow';
import Logo             from '../../components/ui/Logo';
import { colors }       from '../../theme/colors';
import { fontSize, fontWeight } from '../../theme/typography';
import { spacing }      from '../../theme/spacing';
import { useAuthStore } from '../../store/authStore';

export default function RegisterScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const errorShake = useRef(new Animated.Value(0)).current;

  const emailRef   = useRef(null);
  const passRef    = useRef(null);
  const confirmRef = useRef(null);

  const { register, loading, error: storeError, clearError } = useAuthStore();

  const set = (key) => (val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const shake = () =>
    Animated.sequence([
      Animated.timing(errorShake, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 5,  duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start();

  const validate = () => {
    const e = {};
    if (!form.name.trim())
      e.name = 'Full name is required';
    if (!form.email.trim())
      e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email))
      e.email = 'Enter a valid email address';
    if (!form.password)
      e.password = 'Password is required';
    else if (form.password.length < 6)
      e.password = 'Minimum 6 characters';
    if (!form.confirm)
      e.confirm = 'Please confirm your password';
    else if (form.password !== form.confirm)
      e.confirm = 'Passwords do not match';
    setErrors(e);
    if (Object.keys(e).length > 0) shake();
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    clearError();
    if (!validate()) return;
    const ok = await register(form.name.trim(), form.email.trim().toLowerCase(), form.password);
    if (ok) {
      navigation.replace('MainTabs');
    } else {
      shake();
    }
  };

  const handleSocialPress = (provider) => {
    alert(`${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in requires OAuth configuration.`);
  };

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
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Logo */}
          <View style={styles.logoArea}>
            <Logo size={90} />
          </View>

          {/* Headline */}
          <View style={styles.headlineArea}>
            <Text style={styles.greeting}>Join HookaDrop</Text>
            <Text style={styles.title}>Create Account</Text>
          </View>

          {/* Form card */}
          <Animated.View style={{ transform: [{ translateX: errorShake }] }}>
            <AuthCard>
              {storeError ? (
                <View style={styles.apiError}>
                  <Text style={styles.apiErrorText}>{storeError}</Text>
                </View>
              ) : null}

              <AuthInput
                label="Full Name"
                value={form.name}
                onChangeText={set('name')}
                placeholder="John Doe"
                autoCapitalize="words"
                autoComplete="name"
                leftIcon="person-outline"
                error={errors.name}
                onSubmitEditing={() => emailRef.current?.focus()}
                returnKeyType="next"
              />

              <AuthInput
                inputRef={emailRef}
                label="Email"
                value={form.email}
                onChangeText={set('email')}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoComplete="email"
                leftIcon="mail-outline"
                error={errors.email}
                onSubmitEditing={() => passRef.current?.focus()}
                returnKeyType="next"
              />

              <AuthInput
                inputRef={passRef}
                label="Password"
                value={form.password}
                onChangeText={set('password')}
                placeholder="••••••••"
                secureTextEntry
                leftIcon="lock-closed-outline"
                error={errors.password}
                onSubmitEditing={() => confirmRef.current?.focus()}
                returnKeyType="next"
              />

              <AuthInput
                inputRef={confirmRef}
                label="Confirm Password"
                value={form.confirm}
                onChangeText={set('confirm')}
                placeholder="••••••••"
                secureTextEntry
                leftIcon="lock-closed-outline"
                error={errors.confirm}
                onSubmitEditing={handleRegister}
                returnKeyType="done"
              />

              <AuthButton
                title="Create Account"
                onPress={handleRegister}
                loading={loading}
                size="lg"
                style={styles.mainBtn}
              />

              <SocialRow onPress={handleSocialPress} />
            </AuthCard>
          </Animated.View>

          {/* Footer */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.footer}
            activeOpacity={0.7}
          >
            <Text style={styles.footerText}>Already have an account?  </Text>
            <Text style={styles.footerLink}>Sign In</Text>
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
    paddingHorizontal: spacing.lg,
  },
  logoArea: { alignItems: 'center', marginBottom: spacing.lg },
  headlineArea: { marginBottom: spacing.xl },
  greeting: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.black,
    letterSpacing: -0.5,
  },
  apiError: {
    backgroundColor: '#1A0000',
    borderWidth: 1,
    borderColor: `${colors.error}50`,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  apiErrorText: { color: colors.error, fontSize: fontSize.sm, textAlign: 'center' },
  mainBtn: { marginTop: spacing.sm },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  footerText: { color: colors.textMuted, fontSize: fontSize.sm },
  footerLink: { color: colors.gold, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});
