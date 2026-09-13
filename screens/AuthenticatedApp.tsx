import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import HomeScreen from './HomeScreen';
import ChecklistsScreen from './ChecklistsScreen';
import TripsScreen from './TripsScreen';
import ChatScreen from './ChatScreen';
import type { ChatMessageRef } from '../lib/types';

type Tab = 'reminders' | 'checklists' | 'trips' | 'chat';

// Plain state instead of a navigation library — with only two flat tabs
// there's nothing yet that needs stack navigation/deep-linking. Revisit once
// Trip (Fase 4 item 5) actually needs nested screens.
export default function AuthenticatedApp({ session }: { session: Session }) {
  const [tab, setTab] = useState<Tab>('reminders');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Ingatin</Text>
          <Text style={styles.subtitle}>{session.user.email}</Text>
        </View>
        <Pressable onPress={() => supabase.auth.signOut()}>
          <Text style={styles.signOutText}>Keluar</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        {tab === 'reminders' && <HomeScreen userId={session.user.id} />}
        {tab === 'checklists' && <ChecklistsScreen />}
        {tab === 'trips' && <TripsScreen />}
        {tab === 'chat' && (
          <ChatScreen onNavigateToRef={(ref: ChatMessageRef) => setTab(ref.kind === 'reminder' ? 'reminders' : 'checklists')} />
        )}
      </View>

      <View style={styles.tabBar}>
        <Pressable style={styles.tabButton} onPress={() => setTab('reminders')}>
          <Text style={[styles.tabLabel, tab === 'reminders' && styles.tabLabelActive]}>⏰ Reminder</Text>
        </Pressable>
        <Pressable style={styles.tabButton} onPress={() => setTab('checklists')}>
          <Text style={[styles.tabLabel, tab === 'checklists' && styles.tabLabelActive]}>📋 Checklist</Text>
        </Pressable>
        <Pressable style={styles.tabButton} onPress={() => setTab('trips')}>
          <Text style={[styles.tabLabel, tab === 'trips' && styles.tabLabelActive]}>🧳 Trip</Text>
        </Pressable>
        <Pressable style={styles.tabButton} onPress={() => setTab('chat')}>
          <Text style={[styles.tabLabel, tab === 'chat' && styles.tabLabelActive]}>💬 Babel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#888',
    fontSize: 12,
  },
  signOutText: {
    color: '#666',
    fontSize: 13,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingBottom: 20,
    paddingTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 13,
    color: '#999',
  },
  tabLabelActive: {
    color: '#111',
    fontWeight: '700',
  },
});
