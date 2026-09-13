import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, ClipboardList, Plane } from 'lucide-react-native';
import type { AssistantChatMessage, ChatMessageRef } from '../lib/types';
import { useTheme, assistantBubbleGradient, space, radius, fontSize, type Theme } from '../lib/theme';

const REF_ICON = { reminder: Bell, checklist: ClipboardList, trip: Plane } as const;

// Mirrors the PWA's chat bubbles exactly (read off its live DOM): rounded-2xl
// with one corner pinched to rounded-md (the "tail"), user = solid indigo-600,
// assistant = a diagonal indigo->violet gradient + small bell-avatar. The ref
// chip's own classes weren't directly captured (never inspected one in
// isolation) — styled here as the same soft-indigo pill used elsewhere
// (time badge / "Besok" badge / avatar), not a fresh guess.
export default function ChatBubble({
  message,
  onRefPress,
}: {
  message: AssistantChatMessage;
  onRefPress: (ref: ChatMessageRef) => void;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const isUser = message.role === 'user';

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Bell size={13} color={theme.color.primary} />
        </View>
      )}
      {isUser ? (
        <View style={[styles.bubble, styles.bubbleUser]}>
          <Text style={styles.textUser}>{message.text}</Text>
        </View>
      ) : (
        <LinearGradient
          colors={theme.scheme === 'dark' ? assistantBubbleGradient.dark : assistantBubbleGradient.light}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bubble, styles.bubbleAssistant]}
        >
          <Text style={styles.textAssistant}>{message.text}</Text>
        </LinearGradient>
      )}

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
    row: {
      marginBottom: space.md,
      maxWidth: '85%',
    },
    rowUser: {
      alignSelf: 'flex-end',
    },
    rowAssistant: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 6,
      maxWidth: '100%',
    },
    avatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.color.primarySoftBgMid,
      alignItems: 'center',
      justifyContent: 'center',
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
