import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { playSound } from '../lib/sound';
import type { MissedReminderData } from './MissedRemindersBanner';
import { useTheme, space, radius, fontSize, type Theme } from '../lib/theme';

// Once per cold start, not once ever — the PWA gates this with
// sessionStorage (cleared when the browser tab closes); a plain in-memory
// module flag is the native equivalent of that lifetime, since AsyncStorage
// would persist across app restarts and only ever show this once.
let shownThisSession = false;

// Mirrors the PWA's MissedRemindersPopup exactly: a bottom-sheet styled as
// a chat bubble from the user's own assistant persona, shown once per app
// open if there's anything missed, dismiss-only (the banner below it on
// Home is where the actual per-item "Selesai" action lives).
export default function MissedRemindersPopup({
  items,
  assistantName,
  assistantAvatarUrl,
}: {
  items: MissedReminderData[];
  assistantName: string;
  assistantAvatarUrl?: string | null;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Unlike the PWA (server-rendered, so `items` already has its final
    // value on the very first client render), native fetches this list
    // async after mount — `items` starts empty and arrives later. Watching
    // it (rather than running once on an always-empty initial mount) is
    // what lets this actually fire once real data shows up; shownThisSession
    // still guards against firing again on a later, unrelated items change.
    if (items.length === 0 || shownThisSession) return;
    shownThisSession = true;
    setVisible(true);
    playSound('popup');
  }, [items]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            {assistantAvatarUrl ? (
              <Image source={{ uri: assistantAvatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Bell size={17} color={theme.color.primary} />
              </View>
            )}
            <View>
              <Text style={styles.assistantName}>{assistantName}</Text>
              <Text style={styles.assistantRole}>Asisten kamu</Text>
            </View>
          </View>

          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>
              Ada {items.length === 1 ? '1 hal' : `${items.length} hal`} yang kayaknya kelewat notif nih. Aku bantu inget lagi ya 👇
            </Text>
          </View>

          <View style={styles.list}>
            {items.slice(0, 5).map((item) => (
              <View key={item.id} style={styles.listItem}>
                <Text style={styles.listItemText} numberOfLines={1}>
                  {item.title}
                </Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.closeButton} onPress={() => setVisible(false)}>
            <Text style={styles.closeButtonText}>Oke, siap</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.color.surface,
      borderTopLeftRadius: radius.sheet,
      borderTopRightRadius: radius.sheet,
      padding: space.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm + 2,
      marginBottom: space.md,
    },
    avatarImage: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    avatarFallback: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.color.primarySoftBgMid,
      alignItems: 'center',
      justifyContent: 'center',
    },
    assistantName: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: theme.color.text,
    },
    assistantRole: {
      fontSize: fontSize.xs,
      color: theme.color.textMuted,
    },
    bubble: {
      backgroundColor: theme.color.surfaceMuted,
      borderRadius: radius.sheet,
      borderTopLeftRadius: radius.badge,
      paddingHorizontal: space.sm + 2,
      paddingVertical: space.sm + 4,
      marginBottom: space.md,
    },
    bubbleText: {
      fontSize: fontSize.sm,
      color: theme.color.text,
    },
    list: {
      gap: space.xs + 2,
      marginBottom: space.md,
      maxHeight: 160,
    },
    listItem: {
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: 8,
      paddingHorizontal: space.sm + 2,
      paddingVertical: space.sm - 2,
    },
    listItemText: {
      fontSize: fontSize.sm,
      color: theme.color.text,
    },
    closeButton: {
      backgroundColor: theme.color.primary,
      borderRadius: radius.sheet,
      paddingVertical: space.sm + 4,
      alignItems: 'center',
    },
    closeButtonText: {
      color: theme.color.onPrimary,
      fontWeight: '600',
      fontSize: fontSize.sm,
    },
  });
}
