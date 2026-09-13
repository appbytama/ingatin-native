import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Send } from 'lucide-react-native';
import { getAssistantHistory, sendAssistantMessage } from '../lib/assistant';
import type { AssistantChatMessage, AssistantDraft, ChatMessageRef } from '../lib/types';
import ChatBubble from '../components/ChatBubble';
import { useTheme, space, radius, fontSize, iconSize, type Theme } from '../lib/theme';

// Chat with "Babel" (the assistant) — calls the `assistant` Supabase Edge
// Function directly (see D:\APP\ingatin\supabase\functions\assistant),
// never the PWA's own deployed app.
export default function ChatScreen({ onNavigateToRef }: { onNavigateToRef: (ref: ChatMessageRef) => void }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [greeting, setGreeting] = useState<{ text: string; refs?: ChatMessageRef[] } | null>(null);
  const [draft, setDraft] = useState<AssistantDraft | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    getAssistantHistory()
      .then((data) => {
        setMessages(data.history);
        setGreeting(data.greeting);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Gagal memuat chat.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    const nextMessages = [...messages, { role: 'user' as const, text }];
    setMessages(nextMessages);
    setInput('');
    setGreeting(null);
    setSending(true);
    setError(null);

    try {
      const result = await sendAssistantMessage(nextMessages, draft);
      setMessages((prev) => [...prev, { role: 'assistant', text: result.reply, refs: result.refs }]);
      setDraft(result.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghubungi Babel.');
    } finally {
      setSending(false);
    }
  }

  const displayMessages = greeting ? [...messages, { role: 'assistant' as const, text: greeting.text, refs: greeting.refs }] : messages;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {loading ? (
        <ActivityIndicator style={styles.loading} color={theme.color.primary} />
      ) : (
        <FlatList
          ref={listRef}
          data={displayMessages}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => <ChatBubble message={item} onRefPress={onNavigateToRef} />}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Ngobrol sama Babel…"
          placeholderTextColor={theme.color.textMuted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          editable={!sending}
          multiline
        />
        <Pressable
          style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || sending}
          accessibilityLabel="Kirim pesan"
        >
          {sending ? <ActivityIndicator color={theme.color.onPrimary} size="small" /> : <Send size={iconSize.sm} color={theme.color.onPrimary} />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.color.background,
    },
    loading: {
      flex: 1,
    },
    listContent: {
      padding: space.lg,
    },
    error: {
      color: theme.color.destructive,
      fontSize: fontSize.xs,
      paddingHorizontal: space.lg,
    },
    composer: {
      flexDirection: 'row',
      gap: space.sm,
      padding: space.md,
      borderTopWidth: 1,
      borderTopColor: theme.color.border,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: radius.md,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      fontSize: fontSize.base,
      color: theme.color.text,
      backgroundColor: theme.color.surface,
      maxHeight: 100,
      minHeight: 44,
    },
    sendButton: {
      backgroundColor: theme.color.primary,
      borderRadius: radius.md,
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
  });
}
