import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, ChevronRight } from 'lucide-react-native';
import type { Reminder } from '../lib/types';
import { formatReminderTime, formatReminderDueAt } from '../lib/format';
import ReminderDetail from './ReminderDetail';
import { useTheme, space, radius, fontSize, type Theme } from '../lib/theme';

// Mirrors the PWA's reminder-item.tsx exactly (read off its live DOM +
// source): checkbox, a tappable title/time area that expands the full
// ReminderItemBody in place below (border-top separator, no modal), and a
// rotating chevron — snooze/delete/edit/share all live inside that expanded
// body now, not as always-visible icon buttons on the collapsed row (that
// was this app's own invention, not something the PWA actually does).
export default function ReminderRow({
  reminder,
  onToggleDone,
  onChanged,
  showDate = false,
}: {
  reminder: Reminder;
  onToggleDone: () => void;
  onChanged: () => void;
  showDate?: boolean;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const isDone = reminder.status === 'done';
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.row}>
          <Pressable
            style={[styles.checkbox, isDone && styles.checkboxChecked]}
            onPress={onToggleDone}
            hitSlop={10}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isDone }}
            accessibilityLabel={isDone ? 'Tandai belum selesai' : 'Tandai selesai'}
          >
            {isDone && <Check size={14} color={theme.color.onPrimary} strokeWidth={3} />}
          </Pressable>

          <Pressable style={styles.body} onPress={() => setExpanded((v) => !v)}>
            {!showDate && <Text style={styles.timeBadge}>{formatReminderTime(reminder.due_at)}</Text>}
            <Text style={[styles.title, isDone && styles.titleDone]} numberOfLines={1}>
              {reminder.categories ? `${reminder.categories.icon} ` : ''}
              {reminder.title}
            </Text>
            {showDate && (
              <Text style={styles.dateText}>
                {formatReminderDueAt(reminder.due_at)}
                {reminder.event_stage ? ` · ${reminder.event_stage}` : ''}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => setExpanded((v) => !v)}
            hitSlop={10}
            accessibilityLabel={expanded ? 'Tutup detail' : 'Buka detail'}
          >
            <ChevronRight
              size={16}
              color={theme.color.chevron}
              style={expanded ? styles.chevronOpen : undefined}
            />
          </Pressable>
        </View>

        {expanded && <ReminderDetail id={reminder.id} onCollapse={() => setExpanded(false)} onChanged={onChanged} />}
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      marginBottom: space.sm,
    },
    card: {
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: theme.color.border,
      backgroundColor: theme.color.surface,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      paddingHorizontal: space.md,
      paddingVertical: space.md,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.color.checkboxBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: theme.color.primary,
      borderColor: theme.color.primary,
    },
    body: {
      flex: 1,
      minWidth: 0,
    },
    timeBadge: {
      alignSelf: 'flex-start',
      marginBottom: 4,
      borderRadius: radius.badge,
      backgroundColor: theme.color.primarySoftBg,
      color: theme.color.primarySoftText,
      paddingHorizontal: space.sm,
      paddingVertical: 2,
      fontSize: fontSize.xs,
      fontWeight: '600',
      overflow: 'hidden',
    },
    title: {
      fontSize: fontSize.sm,
      fontWeight: '500',
      color: theme.color.text,
    },
    titleDone: {
      textDecorationLine: 'line-through',
      color: theme.color.textMuted,
    },
    dateText: {
      fontSize: fontSize.xs,
      color: theme.color.textMuted,
      marginTop: 2,
    },
    chevronOpen: {
      transform: [{ rotate: '90deg' }],
    },
  });
}
