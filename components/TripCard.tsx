import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Plane } from 'lucide-react-native';
import type { Trip } from '../lib/types';
import { useTheme, space, radius, fontSize, iconSize, type Theme } from '../lib/theme';

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
      borderRadius: radius.lg,
      padding: space.lg,
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
      fontSize: fontSize.md,
      fontWeight: '700',
      color: theme.color.text,
    },
    subtitle: {
      fontSize: fontSize.xs,
      color: theme.color.textMuted,
      marginTop: 2,
    },
  });
}
