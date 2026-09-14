import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ArrowLeft, Bell, MoreHorizontal, Pencil, Send, Trash2, X } from 'lucide-react-native';
import { deleteChatHistory, getAssistantHistory, sendAssistantMessage } from '../lib/assistant';
import { pickGreeting } from '../lib/greetings';
import { playSound } from '../lib/sound';
import type { AssistantChatMessage, AssistantDraft, ChatMessageRef } from '../lib/types';
import ChatBubble from './ChatBubble';
import TypingBubble from './TypingBubble';
import QuickAddReminder from './QuickAddReminder';
import { useTheme, space, radius, fontSize, iconSize, type Theme } from '../lib/theme';

type SubMode = 'chat' | 'manual';

// Cycled while waiting for a reply so a slow response reads as "still
// working on it" instead of a frozen indicator — verbatim from the PWA.
const WAITING_MESSAGES = ['Lagi mikir…', 'Bentar ya…', 'Ngecek dulu…', 'Sat set…', 'Hampir kelar…'];

// How long the panel stays open after a "done" reply before auto-closing —
// verbatim from the PWA (assistant-fab.tsx's AUTO_CLOSE_DELAY_MS).
const AUTO_CLOSE_DELAY_MS = 4500;

// The sheet content for the floating Babel button — mirrors the PWA's
// assistant-fab panel (read off its live DOM + source): header with a bell
// icon + assistant name + a "⋯" clear-history menu + close, message list
// with per-message timestamps and a typing indicator while waiting, a
// "Manual" shortcut (the PWA's Template shortcut isn't ported — no
// checklist-template picker built yet, see the full-parity plan's Phase
// 4.3), and an auto-close after the model signals the turn is "done". The
// PWA's own morph-from-FAB panel shape (a floating card that grows out of
// the button's own position, not a full bottom sheet) isn't ported —
// flagged as a known remaining gap rather than silently skipped.
export default function BabelPanel({
  userId,
  nickname,
  assistantName,
  assistantAvatarUrl,
  onClose,
  onNavigateToRef,
}: {
  userId: string;
  nickname: string;
  assistantName: string;
  assistantAvatarUrl?: string | null;
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
  const [waitingText, setWaitingText] = useState(WAITING_MESSAGES[0]);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  const listRef = useRef<FlatList>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getAssistantHistory()
      .then((data) => {
        setMessages(data.history);
        setGreeting(data.greeting);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Gagal memuat chat.'))
      .finally(() => setLoading(false));
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!sending) return;
    setWaitingText(WAITING_MESSAGES[0]);
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % WAITING_MESSAGES.length;
      setWaitingText(WAITING_MESSAGES[i]);
    }, 2200);
    return () => clearInterval(interval);
  }, [sending]);

  function cancelAutoClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function handleInputChange(text: string) {
    setInput(text);
    // Typing a follow-up is a clear "still here" signal — don't let the
    // idle auto-close timer cut them off mid-thought.
    cancelAutoClose();
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    cancelAutoClose();

    const nextMessages = [...messages, { role: 'user' as const, text }];
    setMessages(nextMessages);
    setInput('');
    setGreeting(null);
    setSending(true);
    setError(null);
    playSound('send');

    try {
      const result = await sendAssistantMessage(nextMessages, draft);
      setMessages((prev) => [...prev, { role: 'assistant', text: result.reply, refs: result.refs }]);
      setDraft(result.draft);
      playSound('receive');
      if (result.done) {
        closeTimer.current = setTimeout(onClose, AUTO_CLOSE_DELAY_MS);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghubungi Babel.');
    } finally {
      setSending(false);
    }
  }

  async function handleClearChat() {
    setClearingChat(true);
    try {
      await deleteChatHistory();
      setMessages([{ role: 'assistant', text: pickGreeting(nickname), createdAt: new Date().toISOString() }]);
      setGreeting(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus riwayat.');
    } finally {
      setClearingChat(false);
      setConfirmingClear(false);
      setMenuOpen(false);
    }
  }

  const displayMessages = greeting ? [...messages, { role: 'assistant' as const, text: greeting.text, refs: greeting.refs }] : messages;
  const headerTitle = subMode === 'chat' ? assistantName : 'Buat Reminder';

  return (
    <KeyboardAvoidingView style={styles.panel} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {assistantAvatarUrl ? (
            <Image source={{ uri: assistantAvatarUrl }} style={styles.headerAvatarImage} />
          ) : (
            <Bell size={18} color={theme.color.primary} />
          )}
          <Text style={styles.headerTitle}>{headerTitle}</Text>
        </View>
        <View style={styles.headerRight}>
          {subMode === 'chat' && messages.length > 0 && (
            <Pressable
              style={styles.headerIconButton}
              onPress={() => {
                setMenuOpen(true);
                setConfirmingClear(false);
              }}
              hitSlop={8}
              accessibilityLabel="Menu chat"
            >
              <MoreHorizontal size={18} color={theme.color.textMuted} />
            </Pressable>
          )}
          <Pressable style={styles.headerIconButton} onPress={onClose} hitSlop={8} accessibilityLabel="Tutup">
            <X size={18} color={theme.color.textMuted} />
          </Pressable>
        </View>
      </View>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={styles.menuCard}>
            {!confirmingClear ? (
              <Pressable style={styles.menuItem} onPress={() => setConfirmingClear(true)}>
                <Trash2 size={15} color={theme.color.destructive} />
                <Text style={styles.menuItemText}>Hapus riwayat chat</Text>
              </Pressable>
            ) : (
              <View style={styles.menuConfirm}>
                <Text style={styles.menuConfirmText}>Hapus semua chat ini?</Text>
                <View style={styles.menuConfirmRow}>
                  <Pressable style={styles.menuConfirmCancel} onPress={() => setConfirmingClear(false)} disabled={clearingChat}>
                    <Text style={styles.menuConfirmCancelText}>Batal</Text>
                  </Pressable>
                  <Pressable style={styles.menuConfirmDelete} onPress={handleClearChat} disabled={clearingChat}>
                    <Text style={styles.menuConfirmDeleteText}>{clearingChat ? '…' : 'Ya, hapus'}</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </Pressable>
      </Modal>

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
              renderItem={({ item }) => (
                <ChatBubble message={item} assistantAvatarUrl={assistantAvatarUrl} onRefPress={onNavigateToRef} />
              )}
              ListFooterComponent={
                sending ? (
                  <View style={styles.typingRow}>
                    <View style={styles.typingAvatar}>
                      {assistantAvatarUrl ? (
                        <Image source={{ uri: assistantAvatarUrl }} style={styles.typingAvatarImage} />
                      ) : (
                        <Bell size={13} color={theme.color.primary} />
                      )}
                    </View>
                    <View>
                      <TypingBubble />
                      <Text style={styles.waitingText}>{waitingText}</Text>
                    </View>
                  </View>
                ) : null
              }
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
              onChangeText={handleInputChange}
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
    </KeyboardAvoidingView>
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
    headerAvatarImage: {
      width: 18,
      height: 18,
      borderRadius: 9,
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
    menuBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.15)',
      alignItems: 'flex-end',
      paddingTop: 56,
      paddingRight: space.lg,
    },
    menuCard: {
      width: 208,
      backgroundColor: theme.color.surface,
      borderWidth: 1,
      borderColor: theme.color.border,
      borderRadius: radius.card,
      padding: space.xs + 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      paddingHorizontal: space.sm + 2,
      paddingVertical: space.sm,
      borderRadius: 8,
    },
    menuItemText: {
      fontSize: fontSize.sm,
      color: theme.color.destructive,
    },
    menuConfirm: {
      gap: space.sm,
      padding: space.xs + 2,
    },
    menuConfirmText: {
      fontSize: fontSize.xs,
      color: theme.color.textMuted,
    },
    menuConfirmRow: {
      flexDirection: 'row',
      gap: space.xs + 2,
    },
    menuConfirmCancel: {
      flex: 1,
      backgroundColor: theme.color.surfaceMuted,
      borderRadius: 8,
      paddingVertical: space.xs + 2,
      alignItems: 'center',
    },
    menuConfirmCancelText: {
      fontSize: fontSize.tiny,
      fontWeight: '500',
      color: theme.color.textMuted,
    },
    menuConfirmDelete: {
      flex: 1,
      backgroundColor: theme.color.destructive,
      borderRadius: 8,
      paddingVertical: space.xs + 2,
      alignItems: 'center',
    },
    menuConfirmDeleteText: {
      fontSize: fontSize.tiny,
      fontWeight: '600',
      color: '#fff',
    },
    loading: {
      flex: 1,
    },
    listContent: {
      padding: space.lg,
    },
    typingRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 6,
    },
    typingAvatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.color.primarySoftBgMid,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    typingAvatarImage: {
      width: '100%',
      height: '100%',
    },
    waitingText: {
      marginTop: 2,
      paddingHorizontal: 4,
      fontSize: fontSize.tiny,
      color: theme.color.textMuted,
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
