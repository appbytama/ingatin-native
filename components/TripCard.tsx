import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Plane } from 'lucide-react-native';
import type { Trip } from '../lib/types';
import { useTheme, space, radius, fontSize, iconSize, type Theme } from '../lib/theme';

// Same bordered-card treatment confirmed on the PWA's reminder/checklist
// cards (rounded-xl, border, surface bg) — the trip list card itself wasn't
// separately inspected, so this applies the same already-verified pattern
// rather than a fresh guess.
export default function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const theme = useTheme();
  const styles = makeStyles(theme);

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      <View style={styles.titleRow}>
        <Plane size={iconSize.sm} color={theme.color.primary} />
        <Text style={styles.title}>{trip.title}</Text>
      </View>
      {trip.destination && <Text style={styles.subtitle}>{trip.destination}</Text>}
      {(trip.start_date || trip.end_date) && (
        <Text style={styles.subtitle}>
          {trip.start_date ?? '?'} – {trip.end_date ?? '?'}
        </Text>
      )}
    </Pressable>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.color.surface,
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: radius.card,
      padding: space.md,
      marginBottom: space.sm,
    },
    cardPressed: {
      opacity: 0.7,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.xs,
    },
    title: {
      fontSize: fontSize.sm,
      fontWeight: '500',
      color: theme.color.text,
    },
    subtitle: {
      fontSize: fontSize.xs,
      color: theme.color.textMuted,
      marginTop: 2,
    },
  });
}
