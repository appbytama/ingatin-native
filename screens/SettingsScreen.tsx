import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { Folder, LogOut, Plus, User, X } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { createCategory, deleteCategory, getCategories } from '../lib/categories';
import type { Category } from '../lib/types';
import { useTheme, space, radius, fontSize, iconSize, type Theme } from '../lib/theme';

// Mirrors the PWA's "/pengaturan" page (read off its live DOM): Profil,
// Personalisasi (assistant nickname), Kategori, then "Keluar" — this is
// where sign-out actually lives, not on the avatar tap that opens this
// screen. Notifikasi/Efek Suara/Instalasi sections aren't ported: native
// push isn't built yet (Fase 5), and neither is a sound-effects system —
// showing those toggles with no effect would be worse than omitting them.
export default function SettingsScreen({ session }: { session: Session }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [nickname, setNickname] = useState('');
  const [assistantName, setAssistantName] = useState('');
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    const meta = session.user.user_metadata ?? {};
    setNickname((meta.nickname as string) || session.user.email?.split('@')[0] || '');
    setAssistantName((meta.assistant_name as string) || 'Ingatin');
    getCategories(session.user.id).then(setCategories).catch(() => {});
  }, [session]);

  async function handleSavePersonalization() {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { nickname: nickname.trim(), assistant_name: assistantName.trim() || 'Ingatin' },
      });
      if (error) throw error;
    } catch (err) {
      Alert.alert('Gagal', err instanceof Error ? err.message : 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      await createCategory(session.user.id, name);
      setNewCategoryName('');
      setCategories(await getCategories(session.user.id));
    } catch (err) {
      Alert.alert('Gagal', err instanceof Error ? err.message : 'Gagal menambah kategori.');
    }
  }

  async function handleDeleteCategory(id: string) {
    try {
      await deleteCategory(id);
      setCategories(await getCategories(session.user.id));
    } catch (err) {
      Alert.alert('Gagal', err instanceof Error ? err.message : 'Gagal menghapus kategori.');
    }
  }

  function handleSignOut() {
    Alert.alert('Keluar?', undefined, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  const initial = (nickname || '?').charAt(0).toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Pengaturan</Text>

      <View style={styles.card}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <User size={22} color={theme.color.onPrimary} />
          </View>
          <View>
            <Text style={styles.profileLabel}>Pengguna</Text>
            <Text style={styles.profileEmail}>{session.user.email}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personalisasi</Text>
        <Text style={styles.cardHint}>Atur bagaimana asisten memanggil kamu dan kasih nama asistennya.</Text>

        <Text style={styles.fieldLabel}>Nama panggilan kamu</Text>
        <TextInput
          style={styles.input}
          value={nickname}
          onChangeText={setNickname}
          placeholder="Nama panggilan"
          placeholderTextColor={theme.color.textMuted}
        />

        <Text style={styles.fieldLabel}>Nama asisten</Text>
        <TextInput
          style={styles.input}
          value={assistantName}
          onChangeText={setAssistantName}
          placeholder="Ingatin"
          placeholderTextColor={theme.color.textMuted}
        />

        <Pressable style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSavePersonalization} disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? 'Menyimpan…' : 'Simpan'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Kategori</Text>
        <Text style={styles.cardHint}>Atur kategori buat reminder & checklist kamu.</Text>

        <View style={styles.categoryWrap}>
          {categories.map((c) => (
            <View key={c.id} style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>
                {c.icon} {c.name}
              </Text>
              {c.user_id === session.user.id && (
                <Pressable onPress={() => handleDeleteCategory(c.id)} hitSlop={8}>
                  <X size={12} color={theme.color.textMuted} />
                </Pressable>
              )}
            </View>
          ))}
        </View>

        <View style={styles.addCategoryRow}>
          <Folder size={iconSize.sm} color={theme.color.textMuted} />
          <TextInput
            style={styles.addCategoryInput}
            value={newCategoryName}
            onChangeText={setNewCategoryName}
            placeholder="Kategori baru…"
            placeholderTextColor={theme.color.textMuted}
            onSubmitEditing={handleAddCategory}
          />
          <Pressable style={styles.addCategoryButton} onPress={handleAddCategory} disabled={!newCategoryName.trim()}>
            <Plus size={iconSize.sm} color={theme.color.onPrimary} />
          </Pressable>
        </View>
      </View>

      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <LogOut size={iconSize.sm} color={theme.color.destructive} />
        <Text style={styles.signOutText}>Keluar</Text>
      </Pressable>

      <Text style={styles.versionText}>Ingatin Native v1.0.0</Text>
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
      gap: space.lg,
    },
    pageTitle: {
      fontSize: fontSize.lg,
      fontWeight: '600',
      color: theme.color.text,
    },
    card: {
      backgroundColor: theme.color.surface,
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: radius.card,
      padding: space.md,
      gap: space.sm,
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.color.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileLabel: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: theme.color.text,
    },
    profileEmail: {
      fontSize: fontSize.xs,
      color: theme.color.textMuted,
    },
    cardTitle: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: theme.color.text,
    },
    cardHint: {
      fontSize: fontSize.xs,
      color: theme.color.textMuted,
      marginBottom: space.xs,
    },
    fieldLabel: {
      fontSize: fontSize.xs,
      color: theme.color.textMuted,
      marginTop: space.xs,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: radius.button,
      paddingHorizontal: space.md,
      paddingVertical: space.sm + 2,
      fontSize: fontSize.sm,
      color: theme.color.text,
      backgroundColor: theme.color.background,
    },
    saveButton: {
      backgroundColor: theme.color.primary,
      borderRadius: radius.button,
      paddingVertical: space.sm + 2,
      alignItems: 'center',
      marginTop: space.xs,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: theme.color.onPrimary,
      fontWeight: '600',
      fontSize: fontSize.sm,
    },
    categoryWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space.xs + 2,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: radius.pill,
      paddingHorizontal: space.sm + 2,
      paddingVertical: space.xs,
    },
    categoryChipText: {
      fontSize: fontSize.xs,
      color: theme.color.text,
    },
    addCategoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      marginTop: space.xs,
    },
    addCategoryInput: {
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
    addCategoryButton: {
      width: 36,
      height: 36,
      borderRadius: radius.button,
      backgroundColor: theme.color.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space.xs,
      borderWidth: 1,
      borderColor: theme.color.destructive,
      borderRadius: radius.card,
      paddingVertical: space.md,
    },
    signOutText: {
      color: theme.color.destructive,
      fontWeight: '600',
      fontSize: fontSize.sm,
    },
    versionText: {
      textAlign: 'center',
      color: theme.color.textMuted,
      fontSize: fontSize.tiny,
      marginTop: space.sm,
    },
  });
}
