import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Reminder } from '../lib/types';
import { formatReminderDueAt } from '../lib/format';

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
  const isDone = reminder.status === 'done';

  return (
    <View style={[styles.row, isDone && styles.rowDone]}>
      <Pressable style={styles.checkbox} onPress={onToggleDone} hitSlop={8}>
        <Text style={styles.checkboxMark}>{isDone ? '✓' : ''}</Text>
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
          <Pressable onPress={onSnooze} hitSlop={8} style={styles.actionButton}>
            <Text style={styles.actionIcon}>⏰</Text>
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={8} style={styles.actionButton}>
            <Text style={styles.actionIcon}>🗑️</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f7f7f7',
    marginBottom: 8,
  },
  rowDone: {
    opacity: 0.5,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#999',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMark: {
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  titleDone: {
    textDecorationLine: 'line-through',
  },
  dueAt: {
    fontSize: 12,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    padding: 4,
  },
  actionIcon: {
    fontSize: 16,
  },
});
