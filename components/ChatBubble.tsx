import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Bell, ClipboardList, Plane } from 'lucide-react-native';
import type { AssistantChatMessage, ChatMessageRef } from '../lib/types';
import { formatMessageTime } from '../lib/format';
import { useTheme, assistantBubbleGradient, space, radius, fontSize, type Theme } from '../lib/theme';

const REF_ICON = { reminder: Bell, checklist: ClipboardList, trip: Plane } as const;

// Mirrors the PWA's chat bubbles exactly (read off its live DOM +
// assistant-fab.tsx/chat-bubble.tsx source): rounded-2xl with one corner
// pinched to rounded-md (the "tail"), user = solid indigo-600, assistant =
// a diagonal indigo->violet gradient + small bell-avatar, a timestamp below
// (hidden on today's messages' bare time, "d MMM, HH:mm" otherwise — see
// formatMessageTime), and ref chips below that — three separate stacked
// rows, not one inline row (an earlier version of this component put refs
// beside the bubble instead of below it). Long-press copies the message
// text, mirroring the PWA's MessageActionsSheet — that sheet also offers
// Reply/Edit in trip/checklist chat, but the personal assistant thread has
// neither (no reply_to_id column, no edit window here), so it's
// copy-only there too — a menu with one item isn't worth the extra tap,
// so this copies directly instead of opening a picker first.
export default function ChatBubble({
  message,
  assistantAvatarUrl,
  onRefPress,
}: {
  message: AssistantChatMessage;
  assistantAvatarUrl?: string | null;
  onRefPress: (ref: ChatMessageRef) => void;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  async function handleLongPress() {
    await Clipboard.setStringAsync(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <View style={[styles.column, isUser ? styles.columnUser : styles.columnAssistant]}>
      <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
        {!isUser && (
          <View style={styles.avatar}>
            {assistantAvatarUrl ? (
              <Image source={{ uri: assistantAvatarUrl }} style={styles.avatarImage} />
            ) : (
              <Bell size={13} color={theme.color.primary} />
            )}
          </View>
        )}
        {isUser ? (
          <Pressable onLongPress={handleLongPress} style={[styles.bubble, styles.bubbleUser]}>
            <Text style={styles.textUser}>{message.text}</Text>
          </Pressable>
        ) : (
          <Pressable onLongPress={handleLongPress}>
            <LinearGradient
              colors={theme.scheme === 'dark' ? assistantBubbleGradient.dark : assistantBubbleGradient.light}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.bubble, styles.bubbleAssistant]}
            >
              <Text style={styles.textAssistant}>{message.text}</Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>

      <Text style={styles.timestamp}>{copied ? 'Disalin ✓' : message.createdAt ? formatMessageTime(message.createdAt) : ''}</Text>

      {message.refs && message.refs.length > 0 && (
        <View style={styles.refRow}>
          {message.refs.map((ref) => {
            const Icon = REF_ICON[ref.kind];
            return (
              <Pressable key={ref.id} style={styles.refChip} onPress={() => onRefPress(ref)} hitSlop={6}>
                <Icon size={12} color={theme.color.primarySoftTextStrong} />
                <Text style={styles.refChipText}>{ref.title}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    column: {
      marginBottom: space.md,
      maxWidth: '85%',
    },
    columnUser: {
      alignSelf: 'flex-end',
      alignItems: 'flex-end',
    },
    columnAssistant: {
      alignSelf: 'flex-start',
      alignItems: 'flex-start',
    },
    row: {
      maxWidth: '100%',
    },
    rowUser: {},
    rowAssistant: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 6,
    },
    avatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.color.primarySoftBgMid,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    bubble: {
      borderRadius: radius.sheet,
      paddingHorizontal: 14,
      paddingVertical: space.sm,
      maxWidth: '100%',
      flexShrink: 1,
    },
    bubbleUser: {
      backgroundColor: theme.color.primary,
      borderBottomRightRadius: radius.badge,
    },
    bubbleAssistant: {
      borderBottomLeftRadius: radius.badge,
    },
    textUser: {
      color: theme.color.onPrimary,
      fontSize: fontSize.sm,
    },
    textAssistant: {
      color: theme.color.primarySoftTextStrong,
      fontSize: fontSize.sm,
    },
    timestamp: {
      marginTop: 2,
      paddingHorizontal: 4,
      fontSize: fontSize.tiny,
      color: theme.color.textMuted,
    },
    refRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space.xs,
      marginTop: space.xs,
    },
    refChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: theme.color.primarySoftBgMid,
      backgroundColor: theme.color.primarySoftBg,
      borderRadius: radius.pill,
      paddingHorizontal: space.sm,
      paddingVertical: 4,
    },
    refChipText: {
      fontSize: fontSize.xs,
      color: theme.color.primarySoftTextStrong,
      fontWeight: '600',
    },
  });
}
