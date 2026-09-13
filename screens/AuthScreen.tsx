import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { signInWithGoogle } from '../lib/googleAuth';
import { useTheme, space, radius, fontSize, type Theme } from '../lib/theme';

export default function AuthScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleEmailSubmit() {
    setLoading(true);
    setMessage(null);

    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (mode === 'register') {
      setMessage('Cek email kamu untuk konfirmasi akun.');
    }
  }

  async function handleGoogleSubmit() {
    setLoading(true);
    setMessage(null);

    try {
      await signInWithGoogle();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Ingatin</Text>
      <Text style={styles.tagline}>Kamu fokus menjalani. Aku yang ingat.</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={theme.color.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={theme.color.textMuted}
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
        />

        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, (loading || !email || !password) && styles.disabled]}
          onPress={handleEmailSubmit}
          disabled={loading || !email || !password}
        >
          {loading ? (
            <ActivityIndicator color={theme.color.onPrimary} />
          ) : (
            <Text style={styles.primaryButtonText}>{mode === 'login' ? 'Masuk' : 'Daftar'}</Text>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.googleButton, pressed && styles.pressed, loading && styles.disabled]}
          onPress={handleGoogleSubmit}
          disabled={loading}
        >
          <Text style={styles.googleButtonText}>Lanjut dengan Google</Text>
        </Pressable>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <Pressable
          hitSlop={10}
          onPress={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setMessage(null);
          }}
        >
          <Text style={styles.switchModeText}>
            {mode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.color.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: space.xxl,
    },
    title: {
      fontSize: fontSize.xl + 4,
      fontWeight: '700',
      color: theme.color.text,
    },
    tagline: {
      fontSize: fontSize.sm,
      color: theme.color.textMuted,
      marginTop: 4,
      marginBottom: space.xxl,
    },
    form: {
      width: '100%',
      gap: space.md,
    },
    input: {
      width: '100%',
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: radius.md,
      paddingHorizontal: space.md,
      paddingVertical: space.md,
      fontSize: fontSize.base,
      color: theme.color.text,
      backgroundColor: theme.color.surface,
      minHeight: 44,
    },
    primaryButton: {
      width: '100%',
      backgroundColor: theme.color.primary,
      borderRadius: radius.md,
      paddingVertical: space.md,
      alignItems: 'center',
      minHeight: 44,
      justifyContent: 'center',
    },
    pressed: {
      opacity: 0.85,
    },
    disabled: {
      opacity: 0.5,
    },
    primaryButtonText: {
      color: theme.color.onPrimary,
      fontWeight: '600',
      fontSize: fontSize.base,
    },
    googleButton: {
      width: '100%',
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: radius.md,
      paddingVertical: space.md,
      alignItems: 'center',
      minHeight: 44,
      justifyContent: 'center',
    },
    googleButtonText: {
      fontWeight: '600',
      color: theme.color.text,
      fontSize: fontSize.base,
    },
    message: {
      color: theme.color.destructive,
      textAlign: 'center',
      fontSize: fontSize.sm,
    },
    switchModeText: {
      color: theme.color.textMuted,
      marginTop: space.xs,
      textAlign: 'center',
      fontSize: fontSize.sm,
    },
  });
}
