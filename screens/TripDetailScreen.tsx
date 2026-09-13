import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { ArrowLeft, CalendarDays, CheckCircle2, Plane, Plus, UserPlus, X } from 'lucide-react-native';
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
import { useTheme, space, radius, fontSize, iconSize, type Theme } from '../lib/theme';

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
  const theme = useTheme();
  const styles = makeStyles(theme);
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
        <Pressable onPress={onBack} style={styles.backRow} hitSlop={10}>
          <ArrowLeft size={iconSize.md} color={theme.color.textMuted} />
          <Text style={styles.back}>Kembali</Text>
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
      <Pressable onPress={onBack} style={styles.backRow} hitSlop={10}>
        <ArrowLeft size={iconSize.md} color={theme.color.textMuted} />
        <Text style={styles.back}>Kembali</Text>
      </Pressable>

      <View style={styles.titleRow}>
        <Plane size={iconSize.lg} color={theme.color.primary} />
        <Text style={styles.title}>{trip.title}</Text>
      </View>
      {trip.destination && <Text style={styles.subtitle}>{trip.destination}</Text>}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Anggota</Text>
          <Pressable onPress={handleInvite} style={styles.linkRow} hitSlop={8}>
            <UserPlus size={14} color={theme.color.primarySoftTextStrong} />
            <Text style={styles.linkText}>Undang</Text>
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
            <Pressable onPress={() => deleteItineraryItem(item.id).then(load)} hitSlop={10} accessibilityLabel="Hapus kegiatan">
              <X size={14} color={theme.color.textMuted} />
            </Pressable>
          </View>
        ))}

        <View style={styles.addForm}>
          {Platform.OS === 'android' ? (
            <Pressable style={styles.dateButton} onPress={pickItineraryDay}>
              <CalendarDays size={iconSize.sm} color={theme.color.textMuted} />
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
          <View style={styles.inlineAddRow}>
            <TextInput
              style={[styles.input, styles.inlineInput]}
              placeholder="Kegiatan, cth: Check-in hotel"
              placeholderTextColor={theme.color.textMuted}
              value={itemTitle}
              onChangeText={setItemTitle}
              onSubmitEditing={handleAddItineraryItem}
            />
            <Pressable
              style={[styles.addButton, !itemTitle.trim() && styles.addButtonDisabled]}
              onPress={handleAddItineraryItem}
              disabled={!itemTitle.trim()}
              accessibilityLabel="Tambah kegiatan"
            >
              <Plus size={iconSize.sm} color={theme.color.onPrimary} />
            </Pressable>
          </View>
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
                      style={styles.shareStatusRow}
                      onPress={() => setExpenseShareSettled(expense.id, share.user_id, !share.settled_at).then(load)}
                      hitSlop={6}
                    >
                      {share.settled_at && <CheckCircle2 size={13} color={theme.color.primarySoftTextStrong} />}
                      <Text style={styles.shareStatus}>{share.settled_at ? 'Lunas' : 'Belum lunas'}</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.shareStatusRow}>
                      {share.settled_at && <CheckCircle2 size={13} color={theme.color.primarySoftTextStrong} />}
                      <Text style={styles.shareStatus}>{share.settled_at ? 'Lunas' : 'Belum lunas'}</Text>
                    </View>
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
            placeholderTextColor={theme.color.textMuted}
            value={expenseDesc}
            onChangeText={setExpenseDesc}
          />
          <View style={styles.inlineAddRow}>
            <TextInput
              style={[styles.input, styles.inlineInput]}
              placeholder="Jumlah (Rp)"
              placeholderTextColor={theme.color.textMuted}
              keyboardType="numeric"
              value={expenseAmount}
              onChangeText={setExpenseAmount}
              onSubmitEditing={handleAddExpense}
            />
            <Pressable
              style={[styles.addButton, (!expenseDesc.trim() || !expenseAmount) && styles.addButtonDisabled]}
              onPress={handleAddExpense}
              disabled={!expenseDesc.trim() || !expenseAmount}
              accessibilityLabel="Tambah pengeluaran"
            >
              <Plus size={iconSize.sm} color={theme.color.onPrimary} />
            </Pressable>
          </View>
        </View>
        <Text style={styles.hint}>Dibagi rata ke semua anggota trip, kamu sebagai pembayar.</Text>
      </View>
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.color.background,
    },
    content: {
      padding: space.lg,
      paddingBottom: space.xxl + space.lg,
    },
    backRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: space.sm,
      alignSelf: 'flex-start',
    },
    back: {
      color: theme.color.textMuted,
      fontSize: fontSize.sm,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.xs,
    },
    title: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: theme.color.text,
    },
    subtitle: {
      color: theme.color.textMuted,
      marginBottom: space.sm,
      fontSize: fontSize.sm,
    },
    error: {
      color: theme.color.destructive,
    },
    section: {
      marginTop: space.xl,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitle: {
      fontSize: fontSize.sm,
      fontWeight: '700',
      marginBottom: space.sm,
      color: theme.color.text,
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    linkText: {
      color: theme.color.primarySoftTextStrong,
      fontSize: fontSize.sm,
      fontWeight: '600',
    },
    memberList: {
      fontSize: fontSize.sm,
      color: theme.color.textMuted,
    },
    itineraryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      paddingVertical: space.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.color.border,
    },
    itineraryDay: {
      fontSize: fontSize.tiny,
      color: theme.color.textMuted,
      width: 64,
    },
    itineraryText: {
      flex: 1,
      fontSize: fontSize.sm,
      color: theme.color.text,
    },
    addForm: {
      gap: space.sm,
      marginTop: space.sm + 2,
    },
    inlineAddRow: {
      flexDirection: 'row',
      gap: space.sm,
    },
    inlineInput: {
      flex: 1,
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.xs,
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: radius.button,
      padding: space.sm,
      minHeight: 40,
      alignSelf: 'flex-start',
    },
    dateButtonText: {
      fontSize: fontSize.sm,
      color: theme.color.text,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: radius.button,
      paddingHorizontal: space.sm + 2,
      paddingVertical: space.sm,
      fontSize: fontSize.sm,
      color: theme.color.text,
      backgroundColor: theme.color.surface,
      minHeight: 40,
    },
    addButton: {
      backgroundColor: theme.color.primary,
      borderRadius: radius.button,
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButtonDisabled: {
      opacity: 0.5,
    },
    expenseCard: {
      backgroundColor: theme.color.surface,
      borderRadius: radius.card,
      padding: space.sm + 2,
      marginBottom: space.sm,
    },
    expenseTitle: {
      fontSize: fontSize.sm,
      fontWeight: '700',
      color: theme.color.text,
    },
    expenseSubtitle: {
      fontSize: fontSize.tiny,
      color: theme.color.textMuted,
      marginBottom: space.xs,
    },
    shareRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 2,
    },
    shareName: {
      fontSize: fontSize.xs,
      color: theme.color.text,
    },
    shareStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    shareStatus: {
      fontSize: fontSize.xs,
      color: theme.color.primarySoftTextStrong,
      fontWeight: '600',
    },
    hint: {
      fontSize: fontSize.tiny,
      color: theme.color.textMuted,
      marginTop: space.xs,
    },
  });
}
