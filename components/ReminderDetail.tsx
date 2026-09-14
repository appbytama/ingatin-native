import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { AlarmClock, Check, ChevronUp, Pencil, Repeat, Users } from 'lucide-react-native';
import {
  createReminderInvite,
  deleteReminder,
  getReminderDetail,
  leaveSharedReminder,
  setReminderStatus,
  snoozeReminder,
  updateReminderDueAt,
  updateReminderTitle,
  type ReminderDetail as ReminderDetailData,
} from '../lib/reminders';
import { formatReminderDueAt } from '../lib/format';
import ShareInviteSheet from './ShareInviteSheet';
import type { RecurrenceRule } from '../lib/types';
import { useTheme, space, radius, fontSize, iconSize, type Theme } from '../lib/theme';

function recurrenceLabel(rule: RecurrenceRule): string {
  const unit = { day: 'hari', week: 'minggu', month: 'bulan', year: 'tahun' };
  switch (rule.type) {
    case 'daily':
      return 'Setiap hari';
    case 'weekly':
      return 'Setiap minggu';
    case 'monthly':
      return 'Setiap bulan';
    case 'yearly':
      return 'Setiap tahun';
    case 'interval':
      return `Tiap ${rule.interval_value} ${unit[rule.interval_unit ?? 'day']} sekali`;
    default:
      return '';
  }
}

// Mirrors the PWA's ReminderItemBody exactly (read off its live DOM +
// reminder-item-body.tsx source): full title + date/time, collaborator
// chips, notes, category/recurrence/status chips, a combined title+due-date
// edit form, Bagikan (own ShareInviteSheet), and owner-vs-collaborator
// action rows (Tandai selesai/Bagikan/Hapus vs Tandai selesai/Keluar), plus
// a snooze button shown whenever the reminder isn't done yet.
export default function ReminderDetail({ id, onCollapse, onChanged }: { id: string; onCollapse: () => void; onChanged: () => void }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [data, setData] = useState<ReminderDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [dueAtInput, setDueAtInput] = useState<Date | null>(null);
  const [showIosPicker, setShowIosPicker] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const load = () => getReminderDetail(id).then(setData).finally(() => setLoading(false));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function toggleDone() {
    if (!data) return;
    setPending(true);
    try {
      const next = data.reminder.status === 'done' ? 'pending' : 'done';
      await setReminderStatus(id, next);
      await load();
      onChanged();
    } finally {
      setPending(false);
    }
  }

  async function snooze10() {
    setPending(true);
    try {
      await snoozeReminder(id, new Date(Date.now() + 10 * 60_000).toISOString());
      await load();
      onChanged();
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    setPending(true);
    try {
      await deleteReminder(id);
      onChanged();
      onCollapse();
    } finally {
      setPending(false);
    }
  }

  async function handleLeave() {
    setPending(true);
    try {
      await leaveSharedReminder(id);
      onChanged();
      onCollapse();
    } finally {
      setPending(false);
    }
  }

  function startEdit() {
    if (!data) return;
    setTitleInput(data.reminder.title);
    setDueAtInput(new Date(data.reminder.due_at));
    setEditError(null);
    setEditing(true);
  }

  function openDuePicker() {
    const base = dueAtInput ?? new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: base,
        mode: 'date',
        onChange: (_e, pickedDate) => {
          if (!pickedDate) return;
          DateTimePickerAndroid.open({
            value: pickedDate,
            mode: 'time',
            onChange: (_e2, pickedTime) => {
              if (pickedTime) setDueAtInput(pickedTime);
            },
          });
        },
      });
    } else {
      setShowIosPicker(true);
    }
  }

  async function saveEdit() {
    if (!data) return;
    const trimmedTitle = titleInput.trim();
    if (!trimmedTitle) {
      setEditError('Judul gak boleh kosong.');
      return;
    }
    if (!dueAtInput) {
      setEditError('Waktu reminder gak boleh kosong.');
      return;
    }
    setPending(true);
    try {
      if (trimmedTitle !== data.reminder.title) await updateReminderTitle(id, trimmedTitle);
      const dueAtIso = dueAtInput.toISOString();
      if (dueAtIso !== data.reminder.due_at) await updateReminderDueAt(id, dueAtIso);
      setEditing(false);
      await load();
      onChanged();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan.');
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={theme.color.primary} />
      </View>
    );
  }
  if (!data) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Reminder tidak ditemukan.</Text>
      </View>
    );
  }

  const { reminder, isOwner, ownerNickname, collaborators } = data;
  const isDone = reminder.status === 'done';
  const allChips = isOwner ? collaborators : [{ userId: 'owner', nickname: ownerNickname }, ...collaborators];

  return (
    <View style={styles.container}>
      {editing ? (
        <View style={styles.editForm}>
          <Text style={styles.fieldLabel}>Judul</Text>
          <TextInput style={styles.input} value={titleInput} onChangeText={setTitleInput} maxLength={120} autoFocus />
          <Text style={styles.fieldLabel}>Tanggal & waktu</Text>
          <Pressable style={styles.dateButton} onPress={openDuePicker}>
            <Text style={styles.dateButtonText}>{dueAtInput ? formatReminderDueAt(dueAtInput.toISOString()) : 'Pilih'}</Text>
          </Pressable>
          {Platform.OS === 'ios' && showIosPicker && dueAtInput && (
            <DateTimePicker
              value={dueAtInput}
              mode="datetime"
              display="spinner"
              onChange={(_e, picked) => picked && setDueAtInput(picked)}
            />
          )}
          {editError && <Text style={styles.errorText}>{editError}</Text>}
          <View style={styles.editButtonRow}>
            <Pressable style={styles.editCancelButton} onPress={() => setEditing(false)} disabled={pending}>
              <Text style={styles.editCancelText}>Batal</Text>
            </Pressable>
            <Pressable style={styles.editSaveButton} onPress={saveEdit} disabled={pending}>
              <Text style={styles.editSaveText}>{pending ? '…' : 'Simpan'}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, isDone && styles.titleDone]}>
              {reminder.categories ? `${reminder.categories.icon} ` : ''}
              {reminder.title}
            </Text>
            <Text style={styles.dueText}>
              {formatReminderDueAt(reminder.due_at)}
              {reminder.event_stage ? ` · ${reminder.event_stage}` : ''}
            </Text>
          </View>
          {isOwner && (
            <Pressable onPress={startEdit} hitSlop={8} accessibilityLabel="Edit reminder">
              <Pencil size={14} color={theme.color.textMuted} />
            </Pressable>
          )}
        </View>
      )}
      {!isOwner && <Text style={styles.sharedByText}>Dibagikan oleh {ownerNickname}</Text>}

      {allChips.length > 0 && (
        <View style={styles.chipRow}>
          <Text style={styles.chipLabel}>Bareng:</Text>
          <View style={styles.chipWrap}>
            {allChips.map((c) => (
              <View key={c.userId} style={styles.chip}>
                <Text style={styles.chipText}>{c.nickname}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {reminder.notes && <Text style={styles.notes}>{reminder.notes}</Text>}

      <View style={styles.metaRow}>
        {reminder.categories && (
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>
              {reminder.categories.icon} {reminder.categories.name}
            </Text>
          </View>
        )}
        {reminder.recurrence_rule && (
          <View style={styles.metaChip}>
            <Repeat size={12} color={theme.color.textMuted} />
            <Text style={styles.metaChipText}>{recurrenceLabel(reminder.recurrence_rule)}</Text>
          </View>
        )}
        <View style={styles.metaChip}>
          {isDone && <Check size={12} color={theme.color.textMuted} />}
          <Text style={styles.metaChipText}>{isDone ? 'Selesai' : 'Belum selesai'}</Text>
        </View>
      </View>

      {confirming ? (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmText}>Yakin mau hapus reminder ini?</Text>
          <View style={styles.confirmButtonRow}>
            <Pressable style={styles.confirmCancelButton} onPress={() => setConfirming(false)} disabled={pending}>
              <Text style={styles.confirmCancelText}>Batal</Text>
            </Pressable>
            <Pressable style={styles.confirmDeleteButton} onPress={handleDelete} disabled={pending}>
              <Text style={styles.confirmDeleteText}>{pending ? '…' : 'Ya, hapus'}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.actionsColumn}>
          {!isDone && (
            <Pressable style={styles.secondaryButton} onPress={snooze10} disabled={pending}>
              <AlarmClock size={15} color={theme.color.text} />
              <Text style={styles.secondaryButtonText}>Tunda 10 menit</Text>
            </Pressable>
          )}
          {isOwner ? (
            <View style={styles.actionsRow3}>
              <Pressable style={styles.primaryButton} onPress={toggleDone} disabled={pending}>
                <Text style={styles.primaryButtonText}>{isDone ? 'Selesai ✓' : 'Tandai selesai'}</Text>
              </Pressable>
              <Pressable style={styles.secondaryButtonSmall} onPress={() => setShareOpen(true)} disabled={pending}>
                <Users size={15} color={theme.color.text} />
                <Text style={styles.secondaryButtonText}>Bagikan</Text>
              </Pressable>
              <Pressable style={styles.dangerButton} onPress={() => setConfirming(true)} disabled={pending}>
                <Text style={styles.dangerButtonText}>Hapus</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.actionsRow2}>
              <Pressable style={styles.primaryButton} onPress={toggleDone} disabled={pending}>
                <Text style={styles.primaryButtonText}>{isDone ? 'Tandai belum selesai' : 'Tandai selesai'}</Text>
              </Pressable>
              <Pressable style={styles.dangerButton} onPress={() => Alert.alert('Keluar?', undefined, [
                { text: 'Batal', style: 'cancel' },
                { text: 'Keluar', style: 'destructive', onPress: handleLeave },
              ])} disabled={pending}>
                <Text style={styles.dangerButtonText}>{pending ? '…' : 'Keluar'}</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      <Pressable style={styles.collapseButton} onPress={onCollapse}>
        <ChevronUp size={14} color={theme.color.textMuted} />
        <Text style={styles.collapseText}>Tutup</Text>
      </Pressable>

      {isOwner && (
        <ShareInviteSheet
          visible={shareOpen}
          onClose={() => setShareOpen(false)}
          hint="Kasih kode ini ke orang yang mau kamu ajak, atau biar dia scan QR-nya langsung — dua-duanya bisa dimasukin di menu Semua ➝ Reminder ➝ Gabung pakai kode."
          createInvite={() => createReminderInvite(id)}
        />
      )}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      gap: space.md,
      paddingHorizontal: space.md,
      paddingBottom: space.md,
      paddingTop: space.sm,
      borderTopWidth: 1,
      borderTopColor: theme.color.border,
    },
    emptyText: {
      fontSize: fontSize.sm,
      color: theme.color.textMuted,
      textAlign: 'center',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: space.sm,
    },
    titleBlock: {
      flex: 1,
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
    dueText: {
      fontSize: fontSize.sm,
      color: theme.color.textMuted,
      marginTop: 2,
    },
    sharedByText: {
      fontSize: fontSize.tiny,
      color: theme.color.textMuted,
    },
    editForm: {
      gap: space.xs + 2,
    },
    fieldLabel: {
      fontSize: fontSize.xs,
      fontWeight: '600',
      color: theme.color.textMuted,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: radius.button,
      paddingHorizontal: space.sm,
      paddingVertical: space.sm - 2,
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: theme.color.text,
    },
    dateButton: {
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: radius.button,
      paddingHorizontal: space.sm,
      paddingVertical: space.sm - 2,
    },
    dateButtonText: {
      fontSize: fontSize.sm,
      color: theme.color.text,
    },
    editButtonRow: {
      flexDirection: 'row',
      gap: space.sm,
      marginTop: space.xs,
    },
    editCancelButton: {
      flex: 1,
      backgroundColor: theme.color.surfaceMuted,
      borderRadius: radius.button,
      paddingVertical: space.sm - 2,
      alignItems: 'center',
    },
    editCancelText: {
      fontSize: fontSize.xs,
      fontWeight: '500',
      color: theme.color.textMuted,
    },
    editSaveButton: {
      flex: 1,
      backgroundColor: theme.color.primary,
      borderRadius: radius.button,
      paddingVertical: space.sm - 2,
      alignItems: 'center',
    },
    editSaveText: {
      fontSize: fontSize.xs,
      fontWeight: '600',
      color: theme.color.onPrimary,
    },
    errorText: {
      fontSize: fontSize.xs,
      color: theme.color.destructive,
    },
    chipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.xs + 2,
      flexWrap: 'wrap',
    },
    chipLabel: {
      fontSize: fontSize.xs,
      color: theme.color.textMuted,
    },
    chipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space.xs,
    },
    chip: {
      backgroundColor: theme.color.surfaceMuted,
      borderRadius: radius.pill,
      paddingHorizontal: space.sm + 2,
      paddingVertical: 4,
    },
    chipText: {
      fontSize: fontSize.xs,
      fontWeight: '500',
      color: theme.color.textMuted,
    },
    notes: {
      backgroundColor: theme.color.background,
      borderRadius: radius.button,
      padding: space.sm + 2,
      fontSize: fontSize.sm,
      color: theme.color.textMuted,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space.xs + 2,
    },
    metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.color.surfaceMuted,
      borderRadius: radius.pill,
      paddingHorizontal: space.sm + 2,
      paddingVertical: 4,
    },
    metaChipText: {
      fontSize: fontSize.xs,
      color: theme.color.textMuted,
    },
    confirmBox: {
      gap: space.sm,
      borderWidth: 1,
      borderColor: theme.color.destructive,
      backgroundColor: theme.color.background,
      borderRadius: radius.card,
      padding: space.sm + 2,
    },
    confirmText: {
      fontSize: fontSize.sm,
      color: theme.color.destructive,
    },
    confirmButtonRow: {
      flexDirection: 'row',
      gap: space.sm,
    },
    confirmCancelButton: {
      flex: 1,
      backgroundColor: theme.color.surface,
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: radius.button,
      paddingVertical: space.sm - 2,
      alignItems: 'center',
    },
    confirmCancelText: {
      fontSize: fontSize.xs,
      fontWeight: '500',
      color: theme.color.textMuted,
    },
    confirmDeleteButton: {
      flex: 1,
      backgroundColor: theme.color.destructive,
      borderRadius: radius.button,
      paddingVertical: space.sm - 2,
      alignItems: 'center',
    },
    confirmDeleteText: {
      fontSize: fontSize.xs,
      fontWeight: '600',
      color: '#fff',
    },
    actionsColumn: {
      gap: space.sm,
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space.xs + 2,
      backgroundColor: theme.color.surfaceMuted,
      borderRadius: radius.button,
      paddingVertical: space.sm + 2,
    },
    secondaryButtonSmall: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      backgroundColor: theme.color.surfaceMuted,
      borderRadius: radius.button,
      paddingVertical: space.sm,
    },
    secondaryButtonText: {
      fontSize: fontSize.xs,
      fontWeight: '500',
      color: theme.color.text,
    },
    actionsRow3: {
      flexDirection: 'row',
      gap: space.xs + 2,
    },
    actionsRow2: {
      flexDirection: 'row',
      gap: space.sm,
    },
    primaryButton: {
      flex: 1,
      backgroundColor: theme.color.primary,
      borderRadius: radius.button,
      paddingVertical: space.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      fontSize: fontSize.xs,
      fontWeight: '600',
      color: theme.color.onPrimary,
    },
    dangerButton: {
      flex: 1,
      backgroundColor: theme.color.background,
      borderWidth: 1,
      borderColor: theme.color.destructive,
      borderRadius: radius.button,
      paddingVertical: space.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dangerButtonText: {
      fontSize: fontSize.xs,
      fontWeight: '600',
      color: theme.color.destructive,
    },
    collapseButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      alignSelf: 'center',
    },
    collapseText: {
      fontSize: fontSize.xs,
      color: theme.color.textMuted,
    },
  });
}
