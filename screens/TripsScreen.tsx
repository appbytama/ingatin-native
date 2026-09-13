import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Plus, Ticket } from 'lucide-react-native';
import { createTrip, getTrips, joinTripByCode } from '../lib/trips';
import type { Trip } from '../lib/types';
import TripCard from '../components/TripCard';
import TripDetailScreen from './TripDetailScreen';
import { useTheme, space, radius, fontSize, iconSize, type Theme } from '../lib/theme';

export default function TripsScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
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
                placeholderTextColor={theme.color.textMuted}
                value={newTitle}
                onChangeText={setNewTitle}
                onSubmitEditing={handleCreate}
              />
              <Pressable
                style={[styles.button, !newTitle.trim() && styles.buttonDisabled]}
                onPress={handleCreate}
                disabled={!newTitle.trim()}
                accessibilityLabel="Buat trip"
              >
                <Plus size={iconSize.md} color={theme.color.onPrimary} />
              </Pressable>
            </View>

            <View style={styles.row}>
              <TextInput
                style={styles.input}
                placeholder="Punya kode undangan?"
                placeholderTextColor={theme.color.textMuted}
                autoCapitalize="characters"
                value={joinCode}
                onChangeText={setJoinCode}
                onSubmitEditing={handleJoin}
              />
              <Pressable
                style={[styles.button, !joinCode.trim() && styles.buttonDisabled]}
                onPress={handleJoin}
                disabled={!joinCode.trim()}
                accessibilityLabel="Gabung trip"
              >
                <Ticket size={iconSize.md} color={theme.color.onPrimary} />
              </Pressable>
            </View>

            {error && <Text style={styles.error}>{error}</Text>}
            {!loading && trips.length === 0 && !error && (
              <Text style={styles.empty}>Belum ada trip. Buat atau gabung di atas.</Text>
            )}
          </View>
        }
        renderItem={({ item }) => <TripCard trip={item} onPress={() => setSelectedTripId(item.id)} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.color.primary} />}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.color.background,
    },
    listContent: {
      padding: space.lg,
    },
    row: {
      flexDirection: 'row',
      gap: space.sm,
      marginBottom: space.sm + 2,
    },
    input: {
      flex: 1,
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
    button: {
      backgroundColor: theme.color.primary,
      borderRadius: radius.md,
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    error: {
      color: theme.color.destructive,
      marginBottom: space.sm,
      fontSize: fontSize.sm,
    },
    empty: {
      color: theme.color.textMuted,
      textAlign: 'center',
      marginTop: space.xxl,
      fontSize: fontSize.sm,
    },
  });
}
