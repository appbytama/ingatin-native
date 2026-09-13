import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { createChecklist, getActiveChecklists } from '../lib/checklists';
import type { Checklist } from '../lib/types';
import ChecklistCard from '../components/ChecklistCard';
import { useTheme, space, radius, fontSize, iconSize, type Theme } from '../lib/theme';

export default function ChecklistsScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setChecklists(await getActiveChecklists());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat checklist.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    const title = newTitle.trim();
    if (!title) return;
    setCreating(true);
    try {
      await createChecklist(title);
      setNewTitle('');
      load();
    } catch (err) {
      Alert.alert('Gagal', err instanceof Error ? err.message : 'Gagal membuat checklist.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={checklists}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                placeholder="Checklist baru, cth: Bawaan Camping"
                placeholderTextColor={theme.color.textMuted}
                value={newTitle}
                onChangeText={setNewTitle}
                onSubmitEditing={handleCreate}
                editable={!creating}
              />
              <Pressable
                style={[styles.addButton, (!newTitle.trim() || creating) && styles.addButtonDisabled]}
                onPress={handleCreate}
                disabled={!newTitle.trim() || creating}
                accessibilityLabel="Buat checklist"
              >
                <Plus size={iconSize.md} color={theme.color.onPrimary} />
              </Pressable>
            </View>

            {error && <Text style={styles.error}>{error}</Text>}
            {!loading && checklists.length === 0 && !error && (
              <Text style={styles.empty}>Belum ada checklist. Buat di atas.</Text>
            )}
          </View>
        }
        renderItem={({ item }) => <ChecklistCard checklist={item} onChanged={load} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.color.primary} />}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.color.background,
    },
    listContent: {
      padding: space.lg,
    },
    addRow: {
      flexDirection: 'row',
      gap: space.sm,
      marginBottom: space.lg,
    },
    addInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: radius.md,
      paddingHorizontal: space.md,
      paddingVertical: space.md,
      fontSize: fontSize.base,
      color: theme.color.text,
      backgroundColor: theme.color.surface,
      minHeight: 44,
    },
    addButton: {
      backgroundColor: theme.color.primary,
      borderRadius: radius.md,
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButtonDisabled: {
      opacity: 0.5,
    },
    error: {
      color: theme.color.destructive,
      marginBottom: space.sm,
      fontSize: fontSize.sm,
    },
    empty: {
      color: theme.color.textMuted,
      textAlign: 'center',
      marginTop: space.xxl,
      fontSize: fontSize.sm,
    },
  });
}
