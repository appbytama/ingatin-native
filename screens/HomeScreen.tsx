import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bell, ListChecks } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { getUpcomingReminders, setReminderStatus, snoozeReminder, deleteReminder } from '../lib/reminders';
import { getActiveChecklists } from '../lib/checklists';
import type { Reminder, Checklist } from '../lib/types';
import ReminderTimeline from '../components/ReminderTimeline';
import ChecklistCard from '../components/ChecklistCard';
import { useTheme, space, radius, fontSize, type Theme } from '../lib/theme';

// Mirrors the PWA's Home page ("/", read off its live DOM): greeting, a
// timeline of reminders due in the next 24h grouped by date, and a
// checklist summary section. Unlike the PWA, this app has no separate
// detail page yet, so snooze/delete stay as inline row actions instead of
// opening a detail sheet.
export default function HomeScreen({ userId, onOpenBabel }: { userId: string; onOpenBabel: () => void }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [nickname, setNickname] = useState('kamu');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([getUpcomingReminders(), getActiveChecklists()]);
      setReminders(r);
      setChecklists(c);
    } catch {
      // Home is a summary view — a failed refresh just leaves it stale,
      // reminders/checklist tabs are still reachable to see the real error.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata ?? {};
      setNickname(meta.nickname || data.user?.email?.split('@')[0] || 'kamu');
    });
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.color.primary} />}
    >
      <View style={styles.greetingBlock}>
        <Text style={styles.greeting}>Halo, {nickname} 👋</Text>
        <Text style={styles.subtitle}>Aku Ingatin, asisten yang siap 24 jam buat kamu.</Text>
      </View>

      <View>
        <View style={styles.sectionHeading}>
          <Bell size={15} color={theme.color.textMuted} />
          <Text style={styles.sectionHeadingText}>Jadwal {nickname} 24 Jam ke Depan</Text>
        </View>

        {reminders.length === 0 ? (
          <Text style={styles.emptyCard} onPress={onOpenBabel}>
            Belum ada reminder dalam 24 jam ke depan. Chat sama aku buat bikin satu 👋
          </Text>
        ) : (
          <ReminderTimeline
            reminders={reminders}
            onToggleDone={handleToggleDone}
            onSnooze={handleSnooze}
            onDelete={handleDelete}
          />
        )}
      </View>

      <View>
        <View style={styles.sectionHeading}>
          <ListChecks size={15} color={theme.color.textMuted} />
          <Text style={styles.sectionHeadingText}>Daftar Checklist Kamu</Text>
        </View>
        {checklists.length === 0 ? (
          <Text style={styles.emptyCard} onPress={onOpenBabel}>
            Belum ada checklist aktif. Diskusi checklist apa yang perlu disiapin bareng aku 📋
          </Text>
        ) : (
          checklists.map((c) => <ChecklistCard key={c.id} checklist={c} onChanged={load} />)
        )}
      </View>
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.color.background,
    },
    content: {
      padding: space.lg,
      gap: space.xxl,
    },
    greetingBlock: {
      gap: 2,
    },
    greeting: {
      fontSize: fontSize.lg,
      fontWeight: '600',
      color: theme.color.text,
    },
    subtitle: {
      fontSize: fontSize.sm,
      color: theme.color.textMuted,
    },
    sectionHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.xs + 2,
      marginBottom: space.sm,
    },
    sectionHeadingText: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: theme.color.textMuted,
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
      overflow: 'hidden',
    },
  });
}
