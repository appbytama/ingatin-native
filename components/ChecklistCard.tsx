import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, ClipboardList, Plus, Trash2, X } from 'lucide-react-native';
import type { Checklist } from '../lib/types';
import { addChecklistItem, deleteChecklist, deleteChecklistItem, toggleChecklistItem } from '../lib/checklists';
import { useTheme, space, radius, fontSize, iconSize, type Theme } from '../lib/theme';

export default function ChecklistCard({ checklist, onChanged }: { checklist: Checklist; onChanged: () => void }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [newItem, setNewItem] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAddItem() {
    const label = newItem.trim();
    if (!label) return;
    setSaving(true);
    try {
      await addChecklistItem(checklist.id, label);
      setNewItem('');
      onChanged();
    } catch (err) {
      Alert.alert('Gagal', err instanceof Error ? err.message : 'Gagal menambah item.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(itemId: string, current: boolean) {
    try {
      await toggleChecklistItem(itemId, !current);
      onChanged();
    } catch (err) {
      Alert.alert('Gagal', err instanceof Error ? err.message : 'Gagal mengubah item.');
    }
  }

  async function handleDeleteItem(itemId: string) {
    try {
      await deleteChecklistItem(itemId);
      onChanged();
    } catch (err) {
      Alert.alert('Gagal', err instanceof Error ? err.message : 'Gagal menghapus item.');
    }
  }

  function handleDeleteChecklist() {
    Alert.alert('Hapus checklist?', checklist.title, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteChecklist(checklist.id);
            onChanged();
          } catch (err) {
            Alert.alert('Gagal', err instanceof Error ? err.message : 'Gagal menghapus checklist.');
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          {!checklist.categories && <ClipboardList size={iconSize.sm} color={theme.color.primary} />}
          <Text style={styles.title} numberOfLines={1}>
            {checklist.categories ? `${checklist.categories.icon} ` : ''}
            {checklist.title}
          </Text>
        </View>
        <Pressable onPress={handleDeleteChecklist} hitSlop={10} accessibilityLabel="Hapus checklist">
          <Trash2 size={iconSize.sm} color={theme.color.textMuted} />
        </Pressable>
      </View>

      {checklist.checklist_items.map((item) => (
        <View key={item.id} style={styles.itemRow}>
          <Pressable
            style={[styles.itemCheckbox, item.is_checked && styles.itemCheckboxChecked]}
            onPress={() => handleToggle(item.id, item.is_checked)}
            hitSlop={10}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: item.is_checked }}
          >
            {item.is_checked && <Check size={12} color={theme.color.onPrimary} strokeWidth={3} />}
          </Pressable>
          <Text style={[styles.itemLabel, item.is_checked && styles.itemLabelChecked]}>{item.label}</Text>
          <Pressable onPress={() => handleDeleteItem(item.id)} hitSlop={10} accessibilityLabel="Hapus item">
            <X size={14} color={theme.color.textMuted} />
          </Pressable>
        </View>
      ))}

      <View style={styles.addItemRow}>
        <TextInput
          style={styles.addItemInput}
          placeholder="Tambah item…"
          placeholderTextColor={theme.color.textMuted}
          value={newItem}
          onChangeText={setNewItem}
          onSubmitEditing={handleAddItem}
          editable={!saving}
        />
        <Pressable onPress={handleAddItem} disabled={saving || !newItem.trim()} hitSlop={10} accessibilityLabel="Tambah item">
          <Plus size={iconSize.md} color={theme.color.primary} />
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.color.surface,
      borderRadius: radius.lg,
      padding: space.md,
      marginBottom: space.md,
      gap: space.xs,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: space.xs,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.xs,
      flex: 1,
    },
    title: {
      fontSize: fontSize.md,
      fontWeight: '700',
      color: theme.color.text,
      flex: 1,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      paddingVertical: space.xs,
    },
    itemCheckbox: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.color.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemCheckboxChecked: {
      backgroundColor: theme.color.primary,
      borderColor: theme.color.primary,
    },
    itemLabel: {
      flex: 1,
      fontSize: fontSize.sm,
      color: theme.color.text,
    },
    itemLabelChecked: {
      textDecorationLine: 'line-through',
      color: theme.color.textMuted,
    },
    addItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      marginTop: space.xs,
    },
    addItemInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: radius.sm,
      paddingHorizontal: space.sm,
      paddingVertical: space.sm,
      fontSize: fontSize.sm,
      backgroundColor: theme.color.background,
      color: theme.color.text,
    },
  });
}
