import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { supabase } from './lib/supabase';

// Fase 0-1 sanity check only: confirms the app can reach the same Supabase
// project the PWA uses (env vars correct, network path works) before any
// real auth/UI gets built. An unauthenticated client hitting an RLS-scoped
// table is expected to succeed with an empty array, not an error — that's
// what "connected" looks like here.
export default function App() {
  const [status, setStatus] = useState('Menghubungkan ke Supabase...');

  useEffect(() => {
    supabase
      .from('reminders')
      .select('id')
      .limit(1)
      .then(({ error }) => {
        setStatus(error ? `Gagal: ${error.message}` : 'Konek ke Supabase OK ✅');
      });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ingatin Native</Text>
      <Text>{status}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
});
