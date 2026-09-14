import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Bell, User } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useTheme, space, fontSize, type Theme } from '../lib/theme';

type AvatarKind = 'assistant' | 'profile';

// Mirrors the PWA's AvatarUpload (read off its live DOM + source): a square
// tappable avatar (indigo bg, icon fallback) plus "Ganti/Upload <label>" and
// "Hapus foto" text buttons below it. The PWA free-crops via a pan/zoom
// slider (react-easy-crop) rendered in a custom fullscreen sheet; native
// uses expo-image-picker's own allowsEditing+aspect:[1,1], which opens the
// OS's own native cropping UI instead — the platform-idiomatic choice
// (Apple HIG/Material both prefer system controls over custom-built ones)
// rather than re-implementing a bespoke cropper.
export default function AvatarUpload({
  userId,
  currentUrl,
  kind = 'assistant',
  onUploaded,
}: {
  userId: string;
  currentUrl: string | null;
  kind?: AvatarKind;
  onUploaded: (url: string | null) => void;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const isProfile = kind === 'profile';
  const storageFile = isProfile ? 'profile.jpg' : 'avatar.jpg';
  const metadataKey = isProfile ? 'avatar_url' : 'assistant_avatar_url';
  const label = isProfile ? 'foto profil' : 'foto asisten';
  const [preview, setPreview] = useState(currentUrl);
  const [busy, setBusy] = useState(false);

  async function saveAvatar(url: string | null) {
    const { error } = await supabase.auth.updateUser({ data: { [metadataKey]: url } });
    if (error) throw error;
  }

  async function handlePick() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Izin galeri dibutuhkan', 'Aktifkan izin galeri buat pasang foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) return;

    setBusy(true);
    try {
      const uri = result.assets[0].uri;
      const arraybuffer = await fetch(uri).then((res) => res.arrayBuffer());
      const path = `${userId}/${storageFile}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arraybuffer, { upsert: true, cacheControl: '3600', contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      // Cache-bust so the new photo shows immediately even though the path
      // (and therefore URL) is the same after an overwrite.
      const url = `${data.publicUrl}?v=${Date.now()}`;

      await saveAvatar(url);
      setPreview(url);
      onUploaded(url);
    } catch (err) {
      Alert.alert('Gagal', err instanceof Error ? err.message : 'Gagal upload foto. Coba lagi ya.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      await saveAvatar(null);
      setPreview(null);
      onUploaded(null);
    } catch (err) {
      Alert.alert('Gagal', err instanceof Error ? err.message : 'Gagal menghapus foto.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.row}>
      <Pressable style={styles.avatar} onPress={handlePick} disabled={busy} accessibilityLabel={`Ganti ${label}`}>
        {preview ? (
          <Image source={{ uri: preview }} style={styles.avatarImage} />
        ) : isProfile ? (
          <User size={26} color={theme.color.onPrimary} />
        ) : (
          <Bell size={26} color={theme.color.onPrimary} />
        )}
        {busy && (
          <View style={styles.busyOverlay}>
            <Text style={styles.busyText}>…</Text>
          </View>
        )}
      </Pressable>

      <View style={styles.actions}>
        <Pressable style={styles.actionButton} onPress={handlePick} disabled={busy}>
          <Text style={styles.actionText}>{preview ? `Ganti ${label}` : `Upload ${label}`}</Text>
        </Pressable>
        {preview && (
          <Pressable onPress={handleRemove} disabled={busy} hitSlop={6}>
            <Text style={styles.removeText}>Hapus foto</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 16,
      backgroundColor: theme.color.primary,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    busyOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    busyText: {
      color: theme.color.onPrimary,
      fontSize: fontSize.xs,
    },
    actions: {
      gap: space.xs,
      alignItems: 'flex-start',
    },
    actionButton: {
      backgroundColor: theme.color.surfaceMuted,
      borderRadius: 8,
      paddingHorizontal: space.sm + 2,
      paddingVertical: space.xs + 2,
    },
    actionText: {
      fontSize: fontSize.xs,
      fontWeight: '500',
      color: theme.color.textMuted,
    },
    removeText: {
      fontSize: fontSize.xs,
      color: theme.color.textMuted,
    },
  });
}
