import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Bell, KeyRound, ListChecks } from 'lucide-react-native';
import { getAllReminders, setReminderStatus, snoozeReminder, deleteReminder } from '../lib/reminders';
import { getActiveChecklists } from '../lib/checklists';
import type { Reminder, Checklist } from '../lib/types';
import ReminderRow from '../components/ReminderRow';
import ChecklistCard from '../components/ChecklistCard';
import { useTheme, space, radius, fontSize, iconSize, type Theme } from '../lib/theme';

type Tab = 'reminder' | 'checklist';

// Mirrors the PWA's "/semua" page (read off its live DOM): a sticky
// segmented Reminder/Checklist toggle (with count badges) above a
// dashed join-by-code card and the list itself.
export default function SemuaScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [tab, setTab] = useState<Tab>('reminder');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([getAllReminders(), getActiveChecklists()]);
      setReminders(r);
      setChecklists(c);
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

  function handleJoinByCode() {
    // Checklist/reminder invite-code joining isn't wired up yet (only Trip
    // sharing is, via lib/trips.ts's claim_trip_invite) — the PWA's
    // equivalent RPCs (claim_checklist_invite/claim_reminder_invite) exist
    // server-side but this app has no join function calling them yet.
    Alert.alert('Segera hadir', 'Gabung checklist/reminder pakai kode belum tersedia di sini.');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Semua</Text>

      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleButton, tab === 'reminder' ? styles.toggleActive : styles.toggleInactive]}
          onPress={() => setTab('reminder')}
        >
          <Bell size={15} color={tab === 'reminder' ? theme.color.onPrimary : theme.color.textMuted} />
          <Text style={[styles.toggleText, tab === 'reminder' ? styles.toggleTextActive : styles.toggleTextInactive]}>
            Reminder
          </Text>
          {reminders.length > 0 && (
            <View style={[styles.countBadge, tab === 'reminder' && styles.countBadgeActive]}>
              <Text style={[styles.countBadgeText, tab === 'reminder' && styles.toggleTextActive]}>{reminders.length}</Text>
            </View>
          )}
        </Pressable>
        <Pressable
          style={[styles.toggleButton, tab === 'checklist' ? styles.toggleActive : styles.toggleInactive]}
          onPress={() => setTab('checklist')}
        >
          <ListChecks size={15} color={tab === 'checklist' ? theme.color.onPrimary : theme.color.textMuted} />
          <Text style={[styles.toggleText, tab === 'checklist' ? styles.toggleTextActive : styles.toggleTextInactive]}>
            Checklist
          </Text>
          {checklists.length > 0 && (
            <View style={[styles.countBadge, tab === 'checklist' && styles.countBadgeActive]}>
              <Text style={[styles.countBadgeText, tab === 'checklist' && styles.toggleTextActive]}>{checklists.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {tab === 'reminder' ? (
        <FlatList
          data={reminders}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <Pressable style={styles.joinCard} onPress={handleJoinByCode}>
              <KeyRound size={iconSize.sm} color={theme.color.textMuted} />
              <Text style={styles.joinCardText}>Punya kode undangan? Gabung di sini</Text>
            </Pressable>
          }
          ListEmptyComponent={!loading ? <Text style={styles.empty}>Tidak ada reminder aktif.</Text> : null}
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
      ) : (
        <FlatList
          data={checklists}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <Pressable style={styles.joinCard} onPress={handleJoinByCode}>
              <KeyRound size={iconSize.sm} color={theme.color.textMuted} />
              <Text style={styles.joinCardText}>Punya kode undangan? Gabung di sini</Text>
            </Pressable>
          }
          ListEmptyComponent={!loading ? <Text style={styles.empty}>Belum ada checklist aktif.</Text> : null}
          renderItem={({ item }) => <ChecklistCard checklist={item} onChanged={load} />}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.color.primary} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.color.background,
    },
    pageTitle: {
      fontSize: fontSize.lg,
      fontWeight: '600',
      color: theme.color.text,
      paddingHorizontal: space.lg,
      paddingTop: space.lg,
      paddingBottom: space.sm,
    },
    toggleRow: {
      flexDirection: 'row',
      gap: space.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.color.border,
      backgroundColor: theme.color.background,
      paddingHorizontal: space.lg,
      paddingBottom: space.sm,
    },
    toggleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      paddingVertical: space.sm - 2,
      minHeight: 36,
    },
    toggleActive: {
      backgroundColor: theme.color.primary,
    },
    toggleInactive: {
      backgroundColor: theme.color.surface,
      borderWidth: 1,
      borderColor: theme.color.border,
    },
    toggleText: {
      fontSize: fontSize.sm,
      fontWeight: '500',
    },
    toggleTextActive: {
      color: theme.color.onPrimary,
    },
    toggleTextInactive: {
      color: theme.color.textMuted,
    },
    countBadge: {
      borderRadius: radius.pill,
      paddingHorizontal: 6,
      paddingVertical: 1,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    countBadgeActive: {},
    countBadgeText: {
      fontSize: fontSize.xs,
    },
    listContent: {
      padding: space.lg,
    },
    joinCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space.xs + 2,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.color.borderDashed,
      borderRadius: radius.card,
      paddingVertical: space.sm + 2,
      marginBottom: space.md,
    },
    joinCardText: {
      fontSize: fontSize.xs,
      fontWeight: '500',
      color: theme.color.textMuted,
    },
    empty: {
      textAlign: 'center',
      color: theme.color.textMuted,
      fontSize: fontSize.sm,
      marginTop: space.xl,
    },
  });
}
