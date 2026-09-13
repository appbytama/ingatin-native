import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, ClipboardList, LogOut, MessageCircle, Plane } from 'lucide-react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import HomeScreen from './HomeScreen';
import ChecklistsScreen from './ChecklistsScreen';
import TripsScreen from './TripsScreen';
import ChatScreen from './ChatScreen';
import type { ChatMessageRef } from '../lib/types';
import { useTheme, space, fontSize, iconSize, type Theme } from '../lib/theme';

type Tab = 'reminders' | 'checklists' | 'trips' | 'chat';

const TABS: { key: Tab; label: string; icon: typeof Bell }[] = [
  { key: 'reminders', label: 'Reminder', icon: Bell },
  { key: 'checklists', label: 'Checklist', icon: ClipboardList },
  { key: 'trips', label: 'Trip', icon: Plane },
  { key: 'chat', label: 'Babel', icon: MessageCircle },
];

// Plain state instead of a navigation library — with only four flat tabs
// there's nothing yet that needs stack navigation/deep-linking.
export default function AuthenticatedApp({ session }: { session: Session }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme);
  const [tab, setTab] = useState<Tab>('reminders');

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
        <View>
          <Text style={styles.title}>Ingatin</Text>
          <Text style={styles.subtitle}>{session.user.email}</Text>
        </View>
        <Pressable onPress={() => supabase.auth.signOut()} style={styles.signOutRow} hitSlop={10}>
          <LogOut size={iconSize.sm} color={theme.color.textMuted} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {tab === 'reminders' && <HomeScreen userId={session.user.id} />}
        {tab === 'checklists' && <ChecklistsScreen />}
        {tab === 'trips' && <TripsScreen />}
        {tab === 'chat' && (
          <ChatScreen
            onNavigateToRef={(ref: ChatMessageRef) =>
              setTab(ref.kind === 'reminder' ? 'reminders' : ref.kind === 'trip' ? 'trips' : 'checklists')
            }
          />
        )}
      </View>

      <View style={[styles.tabBar, { paddingBottom: insets.bottom + space.sm }]}>
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <Pressable key={key} style={styles.tabButton} onPress={() => setTab(key)} accessibilityRole="tab" accessibilityState={{ selected: active }}>
              <Icon size={iconSize.md} color={active ? theme.color.primary : theme.color.textMuted} />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.color.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: space.lg,
      paddingBottom: space.sm,
    },
    title: {
      fontSize: fontSize.xl,
      fontWeight: '700',
      color: theme.color.text,
    },
    subtitle: {
      color: theme.color.textMuted,
      fontSize: fontSize.xs,
    },
    signOutRow: {
      padding: space.xs,
    },
    content: {
      flex: 1,
    },
    tabBar: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: theme.color.border,
      paddingTop: space.sm,
      backgroundColor: theme.color.background,
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
      minHeight: 44,
      justifyContent: 'center',
    },
    tabLabel: {
      fontSize: fontSize.xs - 1,
      color: theme.color.textMuted,
    },
    tabLabelActive: {
      color: theme.color.primary,
      fontWeight: '700',
    },
  });
}
