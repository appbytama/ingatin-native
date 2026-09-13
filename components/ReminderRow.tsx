import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, Clock, Trash2 } from 'lucide-react-native';
import type { Reminder } from '../lib/types';
import { formatReminderTime } from '../lib/format';
import { useTheme, space, radius, fontSize, iconSize, type Theme } from '../lib/theme';

// Mirrors the PWA's reminder card exactly (read off its live DOM,
// D:\APP\ingatin src/components/reminders/reminder-item.tsx's rendered
// output): rounded-xl bordered card, rounded-md time badge, medium-weight
// title. The PWA's own checked-state classes weren't directly observed
// (never toggled one during inspection) — filled-indigo-on-check below
// follows the same fill-on-active convention verified elsewhere (segmented
// toggle, checklist item accent), not a separate guess.
export default function ReminderRow({
  reminder,
  onToggleDone,
  onSnooze,
  onDelete,
}: {
  reminder: Reminder;
  onToggleDone: () => void;
  onSnooze: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const isDone = reminder.status === 'done';

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

          <View style={styles.body}>
            <Text style={styles.timeBadge}>{formatReminderTime(reminder.due_at)}</Text>
            <Text style={[styles.title, isDone && styles.titleDone]} numberOfLines={1}>
              {reminder.categories ? `${reminder.categories.icon} ` : ''}
              {reminder.title}
            </Text>
          </View>

          {!isDone && (
            <View style={styles.actions}>
              <Pressable onPress={onSnooze} hitSlop={10} style={styles.actionButton} accessibilityLabel="Tunda 10 menit">
                <Clock size={iconSize.md} color={theme.color.chevron} />
              </Pressable>
              <Pressable onPress={onDelete} hitSlop={10} style={styles.actionButton} accessibilityLabel="Hapus reminder">
                <Trash2 size={iconSize.md} color={theme.color.chevron} />
              </Pressable>
            </View>
          )}
        </View>
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
    actions: {
      flexDirection: 'row',
      gap: space.xs,
    },
    actionButton: {
      padding: space.xs,
    },
  });
}
