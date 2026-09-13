import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { createTrip, getTrips, joinTripByCode } from '../lib/trips';
import type { Trip } from '../lib/types';
import TripCard from '../components/TripCard';
import TripDetailScreen from './TripDetailScreen';

export default function TripsScreen() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setTrips(await getTrips());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat trip.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    const title = newTitle.trim();
    if (!title) return;
    try {
      const id = await createTrip({ title });
      setNewTitle('');
      await load();
      setSelectedTripId(id);
    } catch (err) {
      Alert.alert('Gagal', err instanceof Error ? err.message : 'Gagal membuat trip.');
    }
  }

  async function handleJoin() {
    if (!joinCode.trim()) return;
    try {
      const { tripId } = await joinTripByCode(joinCode);
      setJoinCode('');
      await load();
      setSelectedTripId(tripId);
    } catch (err) {
      Alert.alert('Gagal', err instanceof Error ? err.message : 'Kode undangan tidak valid.');
    }
  }

  if (selectedTripId) {
    return <TripDetailScreen tripId={selectedTripId} onBack={() => setSelectedTripId(null)} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <View style={styles.row}>
              <TextInput
                style={styles.input}
                placeholder="Trip baru, cth: Liburan Bali"
                value={newTitle}
                onChangeText={setNewTitle}
                onSubmitEditing={handleCreate}
              />
              <Pressable style={styles.button} onPress={handleCreate} disabled={!newTitle.trim()}>
                <Text style={styles.buttonText}>Buat</Text>
              </Pressable>
            </View>

            <View style={styles.row}>
              <TextInput
                style={styles.input}
                placeholder="Punya kode undangan?"
                autoCapitalize="characters"
                value={joinCode}
                onChangeText={setJoinCode}
                onSubmitEditing={handleJoin}
              />
              <Pressable style={styles.button} onPress={handleJoin} disabled={!joinCode.trim()}>
                <Text style={styles.buttonText}>Gabung</Text>
              </Pressable>
            </View>

            {error && <Text style={styles.error}>{error}</Text>}
            {!loading && trips.length === 0 && !error && (
              <Text style={styles.empty}>Belum ada trip. Buat atau gabung di atas.</Text>
            )}
          </View>
        }
        renderItem={({ item }) => <TripCard trip={item} onPress={() => setSelectedTripId(item.id)} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  button: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  error: {
    color: '#b00020',
    marginBottom: 8,
  },
  empty: {
    color: '#888',
    textAlign: 'center',
    marginTop: 24,
  },
});
