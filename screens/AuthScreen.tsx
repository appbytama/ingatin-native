import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { signInWithGoogle } from '../lib/googleAuth';

export default function AuthScreen() {
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
    <View style={styles.container}>
      <Text style={styles.title}>Ingatin</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable
        style={styles.primaryButton}
        onPress={handleEmailSubmit}
        disabled={loading || !email || !password}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>
            {mode === 'login' ? 'Masuk' : 'Daftar'}
          </Text>
        )}
      </Pressable>

      <Pressable
        style={styles.googleButton}
        onPress={handleGoogleSubmit}
        disabled={loading}
      >
        <Text style={styles.googleButtonText}>Lanjut dengan Google</Text>
      </Pressable>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Pressable
        onPress={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          setMessage(null);
        }}
      >
        <Text style={styles.switchModeText}>
          {mode === 'login'
            ? 'Belum punya akun? Daftar'
            : 'Sudah punya akun? Masuk'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#111',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  googleButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  googleButtonText: {
    fontWeight: '600',
  },
  message: {
    color: '#b00020',
    textAlign: 'center',
  },
  switchModeText: {
    color: '#555',
    marginTop: 8,
  },
});
