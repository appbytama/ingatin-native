import { StyleSheet, Text, View } from 'react-native';
import type { Reminder } from '../lib/types';
import { formatDateHeader, jakartaDateKey, relativeDayLabel } from '../lib/format';
import ReminderRow from './ReminderRow';
import { useTheme, space, radius, fontSize, type Theme } from '../lib/theme';

function groupByDate(reminders: Reminder[]) {
  const map = new Map<string, Reminder[]>();
  for (const r of reminders) {
    const key = jakartaDateKey(r.due_at);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return [...map.entries()].map(([dateKey, items]) => ({ dateKey, items }));
}

// Shared between HomeScreen and SemuaScreen — both group reminders by date
// with the same connecting-line/dot timeline (read off the PWA's live DOM;
// its Home and "/semua" pages use the identical markup for this).
export default function ReminderTimeline({
  reminders,
  onToggleDone,
  onChanged,
}: {
  reminders: Reminder[];
  onToggleDone: (reminder: Reminder) => void;
  onChanged: () => void;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const groups = groupByDate(reminders);

  if (groups.length === 0) return null;

  return (
    <View style={styles.timeline}>
      <View style={styles.timelineLine} />
      {groups.map((group) => {
        const relLabel = relativeDayLabel(group.dateKey);
        return (
          <View key={group.dateKey} style={styles.timelineGroup}>
            <View style={styles.timelineDot} />
            <View style={styles.dateHeaderRow}>
              <Text style={styles.dateHeaderText}>{formatDateHeader(group.dateKey)}</Text>
              {relLabel && (
                <View style={styles.relBadge}>
                  <Text style={styles.relBadgeText}>{relLabel}</Text>
                </View>
              )}
            </View>
            {group.items.map((item) => (
              <ReminderRow key={item.id} reminder={item} onToggleDone={() => onToggleDone(item)} onChanged={onChanged} />
            ))}
          </View>
        );
      })}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    timeline: {
      position: 'relative',
      paddingLeft: space.xl + space.xs,
      gap: space.lg,
    },
    timelineLine: {
      position: 'absolute',
      left: 7,
      top: 8,
      bottom: 8,
      width: 1,
      backgroundColor: theme.color.border,
    },
    timelineGroup: {
      position: 'relative',
    },
    timelineDot: {
      position: 'absolute',
      left: -(space.xl + space.xs) + 2,
      top: 4,
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: theme.color.background,
      backgroundColor: theme.color.checkboxBorder,
    },
    dateHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.xs + 2,
      marginBottom: space.sm,
    },
    dateHeaderText: {
      fontSize: fontSize.xs,
      fontWeight: '600',
      color: theme.color.primarySoftTextStrong,
    },
    relBadge: {
      borderRadius: radius.pill,
      backgroundColor: theme.color.primarySoftBgMid,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    relBadgeText: {
      fontSize: fontSize.tiny,
      fontWeight: '600',
      color: theme.color.primarySoftText,
    },
  });
}
