import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, Clock, Trash2 } from 'lucide-react-native';
import type { Reminder } from '../lib/types';
import { formatReminderDueAt } from '../lib/format';
import { useTheme, space, radius, fontSize, iconSize, type Theme } from '../lib/theme';

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
    <View style={[styles.row, isDone && styles.rowDone]}>
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
        <Text style={[styles.title, isDone && styles.titleDone]} numberOfLines={2}>
          {reminder.categories ? `${reminder.categories.icon} ` : ''}
          {reminder.title}
        </Text>
        <Text style={styles.dueAt}>{formatReminderDueAt(reminder.due_at)}</Text>
      </View>

      {!isDone && (
        <View style={styles.actions}>
          <Pressable onPress={onSnooze} hitSlop={10} style={styles.actionButton} accessibilityLabel="Tunda 10 menit">
            <Clock size={iconSize.md} color={theme.color.textMuted} />
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={10} style={styles.actionButton} accessibilityLabel="Hapus reminder">
            <Trash2 size={iconSize.md} color={theme.color.textMuted} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      paddingVertical: space.md,
      paddingHorizontal: space.md,
      borderRadius: radius.lg,
      backgroundColor: theme.color.surface,
      marginBottom: space.sm,
    },
    rowDone: {
      opacity: 0.55,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.color.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: theme.color.primary,
      borderColor: theme.color.primary,
    },
    body: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontSize: fontSize.base,
      fontWeight: '600',
      color: theme.color.text,
    },
    titleDone: {
      textDecorationLine: 'line-through',
      color: theme.color.textMuted,
    },
    dueAt: {
      fontSize: fontSize.xs,
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
