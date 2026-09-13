import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export default function HomeScreen({ session }: { session: Session }) {
  const [connectionStatus, setConnectionStatus] = useState('Menghubungkan ke Supabase...');

  useEffect(() => {
    supabase
      .from('reminders')
      .select('id')
      .limit(1)
      .then(({ error }) => {
        setConnectionStatus(error ? `Gagal: ${error.message}` : 'Konek ke Supabase OK ✅');
      });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ingatin Native</Text>
      <Text>Masuk sebagai {session.user.email}</Text>
      <Text>{connectionStatus}</Text>
      <Pressable style={styles.signOutButton} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.signOutText}>Keluar</Text>
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
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  signOutButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  signOutText: {
    fontWeight: '600',
  },
});
