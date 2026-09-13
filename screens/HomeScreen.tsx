import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { getAllReminders, setReminderStatus, snoozeReminder, deleteReminder } from '../lib/reminders';
import type { Reminder } from '../lib/types';
import QuickAddReminder from '../components/QuickAddReminder';
import ReminderRow from '../components/ReminderRow';
import { useTheme, space, fontSize, type Theme } from '../lib/theme';

export default function HomeScreen({ userId }: { userId: string }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setReminders(await getAllReminders());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat reminder.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggleDone(reminder: Reminder) {
    try {
      await setReminderStatus(reminder.id, reminder.status === 'done' ? 'pending' : 'done');
      load();
    } catch (err) {
      Alert.alert('Gagal', err instanceof Error ? err.message : 'Gagal mengubah status.');
    }
  }

  async function handleSnooze(reminder: Reminder) {
    try {
      await snoozeReminder(reminder.id, new Date(Date.now() + 10 * 60_000).toISOString());
      load();
    } catch (err) {
      Alert.alert('Gagal', err instanceof Error ? err.message : 'Gagal menunda reminder.');
    }
  }

  function handleDelete(reminder: Reminder) {
    Alert.alert('Hapus reminder?', reminder.title, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReminder(reminder.id);
            load();
          } catch (err) {
            Alert.alert('Gagal', err instanceof Error ? err.message : 'Gagal menghapus reminder.');
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reminders}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <QuickAddReminder userId={userId} onCreated={load} />

            {error && <Text style={styles.error}>{error}</Text>}
            {!loading && reminders.length === 0 && !error && (
              <Text style={styles.empty}>Belum ada reminder. Tambahin di atas.</Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <ReminderRow
            reminder={item}
            onToggleDone={() => handleToggleDone(item)}
            onSnooze={() => handleSnooze(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
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
