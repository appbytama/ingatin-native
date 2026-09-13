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
import { getAssistantHistory, sendAssistantMessage } from '../lib/assistant';
import type { AssistantChatMessage, AssistantDraft, ChatMessageRef } from '../lib/types';
import ChatBubble from '../components/ChatBubble';

// Chat with "Babel" (the assistant) — calls the `assistant` Supabase Edge
// Function directly (see D:\APP\ingatin\supabase\functions\assistant),
// never the PWA's own deployed app. Scoped to reminder/checklist actions
// only for v1 — no trip actions yet (see the roadmap plan).
export default function ChatScreen({ onNavigateToRef }: { onNavigateToRef: (ref: ChatMessageRef) => void }) {
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
        <ActivityIndicator style={styles.loading} />
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
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          editable={!sending}
          multiline
        />
        <Pressable style={styles.sendButton} onPress={handleSend} disabled={!input.trim() || sending}>
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendButtonText}>Kirim</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loading: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  error: {
    color: '#b00020',
    fontSize: 12,
    paddingHorizontal: 16,
  },
  composer: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
