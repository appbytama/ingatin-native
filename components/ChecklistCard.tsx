import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Checklist } from '../lib/types';
import { addChecklistItem, deleteChecklist, deleteChecklistItem, toggleChecklistItem } from '../lib/checklists';

export default function ChecklistCard({ checklist, onChanged }: { checklist: Checklist; onChanged: () => void }) {
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
        <Text style={styles.title} numberOfLines={1}>
          {checklist.categories ? `${checklist.categories.icon} ` : '📋 '}
          {checklist.title}
        </Text>
        <Pressable onPress={handleDeleteChecklist} hitSlop={8}>
          <Text style={styles.deleteIcon}>🗑️</Text>
        </Pressable>
      </View>

      {checklist.checklist_items.map((item) => (
        <View key={item.id} style={styles.itemRow}>
          <Pressable style={styles.itemCheckbox} onPress={() => handleToggle(item.id, item.is_checked)} hitSlop={8}>
            <Text style={styles.itemCheckboxMark}>{item.is_checked ? '✓' : ''}</Text>
          </Pressable>
          <Text style={[styles.itemLabel, item.is_checked && styles.itemLabelChecked]}>{item.label}</Text>
          <Pressable onPress={() => handleDeleteItem(item.id)} hitSlop={8}>
            <Text style={styles.itemDelete}>✕</Text>
          </Pressable>
        </View>
      ))}

      <View style={styles.addItemRow}>
        <TextInput
          style={styles.addItemInput}
          placeholder="Tambah item…"
          value={newItem}
          onChangeText={setNewItem}
          onSubmitEditing={handleAddItem}
          editable={!saving}
        />
        <Pressable onPress={handleAddItem} disabled={saving || !newItem.trim()}>
          <Text style={styles.addItemButton}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f7f7f7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  deleteIcon: {
    fontSize: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  itemCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#999',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCheckboxMark: {
    fontSize: 12,
    fontWeight: '700',
  },
  itemLabel: {
    flex: 1,
    fontSize: 13,
  },
  itemLabelChecked: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  itemDelete: {
    color: '#999',
    fontSize: 13,
    paddingHorizontal: 4,
  },
  addItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  addItemInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    backgroundColor: '#fff',
  },
  addItemButton: {
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: 6,
  },
});
