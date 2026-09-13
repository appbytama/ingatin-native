import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { CalendarClock } from 'lucide-react-native';
import { parseQuickAdd } from '../lib/parser/local';
import { createReminder } from '../lib/reminders';
import { getCategories } from '../lib/categories';
import type { Category, RecurrenceRule } from '../lib/types';
import { formatReminderDueAt } from '../lib/format';
import { useTheme, space, radius, fontSize, iconSize, type Theme } from '../lib/theme';

const RECURRENCE_OPTIONS: { type: RecurrenceRule['type']; label: string }[] = [
  { type: 'none', label: 'Sekali saja' },
  { type: 'daily', label: 'Setiap hari' },
  { type: 'weekly', label: 'Setiap minggu' },
  { type: 'monthly', label: 'Setiap bulan' },
  { type: 'yearly', label: 'Setiap tahun' },
];

// Anchor-relative reminders ("sehari sebelum ulang tahun ibu") need the
// anchor date resolved somewhere — the PWA does this with a dedicated
// amber-box date picker in IngatForm, tied into its chat assistant. Not
// worth building that UI yet (Fase 4 item 3, the Babel chat, is where this
// kind of clarifying-question flow actually belongs) — for now, anchor
// reminders just fall back to plain manual date entry.
export default function QuickAddReminder({ userId, onCreated }: { userId: string; onCreated: () => void }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState<Date | null>(null);
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showIosPicker, setShowIosPicker] = useState(false);
  const [relativeNote, setRelativeNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCategories(userId).then(setCategories).catch(() => {});
  }, [userId]);

  function applyParse(raw: string) {
    setText(raw);
    setError(null);
    if (!raw.trim()) {
      setTitle('');
      setDueAt(null);
      setRecurrence(null);
      setRelativeNote(null);
      return;
    }
    const parsed = parseQuickAdd(raw, new Date());
    setTitle(parsed.title);
    setRecurrence(parsed.recurrenceRule);
    if (parsed.relativeTrigger) {
      setDueAt(null);
      setRelativeNote(
        `Reminder relatif ke "${parsed.relativeTrigger.anchor_label}" belum didukung otomatis — isi tanggalnya manual dulu.`
      );
    } else {
      setDueAt(parsed.dueAt);
      setRelativeNote(null);
    }
  }

  function openPicker() {
    const base = dueAt ?? new Date(Date.now() + 60 * 60 * 1000);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: base,
        mode: 'date',
        onChange: (_event, pickedDate) => {
          if (!pickedDate) return;
          DateTimePickerAndroid.open({
            value: pickedDate,
            mode: 'time',
            onChange: (_e, pickedTime) => {
              if (pickedTime) setDueAt(pickedTime);
            },
          });
        },
      });
    } else {
      setDueAt(base);
      setShowIosPicker(true);
    }
  }

  async function handleSubmit() {
    if (!title.trim()) {
      setError('Judul reminder wajib diisi.');
      return;
    }
    if (!dueAt) {
      setError('Tanggal & waktu reminder wajib ditentukan.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createReminder({
        title: title.trim(),
        dueAt: dueAt.toISOString(),
        categoryId,
        recurrenceRule: recurrence?.type === 'none' ? null : recurrence,
      });
      setText('');
      setTitle('');
      setDueAt(null);
      setRecurrence(null);
      setCategoryId(null);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan reminder.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.textInput}
        placeholder={'Ingat apa nih? cth: "Bayar listrik tanggal 5 jam 8 pagi"'}
        placeholderTextColor={theme.color.textMuted}
        value={text}
        onChangeText={applyParse}
        multiline
      />

      {text.trim().length > 0 && (
        <View style={styles.details}>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Judul"
            placeholderTextColor={theme.color.textMuted}
          />

          {relativeNote && <Text style={styles.relativeNote}>{relativeNote}</Text>}

          <Pressable style={styles.dateButton} onPress={openPicker}>
            <CalendarClock size={iconSize.sm} color={theme.color.textMuted} />
            <Text style={styles.dateButtonText}>
              {dueAt ? formatReminderDueAt(dueAt.toISOString()) : 'Pilih tanggal & waktu'}
            </Text>
          </Pressable>

          {Platform.OS === 'ios' && showIosPicker && dueAt && (
            <DateTimePicker
              value={dueAt}
              mode="datetime"
              display="spinner"
              onChange={(_event, picked) => {
                if (picked) setDueAt(picked);
              }}
            />
          )}

          {categories.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {categories.map((c) => (
                <Pressable
                  key={c.id}
                  style={[styles.chip, categoryId === c.id && styles.chipActive]}
                  onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
                >
                  <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>
                    {c.icon} {c.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {RECURRENCE_OPTIONS.map((opt) => {
              const active = (recurrence?.type ?? 'none') === opt.type;
              return (
                <Pressable
                  key={opt.type}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setRecurrence(opt.type === 'none' ? null : { type: opt.type })}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={({ pressed }) => [styles.submitButton, pressed && styles.pressed, (!text.trim() || saving) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!text.trim() || saving}
      >
        {saving ? <ActivityIndicator color={theme.color.onPrimary} /> : <Text style={styles.submitButtonText}>Simpan Reminder</Text>}
      </Pressable>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      gap: space.sm,
      marginBottom: space.lg,
    },
    textInput: {
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: radius.button,
      padding: space.md,
      fontSize: fontSize.sm,
      minHeight: 44,
      color: theme.color.text,
    },
    details: {
      gap: space.sm,
      backgroundColor: theme.color.surface,
      borderRadius: radius.button,
      padding: space.sm,
    },
    titleInput: {
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: radius.button,
      padding: space.sm,
      fontSize: fontSize.sm,
      backgroundColor: theme.color.background,
      color: theme.color.text,
    },
    relativeNote: {
      fontSize: fontSize.xs,
      color: theme.color.warningText,
      backgroundColor: theme.color.warningBg,
      padding: space.sm,
      borderRadius: radius.button,
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.xs,
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: radius.button,
      padding: space.sm,
      backgroundColor: theme.color.background,
      minHeight: 44,
    },
    dateButtonText: {
      fontSize: fontSize.sm,
      color: theme.color.text,
    },
    chipRow: {
      flexDirection: 'row',
    },
    chip: {
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: radius.pill,
      paddingHorizontal: space.md,
      paddingVertical: space.xs + 2,
      marginRight: space.xs,
      backgroundColor: theme.color.background,
      minHeight: 32,
      justifyContent: 'center',
    },
    chipActive: {
      backgroundColor: theme.color.primary,
      borderColor: theme.color.primary,
    },
    chipText: {
      fontSize: fontSize.xs,
      color: theme.color.text,
    },
    chipTextActive: {
      color: theme.color.onPrimary,
    },
    error: {
      color: theme.color.destructive,
      fontSize: fontSize.xs,
    },
    submitButton: {
      backgroundColor: theme.color.primary,
      borderRadius: radius.button,
      paddingVertical: space.md,
      alignItems: 'center',
      minHeight: 44,
      justifyContent: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    pressed: {
      opacity: 0.85,
    },
    submitButtonText: {
      color: theme.color.onPrimary,
      fontWeight: '600',
      fontSize: fontSize.sm,
    },
  });
}
