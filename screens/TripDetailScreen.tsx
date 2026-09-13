import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import {
  addExpense,
  addItineraryItem,
  createTripInvite,
  deleteItineraryItem,
  getTripDetail,
  setExpenseShareSettled,
  type TripDetail,
} from '../lib/trips';

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('id-ID', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function toDateString(d: Date) {
  return d.toISOString().slice(0, 10);
}

function rupiah(amount: number) {
  return `Rp${amount.toLocaleString('id-ID')}`;
}

export default function TripDetailScreen({ tripId, onBack }: { tripId: string; onBack: () => void }) {
  const [detail, setDetail] = useState<TripDetail | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [itemTitle, setItemTitle] = useState('');
  const [itemDay, setItemDay] = useState<Date>(new Date());
  // No time-of-day picker for v1 — itinerary items are day-grouped, and
  // adding a second (optional) time picker didn't earn its complexity yet.

  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  const load = useCallback(async () => {
    try {
      setDetail(await getTripDetail(tripId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat trip.');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    load();
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [load]);

  async function handleInvite() {
    try {
      const code = await createTripInvite(tripId);
      Share.share({ message: `Gabung trip "${detail?.trip.title}" di Ingatin pakai kode: ${code}` });
    } catch (err) {
      Alert.alert('Gagal', err instanceof Error ? err.message : 'Gagal membuat kode undangan.');
    }
  }

  function pickItineraryDay() {
    DateTimePickerAndroid.open({
      value: itemDay,
      mode: 'date',
      onChange: (_e, picked) => picked && setItemDay(picked),
    });
  }

  async function handleAddItineraryItem() {
    if (!itemTitle.trim()) return;
    try {
      await addItineraryItem(tripId, {
        dayDate: toDateString(itemDay),
        timeOfDay: null,
        title: itemTitle.trim(),
      });
      setItemTitle('');
      load();
    } catch (err) {
      Alert.alert('Gagal', err instanceof Error ? err.message : 'Gagal menambah itinerary.');
    }
  }

  async function handleAddExpense() {
    const amount = parseInt(expenseAmount.replace(/\D/g, ''), 10);
    if (!expenseDesc.trim() || !amount || !detail || !userId) return;
    const shareUserIds = [detail.trip.owner_id, ...detail.members.map((m) => m.user_id)];
    try {
      await addExpense(tripId, {
        description: expenseDesc.trim(),
        amountTotal: amount,
        payerId: userId,
        shareUserIds: [...new Set(shareUserIds)],
      });
      setExpenseDesc('');
      setExpenseAmount('');
      load();
    } catch (err) {
      Alert.alert('Gagal', err instanceof Error ? err.message : 'Gagal menambah pengeluaran.');
    }
  }

  if (loading || !detail) {
    return (
      <View style={styles.container}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>← Kembali</Text>
        </Pressable>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }

  const { trip, members, itinerary, expenses, nicknames } = detail;
  const isOwner = trip.owner_id === userId;
  const nameOf = (id: string) => (id === userId ? 'Kamu' : nicknames[id] ?? id.slice(0, 8));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack}>
        <Text style={styles.back}>← Kembali</Text>
      </Pressable>

      <Text style={styles.title}>🧳 {trip.title}</Text>
      {trip.destination && <Text style={styles.subtitle}>{trip.destination}</Text>}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Anggota</Text>
          <Pressable onPress={handleInvite}>
            <Text style={styles.linkText}>+ Undang</Text>
          </Pressable>
        </View>
        <Text style={styles.memberList}>
          {nameOf(trip.owner_id)} (organizer){members.length > 0 ? ', ' : ''}
          {members.map((m) => nameOf(m.user_id)).join(', ')}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Itinerary</Text>
        {itinerary.map((item) => (
          <View key={item.id} style={styles.itineraryRow}>
            <Text style={styles.itineraryDay}>{formatDate(item.day_date)}</Text>
            <Text style={styles.itineraryText}>
              {item.time_of_day ? `${item.time_of_day} — ` : ''}
              {item.title}
            </Text>
            <Pressable onPress={() => deleteItineraryItem(item.id).then(load)} hitSlop={8}>
              <Text style={styles.itemDelete}>✕</Text>
            </Pressable>
          </View>
        ))}

        <View style={styles.addForm}>
          {Platform.OS === 'android' ? (
            <Pressable style={styles.dateButton} onPress={pickItineraryDay}>
              <Text style={styles.dateButtonText}>{toDateString(itemDay)}</Text>
            </Pressable>
          ) : (
            <DateTimePicker
              value={itemDay}
              mode="date"
              display="compact"
              onChange={(_e, picked) => picked && setItemDay(picked)}
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Kegiatan, cth: Check-in hotel"
            value={itemTitle}
            onChangeText={setItemTitle}
            onSubmitEditing={handleAddItineraryItem}
          />
          <Pressable style={styles.addButton} onPress={handleAddItineraryItem} disabled={!itemTitle.trim()}>
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pengeluaran</Text>
        {expenses.map((expense) => {
          const perShare = Math.round(expense.amount_total / Math.max(expense.trip_expense_shares.length, 1));
          const canSettle = isOwner || expense.payer_id === userId;
          return (
            <View key={expense.id} style={styles.expenseCard}>
              <Text style={styles.expenseTitle}>
                {expense.description} — {rupiah(expense.amount_total)}
              </Text>
              <Text style={styles.expenseSubtitle}>
                Dibayar {expense.payer_id ? nameOf(expense.payer_id) : '?'} · {rupiah(perShare)}/orang
              </Text>
              {expense.trip_expense_shares.map((share) => (
                <View key={share.user_id} style={styles.shareRow}>
                  <Text style={styles.shareName}>{nameOf(share.user_id)}</Text>
                  {canSettle ? (
                    <Pressable
                      onPress={() =>
                        setExpenseShareSettled(expense.id, share.user_id, !share.settled_at).then(load)
                      }
                    >
                      <Text style={styles.shareStatus}>{share.settled_at ? '✅ Lunas' : 'Belum lunas'}</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.shareStatus}>{share.settled_at ? '✅ Lunas' : 'Belum lunas'}</Text>
                  )}
                </View>
              ))}
            </View>
          );
        })}

        <View style={styles.addForm}>
          <TextInput
            style={styles.input}
            placeholder="Keterangan, cth: Hotel malam 1"
            value={expenseDesc}
            onChangeText={setExpenseDesc}
          />
          <TextInput
            style={styles.input}
            placeholder="Jumlah (Rp)"
            keyboardType="numeric"
            value={expenseAmount}
            onChangeText={setExpenseAmount}
            onSubmitEditing={handleAddExpense}
          />
          <Pressable
            style={styles.addButton}
            onPress={handleAddExpense}
            disabled={!expenseDesc.trim() || !expenseAmount}
          >
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>Dibagi rata ke semua anggota trip, kamu sebagai pembayar.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  back: {
    color: '#666',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: '#777',
    marginBottom: 8,
  },
  error: {
    color: '#b00020',
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  linkText: {
    color: '#2563eb',
    fontSize: 13,
  },
  memberList: {
    fontSize: 13,
    color: '#444',
  },
  itineraryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itineraryDay: {
    fontSize: 11,
    color: '#888',
    width: 64,
  },
  itineraryText: {
    flex: 1,
    fontSize: 13,
  },
  itemDelete: {
    color: '#999',
    paddingHorizontal: 4,
  },
  addForm: {
    gap: 8,
    marginTop: 10,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
  },
  dateButtonText: {
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  addButton: {
    backgroundColor: '#111',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  expenseCard: {
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  expenseTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  expenseSubtitle: {
    fontSize: 11,
    color: '#777',
    marginBottom: 4,
  },
  shareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  shareName: {
    fontSize: 12,
  },
  shareStatus: {
    fontSize: 12,
    color: '#2563eb',
  },
  hint: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
});
