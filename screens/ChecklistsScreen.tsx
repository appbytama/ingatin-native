import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { createChecklist, getActiveChecklists } from '../lib/checklists';
import type { Checklist } from '../lib/types';
import ChecklistCard from '../components/ChecklistCard';

export default function ChecklistsScreen() {
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
                value={newTitle}
                onChangeText={setNewTitle}
                onSubmitEditing={handleCreate}
                editable={!creating}
              />
              <Pressable
                style={[styles.addButton, (!newTitle.trim() || creating) && styles.addButtonDisabled]}
                onPress={handleCreate}
                disabled={!newTitle.trim() || creating}
              >
                <Text style={styles.addButtonText}>Buat</Text>
              </Pressable>
            </View>

            {error && <Text style={styles.error}>{error}</Text>}
            {!loading && checklists.length === 0 && !error && (
              <Text style={styles.empty}>Belum ada checklist. Buat di atas.</Text>
            )}
          </View>
        }
        renderItem={({ item }) => <ChecklistCard checklist={item} onChanged={load} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    padding: 16,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  error: {
    color: '#b00020',
    marginBottom: 8,
  },
  empty: {
    color: '#888',
    textAlign: 'center',
    marginTop: 24,
  },
});
