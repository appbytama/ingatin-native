import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Trip } from '../lib/types';

export default function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Text style={styles.title}>🧳 {trip.title}</Text>
      {trip.destination && <Text style={styles.subtitle}>{trip.destination}</Text>}
      {(trip.start_date || trip.end_date) && (
        <Text style={styles.subtitle}>
          {trip.start_date ?? '?'} – {trip.end_date ?? '?'}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f7f7f7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
});
