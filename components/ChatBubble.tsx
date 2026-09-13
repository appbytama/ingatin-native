import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell, ClipboardList, Plane } from 'lucide-react-native';
import type { AssistantChatMessage, ChatMessageRef } from '../lib/types';
import { useTheme, space, radius, fontSize, iconSize, type Theme } from '../lib/theme';

const REF_ICON = { reminder: Bell, checklist: ClipboardList, trip: Plane } as const;

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
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={isUser ? styles.textUser : styles.textAssistant}>{message.text}</Text>
      </View>
      {message.refs && message.refs.length > 0 && (
        <View style={styles.refRow}>
          {message.refs.map((ref) => {
            const Icon = REF_ICON[ref.kind];
            return (
              <Pressable key={ref.id} style={styles.refChip} onPress={() => onRefPress(ref)} hitSlop={6}>
                <Icon size={iconSize.sm - 3} color={theme.color.primaryText} />
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
    },
    bubble: {
      borderRadius: radius.lg,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
    },
    bubbleUser: {
      backgroundColor: theme.color.primary,
    },
    bubbleAssistant: {
      backgroundColor: theme.color.surfaceAlt,
    },
    textUser: {
      color: theme.color.onPrimary,
      fontSize: fontSize.base,
    },
    textAssistant: {
      color: theme.color.text,
      fontSize: fontSize.base,
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
      borderColor: theme.color.border,
      backgroundColor: theme.color.surface,
      borderRadius: radius.pill,
      paddingHorizontal: space.sm,
      paddingVertical: 4,
    },
    refChipText: {
      fontSize: fontSize.xs,
      color: theme.color.primaryText,
      fontWeight: '600',
    },
  });
}
