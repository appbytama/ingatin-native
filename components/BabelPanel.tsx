import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowLeft, Bell, MoreHorizontal, Pencil, Send, X } from 'lucide-react-native';
import { getAssistantHistory, sendAssistantMessage } from '../lib/assistant';
import type { AssistantChatMessage, AssistantDraft, ChatMessageRef } from '../lib/types';
import ChatBubble from './ChatBubble';
import QuickAddReminder from './QuickAddReminder';
import { useTheme, space, radius, fontSize, iconSize, type Theme } from '../lib/theme';

type SubMode = 'chat' | 'manual';

// The sheet content for the floating Babel button — mirrors the PWA's
// assistant-fab panel (read off its live DOM): header with a bell icon +
// "Ingatin" + a "⋯" menu + close, message list, pill composer with a
// circular send button, and a "Manual" shortcut (shown once the
// conversation is empty, like the PWA's own Template/Manual buttons) that
// drops into a plain form instead of chatting — the PWA's Template mode
// isn't ported (no checklist-template picker built yet). The PWA's own
// morph-from-FAB animation and "⋯" clear-history menu aren't implemented —
// this opens as a plain sheet.
export default function BabelPanel({
  userId,
  onClose,
  onNavigateToRef,
}: {
  userId: string;
  onClose: () => void;
  onNavigateToRef: (ref: ChatMessageRef) => void;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [subMode, setSubMode] = useState<SubMode>('chat');
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
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Bell size={18} color={theme.color.primary} />
          <Text style={styles.headerTitle}>Ingatin</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={styles.headerIconButton} hitSlop={8}>
            <MoreHorizontal size={18} color={theme.color.textMuted} />
          </Pressable>
          <Pressable style={styles.headerIconButton} onPress={onClose} hitSlop={8} accessibilityLabel="Tutup">
            <X size={18} color={theme.color.textMuted} />
          </Pressable>
        </View>
      </View>

      {subMode === 'manual' ? (
        <ScrollView style={styles.manualScroll} contentContainerStyle={styles.manualContent}>
          <Pressable style={styles.backToChat} onPress={() => setSubMode('chat')} hitSlop={8}>
            <ArrowLeft size={13} color={theme.color.primary} />
            <Text style={styles.backToChatText}>Kembali ke chat</Text>
          </Pressable>
          <QuickAddReminder userId={userId} onCreated={onClose} />
        </ScrollView>
      ) : (
        <>
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

          {!loading && messages.length === 0 && (
            <View style={styles.shortcutRow}>
              <Pressable style={styles.shortcutButton} onPress={() => setSubMode('manual')}>
                <Pencil size={13} color={theme.color.textMuted} />
                <Text style={styles.shortcutText}>Manual</Text>
              </Pressable>
            </View>
          )}

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              placeholder="Ketik pesan…"
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
              accessibilityLabel="Kirim"
            >
              {sending ? <ActivityIndicator color={theme.color.onPrimary} size="small" /> : <Send size={iconSize.sm} color={theme.color.onPrimary} />}
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    panel: {
      flex: 1,
      backgroundColor: theme.color.surface,
      borderTopLeftRadius: radius.sheet + 8,
      borderTopRightRadius: radius.sheet + 8,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space.lg,
      paddingVertical: space.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.color.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.xs + 2,
    },
    headerTitle: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: theme.color.text,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerIconButton: {
      padding: space.xs + 2,
    },
    loading: {
      flex: 1,
    },
    listContent: {
      padding: space.lg,
    },
    shortcutRow: {
      flexDirection: 'row',
      gap: space.sm,
      paddingHorizontal: space.lg,
      paddingBottom: space.sm,
    },
    shortcutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.color.surfaceMuted,
      borderRadius: radius.pill,
      paddingHorizontal: space.md,
      paddingVertical: space.xs + 2,
    },
    shortcutText: {
      fontSize: fontSize.xs,
      fontWeight: '500',
      color: theme.color.textMuted,
    },
    manualScroll: {
      flex: 1,
    },
    manualContent: {
      padding: space.lg,
    },
    backToChat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: space.md,
    },
    backToChatText: {
      fontSize: fontSize.xs,
      color: theme.color.primary,
      fontWeight: '500',
    },
    error: {
      color: theme.color.destructive,
      fontSize: fontSize.xs,
      paddingHorizontal: space.lg,
    },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: space.sm,
      padding: space.md,
      borderTopWidth: 1,
      borderTopColor: theme.color.border,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: radius.sheet,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      fontSize: fontSize.sm,
      color: theme.color.text,
      backgroundColor: theme.color.background,
      maxHeight: 100,
      minHeight: 44,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      backgroundColor: theme.color.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: {
      opacity: 0.4,
    },
  });
}
