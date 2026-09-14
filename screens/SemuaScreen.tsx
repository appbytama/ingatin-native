import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bell, ChevronDown, KeyRound, ListChecks } from 'lucide-react-native';
import { getAllReminders, setReminderStatus, joinReminderByCode, getChecklistRefsByIds, getTripRefsByIds } from '../lib/reminders';
import { getActiveChecklists } from '../lib/checklists';
import type { Reminder, Checklist } from '../lib/types';
import ReminderTimeline from '../components/ReminderTimeline';
import ReminderRow from '../components/ReminderRow';
import EventReminderGroup from '../components/EventReminderGroup';
import ChecklistCard from '../components/ChecklistCard';
import JoinByCodeForm from '../components/JoinByCodeForm';
import { useTheme, space, radius, fontSize, iconSize, type Theme } from '../lib/theme';

type Tab = 'reminder' | 'checklist';

interface EventGroupRef {
  title: string;
  icon: string;
}

// Mirrors the PWA's groupReminders (src/app/(app)/semua/page.tsx): splits
// the DONE reminders (only — active ones stay a flat ReminderTimeline) into
// Event Mode chains (grouped by whichever of linked_checklist_id/
// linked_trip_id is set, keyed so a checklist id and trip id can't collide)
// versus plain standalone ones.
function groupDoneReminders(reminders: Reminder[], refByKey: Map<string, EventGroupRef>) {
  const standalone: Reminder[] = [];
  const groups = new Map<string, { ref: EventGroupRef; reminders: Reminder[] }>();

  for (const r of reminders) {
    const key = r.linked_checklist_id ? `checklist:${r.linked_checklist_id}` : r.linked_trip_id ? `trip:${r.linked_trip_id}` : null;
    const ref = key ? refByKey.get(key) : undefined;
    if (key && r.event_stage && ref) {
      if (!groups.has(key)) groups.set(key, { ref, reminders: [] });
      groups.get(key)!.reminders.push(r);
    } else {
      standalone.push(r);
    }
  }

  return { standalone, groups: [...groups.entries()].map(([key, g]) => ({ key, ...g })) };
}

// Mirrors the PWA's "/semua" page (read off its live DOM): a sticky
// segmented Reminder/Checklist toggle (with count badges) above a
// dashed join-by-code card and the list itself. The Reminder tab splits
// pending vs done reminders exactly like the PWA — done ones collapse into
// a "N reminder selesai" disclosure with Event Mode chains grouped.
export default function SemuaScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [tab, setTab] = useState<Tab>('reminder');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [refByKey, setRefByKey] = useState<Map<string, EventGroupRef>>(new Map());
  const [doneOpen, setDoneOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([getAllReminders(), getActiveChecklists()]);
      setReminders(r);
      setChecklists(c);

      const map = new Map<string, EventGroupRef>();
      for (const cl of c) map.set(`checklist:${cl.id}`, { title: cl.title, icon: cl.categories?.icon || '📅' });

      const eventReminders = r.filter((row) => row.event_stage);
      const missingChecklistIds = [
        ...new Set(eventReminders.filter((row) => row.linked_checklist_id && !map.has(`checklist:${row.linked_checklist_id}`)).map((row) => row.linked_checklist_id!)),
      ];
      const tripIds = [...new Set(eventReminders.filter((row) => row.linked_trip_id).map((row) => row.linked_trip_id!))];
      const [extraChecklists, trips] = await Promise.all([
        getChecklistRefsByIds(missingChecklistIds),
        getTripRefsByIds(tripIds),
      ]);
      for (const cl of extraChecklists) map.set(`checklist:${cl.id}`, { title: cl.title, icon: cl.icon });
      for (const t of trips) map.set(`trip:${t.id}`, { title: t.title, icon: '✈️' });
      setRefByKey(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggleDone(reminder: Reminder) {
    await setReminderStatus(reminder.id, reminder.status === 'done' ? 'pending' : 'done');
    load();
  }

  const pendingReminders = reminders.filter((r) => r.status === 'pending' || r.status === 'snoozed');
  const doneReminders = reminders.filter((r) => r.status === 'done' || r.status === 'skipped');
  const doneGrouped = groupDoneReminders(doneReminders, refByKey);

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
          {pendingReminders.length > 0 && (
            <View style={[styles.countBadge, tab === 'reminder' && styles.countBadgeActive]}>
              <Text style={[styles.countBadgeText, tab === 'reminder' && styles.toggleTextActive]}>{pendingReminders.length}</Text>
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
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.color.primary} />}
        >
          <JoinByCodeForm onJoin={(code) => joinReminderByCode(code).then((r) => ({ title: r.reminderTitle }))} onJoined={load} />

          {pendingReminders.length === 0 ? (
            !loading && <Text style={styles.empty}>Tidak ada reminder aktif.</Text>
          ) : (
            <ReminderTimeline reminders={pendingReminders} onToggleDone={handleToggleDone} onChanged={load} />
          )}

          {doneReminders.length > 0 && (
            <View style={styles.doneSection}>
              <Pressable style={styles.doneToggle} onPress={() => setDoneOpen((v) => !v)}>
                <Text style={styles.doneToggleText}>{doneReminders.length} reminder selesai</Text>
                <ChevronDown size={14} color={theme.color.textMuted} style={doneOpen ? styles.chevronOpen : undefined} />
              </Pressable>
              {doneOpen && (
                <View style={styles.doneList}>
                  {doneGrouped.groups.map(({ key, ref, reminders: groupReminders }) => (
                    <EventReminderGroup key={key} title={ref.title} icon={ref.icon} reminders={groupReminders} onChanged={load} />
                  ))}
                  {doneGrouped.standalone.map((r) => (
                    <ReminderRow key={r.id} reminder={r} onToggleDone={() => handleToggleDone(r)} onChanged={load} showDate />
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={checklists}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <Pressable
              style={styles.checklistJoinStub}
              onPress={() => Alert.alert('Segera hadir', 'Gabung checklist pakai kode belum tersedia di sini.')}
            >
              <KeyRound size={iconSize.sm} color={theme.color.textMuted} />
              <Text style={styles.checklistJoinStubText}>Punya kode undangan? Gabung di sini</Text>
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
    empty: {
      textAlign: 'center',
      color: theme.color.textMuted,
      fontSize: fontSize.sm,
      marginTop: space.xl,
    },
    checklistJoinStub: {
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
    checklistJoinStubText: {
      fontSize: fontSize.xs,
      fontWeight: '500',
      color: theme.color.textMuted,
    },
    doneSection: {
      marginTop: space.sm,
    },
    doneToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.xs,
      paddingVertical: space.xs,
    },
    doneToggleText: {
      fontSize: fontSize.xs,
      color: theme.color.textMuted,
    },
    chevronOpen: {
      transform: [{ rotate: '180deg' }],
    },
    doneList: {
      marginTop: space.sm,
      gap: space.sm,
    },
  });
}
