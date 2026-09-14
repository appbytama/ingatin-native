import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { setReminderStatus } from '../lib/reminders';
import type { Reminder } from '../lib/types';
import { useTheme, space, radius, fontSize, type Theme } from '../lib/theme';

export type MissedReminderData = Pick<Reminder, 'id' | 'title' | 'due_at'>;

// "Lewat 40 menit" / "Lewat 2 jam" / "Lewat 3 hari" — coarse on purpose,
// mirrors the PWA's formatOverdueBy exactly (missed-reminders-banner.tsx).
function formatOverdueBy(dueAtIso: string): string {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(dueAtIso).getTime()) / 60_000));
  if (minutes < 60) return `Lewat ${minutes} menit`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Lewat ${hours} jam`;
  const days = Math.round(hours / 24);
  return `Lewat ${days} hari`;
}

function MissedRow({ item, onChanged }: { item: MissedReminderData; onChanged: () => void }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [pending, setPending] = useState(false);

  async function markDone() {
    setPending(true);
    try {
      await setReminderStatus(item.id, 'done');
      onChanged();
    } catch (err) {
      Alert.alert('Gagal', err instanceof Error ? err.message : 'Gagal mengubah status.');
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.rowOverdue}>{formatOverdueBy(item.due_at)}</Text>
      </View>
      <Pressable style={styles.rowButton} onPress={markDone} disabled={pending}>
        <Text style={styles.rowButtonText}>{pending ? '…' : 'Selesai'}</Text>
      </Pressable>
    </View>
  );
}

// Mirrors the PWA's MissedRemindersBanner exactly — a persistent amber
// block (not dismissible, unlike the popup) listing reminders that fired
// but never got marked done, the app's own safety net for missed push
// delivery (over getMissedReminders, already in lib/reminders.ts).
export default function MissedRemindersBanner({ items, onChanged }: { items: MissedReminderData[]; onChanged: () => void }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  if (items.length === 0) return null;

  return (
    <View style={styles.banner}>
      <View>
        <Text style={styles.headerTitle}>{items.length === 1 ? '1 pengingat kelewat' : `${items.length} pengingat kelewat`}</Text>
        <Text style={styles.headerSubtitle}>Notifikasinya mungkin gak sampai. Cek di sini.</Text>
      </View>
      <View style={styles.list}>
        {items.map((item) => (
          <MissedRow key={item.id} item={item} onChanged={onChanged} />
        ))}
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    banner: {
      gap: space.sm,
      backgroundColor: theme.color.warningBg,
      borderRadius: radius.card,
      padding: space.sm + 4,
    },
    headerTitle: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: theme.color.warningText,
    },
    headerSubtitle: {
      fontSize: fontSize.xs,
      color: theme.color.warningText,
    },
    list: {
      gap: space.xs + 2,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space.sm,
      backgroundColor: theme.color.surface,
      borderRadius: 8,
      paddingHorizontal: space.sm + 2,
      paddingVertical: space.xs + 4,
    },
    rowText: {
      flex: 1,
      minWidth: 0,
    },
    rowTitle: {
      fontSize: fontSize.sm,
      color: theme.color.text,
    },
    rowOverdue: {
      fontSize: fontSize.xs,
      color: theme.color.warningText,
    },
    rowButton: {
      backgroundColor: theme.color.surface,
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: 8,
      paddingHorizontal: space.sm + 2,
      paddingVertical: space.xs + 2,
    },
    rowButtonText: {
      fontSize: fontSize.xs,
      fontWeight: '500',
      color: theme.color.textMuted,
    },
  });
}
