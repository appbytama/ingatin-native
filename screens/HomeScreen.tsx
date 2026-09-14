import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bell, ListChecks } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { getUpcomingReminders, getMissedReminders, setReminderStatus } from '../lib/reminders';
import { getActiveChecklists } from '../lib/checklists';
import type { Reminder, Checklist } from '../lib/types';
import ReminderTimeline from '../components/ReminderTimeline';
import ChecklistCard from '../components/ChecklistCard';
import MissedRemindersBanner, { type MissedReminderData } from '../components/MissedRemindersBanner';
import MissedRemindersPopup from '../components/MissedRemindersPopup';
import { useTheme, space, radius, fontSize, type Theme } from '../lib/theme';

// Mirrors the PWA's Home page ("/", read off its live DOM): a missed-
// reminders popup + banner, greeting, a timeline of reminders due in the
// next 24h grouped by date, and a checklist summary section. The PWA also
// has a "Trip Kamu" section listing active trips here — deliberately not
// ported yet since it needs the same trip-selection plumbing Phase 4.4's
// Trip rebuild will introduce; tracked there, not duplicated ahead of it.
export default function HomeScreen({ userId, onOpenBabel }: { userId: string; onOpenBabel: () => void }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [nickname, setNickname] = useState('kamu');
  const [assistantName, setAssistantName] = useState('Ingatin');
  const [assistantAvatarUrl, setAssistantAvatarUrl] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [missedReminders, setMissedReminders] = useState<MissedReminderData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [r, c, missed] = await Promise.all([getUpcomingReminders(), getActiveChecklists(), getMissedReminders()]);
      setReminders(r);
      setChecklists(c);
      setMissedReminders(missed);
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
      setAssistantName(meta.assistant_name || 'Ingatin');
      setAssistantAvatarUrl(meta.assistant_avatar_url || null);
    });
  }, [load]);

  async function handleToggleDone(reminder: Reminder) {
    await setReminderStatus(reminder.id, reminder.status === 'done' ? 'pending' : 'done');
    load();
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.color.primary} />}
    >
      <MissedRemindersPopup items={missedReminders} assistantName={assistantName} assistantAvatarUrl={assistantAvatarUrl} />

      <View style={styles.greetingBlock}>
        <Text style={styles.greeting}>Halo, {nickname} 👋</Text>
        <Text style={styles.subtitle}>Aku {assistantName}, asisten yang siap 24 jam buat kamu.</Text>
      </View>

      <MissedRemindersBanner items={missedReminders} onChanged={load} />

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
          <ReminderTimeline reminders={reminders} onToggleDone={handleToggleDone} onChanged={load} />
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
