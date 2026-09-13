import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AssistantChatMessage, ChatMessageRef } from '../lib/types';

export default function ChatBubble({
  message,
  onRefPress,
}: {
  message: AssistantChatMessage;
  onRefPress: (ref: ChatMessageRef) => void;
}) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={isUser ? styles.textUser : styles.textAssistant}>{message.text}</Text>
      </View>
      {message.refs && message.refs.length > 0 && (
        <View style={styles.refRow}>
          {message.refs.map((ref) => (
            <Pressable key={ref.id} style={styles.refChip} onPress={() => onRefPress(ref)}>
              <Text style={styles.refChipText}>
                {ref.kind === 'reminder' ? '⏰' : ref.kind === 'trip' ? '🧳' : '📋'} {ref.title}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 10,
    maxWidth: '85%',
  },
  rowUser: {
    alignSelf: 'flex-end',
  },
  rowAssistant: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleUser: {
    backgroundColor: '#111',
  },
  bubbleAssistant: {
    backgroundColor: '#f0f0f0',
  },
  textUser: {
    color: '#fff',
    fontSize: 14,
  },
  textAssistant: {
    color: '#111',
    fontSize: 14,
  },
  refRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  refChip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  refChipText: {
    fontSize: 11,
  },
});
