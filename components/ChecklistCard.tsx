import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronRight, Plus, Trash2, X } from 'lucide-react-native';
import type { Checklist } from '../lib/types';
import { addChecklistItem, deleteChecklist, deleteChecklistItem, toggleChecklistItem } from '../lib/checklists';
import { useTheme, space, radius, fontSize, iconSize, type Theme } from '../lib/theme';

// Mirrors the PWA's checklist card (read off its live DOM): a collapsed
// summary row (title, "n/m Selesai", progress bar, chevron) that expands in
// place to show items + an add-item row. The PWA's Bagikan/Publik/Arsipkan
// actions and per-item "diubah <nama>" attribution aren't ported — sharing/
// publish-template isn't built in this app yet (see the roadmap plan); a
// plain "Hapus" stands in for the action row until that lands.
export default function ChecklistCard({ checklist, onChanged }: { checklist: Checklist; onChanged: () => void }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [expanded, setExpanded] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [saving, setSaving] = useState(false);

  const total = checklist.checklist_items.length;
  const doneCount = checklist.checklist_items.filter((i) => i.is_checked).length;
  const progress = total > 0 ? doneCount / total : 0;

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
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Pressable style={styles.headerRow} onPress={() => setExpanded((v) => !v)}>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {checklist.categories ? `${checklist.categories.icon} ` : '📋 '}
              {checklist.title}
            </Text>
            <Text style={styles.subtitle}>
              {doneCount}/{total} Selesai
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <ChevronRight
            size={iconSize.md}
            color={theme.color.chevron}
            style={expanded ? styles.chevronOpen : undefined}
          />
        </Pressable>

        {expanded && (
          <View style={styles.expanded}>
            {checklist.checklist_items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <Pressable
                  style={[styles.itemCheckbox, item.is_checked && styles.itemCheckboxChecked]}
                  onPress={() => handleToggle(item.id, item.is_checked)}
                  hitSlop={10}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.is_checked }}
                />
                <Text style={styles.itemLabel}>{item.label}</Text>
                <Pressable onPress={() => handleDeleteItem(item.id)} hitSlop={10} accessibilityLabel="Hapus item">
                  <X size={14} color={theme.color.chevron} />
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
              <Pressable onPress={handleAddItem} disabled={saving || !newItem.trim()} style={styles.addItemButton} accessibilityLabel="Tambah item">
                <Plus size={iconSize.sm} color={theme.color.onPrimary} />
              </Pressable>
            </View>

            <Pressable style={styles.deleteChecklistButton} onPress={handleDeleteChecklist}>
              <Trash2 size={iconSize.sm} color={theme.color.destructive} />
              <Text style={styles.deleteChecklistText}>Hapus checklist</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: {
      marginBottom: space.sm,
    },
    card: {
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: theme.color.border,
      backgroundColor: theme.color.surface,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      padding: space.md,
    },
    headerText: {
      flex: 1,
      minWidth: 0,
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
    progressTrack: {
      width: 64,
      height: 8,
      borderRadius: radius.pill,
      backgroundColor: theme.color.surfaceMuted,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.color.primary,
    },
    chevronOpen: {
      transform: [{ rotate: '90deg' }],
    },
    expanded: {
      gap: space.md,
      paddingHorizontal: space.md,
      paddingBottom: space.md,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
    },
    itemCheckbox: {
      width: 16,
      height: 16,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: theme.color.checkboxBorder,
    },
    itemCheckboxChecked: {
      backgroundColor: theme.color.primary,
      borderColor: theme.color.primary,
    },
    itemLabel: {
      flex: 1,
      fontSize: fontSize.sm,
      color: theme.color.textItem,
    },
    addItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
    },
    addItemInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: radius.button,
      paddingHorizontal: space.sm,
      paddingVertical: space.sm,
      fontSize: fontSize.sm,
      color: theme.color.text,
      backgroundColor: theme.color.background,
    },
    addItemButton: {
      width: 36,
      height: 36,
      borderRadius: radius.button,
      backgroundColor: theme.color.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteChecklistButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space.xs,
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: radius.card,
      paddingVertical: space.sm + 2,
    },
    deleteChecklistText: {
      color: theme.color.destructive,
      fontSize: fontSize.sm,
      fontWeight: '500',
    },
  });
}
