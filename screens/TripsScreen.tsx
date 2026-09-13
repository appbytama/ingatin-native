import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { History, KeyRound, Plus } from 'lucide-react-native';
import { createTrip, getTrips, joinTripByCode } from '../lib/trips';
import type { Trip } from '../lib/types';
import TripCard from '../components/TripCard';
import TripDetailScreen from './TripDetailScreen';
import { useTheme, space, radius, fontSize, iconSize, type Theme } from '../lib/theme';

type Panel = null | 'create' | 'join';

// Mirrors the PWA's "/trip" page (read off its live DOM): title + a
// Baru/Gabung/Riwayat button row, dashed empty-state card. The PWA's "Baru"
// button likely opens its own form/dialog (not inspected) — here it toggles
// an inline field, reusing the create/join logic already built. "Riwayat"
// (archived trips) has no screen yet, so it's a stub for now.
export default function TripsScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<Panel>(null);
  const [newTitle, setNewTitle] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setTrips(await getTrips());
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
      setPanel(null);
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
      setPanel(null);
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
            <Text style={styles.pageTitle}>Ngetrip</Text>

            <View style={styles.actionRow}>
              <Pressable
                style={[styles.actionButton, styles.actionPrimary]}
                onPress={() => setPanel(panel === 'create' ? null : 'create')}
              >
                <Plus size={14} color={theme.color.primarySoftText} />
                <Text style={styles.actionPrimaryText}>Baru</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.actionSecondary]}
                onPress={() => setPanel(panel === 'join' ? null : 'join')}
              >
                <KeyRound size={14} color={theme.color.textMuted} />
                <Text style={styles.actionSecondaryText}>Gabung</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.actionSecondary]}
                onPress={() => Alert.alert('Riwayat trip', 'Belum tersedia.')}
              >
                <History size={14} color={theme.color.textMuted} />
                <Text style={styles.actionSecondaryText}>Riwayat</Text>
              </Pressable>
            </View>

            {panel === 'create' && (
              <View style={styles.inlineRow}>
                <TextInput
                  style={styles.inlineInput}
                  placeholder="Nama trip, cth: Liburan Bali"
                  placeholderTextColor={theme.color.textMuted}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  onSubmitEditing={handleCreate}
                  autoFocus
                />
                <Pressable style={[styles.inlineButton, !newTitle.trim() && styles.inlineButtonDisabled]} onPress={handleCreate} disabled={!newTitle.trim()}>
                  <Plus size={iconSize.sm} color={theme.color.onPrimary} />
                </Pressable>
              </View>
            )}
            {panel === 'join' && (
              <View style={styles.inlineRow}>
                <TextInput
                  style={styles.inlineInput}
                  placeholder="Kode undangan"
                  placeholderTextColor={theme.color.textMuted}
                  autoCapitalize="characters"
                  value={joinCode}
                  onChangeText={setJoinCode}
                  onSubmitEditing={handleJoin}
                  autoFocus
                />
                <Pressable style={[styles.inlineButton, !joinCode.trim() && styles.inlineButtonDisabled]} onPress={handleJoin} disabled={!joinCode.trim()}>
                  <KeyRound size={iconSize.sm} color={theme.color.onPrimary} />
                </Pressable>
              </View>
            )}

            {!loading && trips.length === 0 && (
              <Text style={styles.emptyCard}>Belum ada trip. Bikin satu buat mulai rencanain bareng temen-temen.</Text>
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
    pageTitle: {
      fontSize: fontSize.lg,
      fontWeight: '600',
      color: theme.color.text,
      marginBottom: space.md,
    },
    actionRow: {
      flexDirection: 'row',
      gap: space.xs + 2,
      marginBottom: space.md,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: radius.button,
      paddingHorizontal: space.sm + 2,
      paddingVertical: space.sm - 1,
      minHeight: 36,
    },
    actionPrimary: {
      backgroundColor: theme.color.primarySoftBg,
    },
    actionPrimaryText: {
      color: theme.color.primarySoftText,
      fontSize: fontSize.xs,
      fontWeight: '500',
    },
    actionSecondary: {
      backgroundColor: theme.color.surfaceMuted,
    },
    actionSecondaryText: {
      color: theme.color.textMuted,
      fontSize: fontSize.xs,
      fontWeight: '500',
    },
    inlineRow: {
      flexDirection: 'row',
      gap: space.sm,
      marginBottom: space.md,
    },
    inlineInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: radius.button,
      paddingHorizontal: space.md,
      paddingVertical: space.sm + 2,
      fontSize: fontSize.sm,
      color: theme.color.text,
      backgroundColor: theme.color.surface,
      minHeight: 44,
    },
    inlineButton: {
      width: 44,
      height: 44,
      borderRadius: radius.button,
      backgroundColor: theme.color.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inlineButtonDisabled: {
      opacity: 0.5,
    },
    emptyCard: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.color.border,
      borderRadius: radius.card,
      paddingHorizontal: space.md,
      paddingVertical: space.lg,
      textAlign: 'center',
      fontSize: fontSize.sm,
      color: theme.color.textMuted,
    },
  });
}
