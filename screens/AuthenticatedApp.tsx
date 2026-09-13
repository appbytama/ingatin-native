import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, ListChecks, Plane, Settings, Share2 } from 'lucide-react-native';
import type { Session } from '@supabase/supabase-js';
import HomeScreen from './HomeScreen';
import SemuaScreen from './SemuaScreen';
import TripsScreen from './TripsScreen';
import SettingsScreen from './SettingsScreen';
import BabelPanel from '../components/BabelPanel';
import BabelFab from '../components/BabelFab';
import type { ChatMessageRef } from '../lib/types';
import { useTheme, space, fontSize, type Theme } from '../lib/theme';

type Tab = 'semua' | 'home' | 'trip';

// Mirrors the PWA's app shell exactly (read off its live DOM): a header
// (brand text-button + share icon, avatar with a settings badge), a 3-tab
// bottom nav with the home ("Ingatin") tab raised in an elevated circle,
// and Babel as a floating button + bottom sheet — NOT a 4th tab, which is
// how this app had it before. The avatar opens Pengaturan (Settings) as an
// overlay on top of whichever tab was last active — same as the PWA, whose
// bottom nav keeps its previous highlight while on /pengaturan rather than
// showing none active.
export default function AuthenticatedApp({ session }: { session: Session }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme);
  const [tab, setTab] = useState<Tab>('home');
  const [showSettings, setShowSettings] = useState(false);
  const [babelOpen, setBabelOpen] = useState(false);

  function switchTab(next: Tab) {
    setShowSettings(false);
    setTab(next);
  }

  const nickname = (session.user.user_metadata?.nickname as string | undefined) || session.user.email?.split('@')[0] || '?';
  const initial = nickname.charAt(0).toUpperCase();

  function handleNavigateToRef(ref: ChatMessageRef) {
    setBabelOpen(false);
    setTab(ref.kind === 'trip' ? 'trip' : 'semua');
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable style={styles.brandButton}>
          <Text style={styles.brandText}>ingatin.my.id</Text>
          <Share2 size={13} color={theme.color.textMuted} />
        </Pressable>
        <Pressable style={styles.avatarWrap} onPress={() => setShowSettings(true)} accessibilityLabel="Profil & Pengaturan">
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.avatarBadge}>
            <Settings size={9} color={theme.color.textMuted} />
          </View>
        </Pressable>
      </View>

      <View style={styles.content}>
        {showSettings ? (
          <SettingsScreen session={session} />
        ) : (
          <>
            {tab === 'semua' && <SemuaScreen />}
            {tab === 'home' && <HomeScreen userId={session.user.id} onOpenBabel={() => setBabelOpen(true)} />}
            {tab === 'trip' && <TripsScreen />}
          </>
        )}
      </View>

      <View style={[styles.tabBar, { paddingBottom: insets.bottom + space.sm }]}>
        <Pressable style={styles.tabButton} onPress={() => switchTab('semua')}>
          <ListChecks size={22} color={tab === 'semua' && !showSettings ? theme.color.primary : theme.color.textMuted} />
          <Text style={[styles.tabLabel, tab === 'semua' && !showSettings && styles.tabLabelActive]}>Semua</Text>
        </Pressable>
        <Pressable style={styles.tabButton} onPress={() => switchTab('home')}>
          <View style={styles.homeIconWrap}>
            <Bell size={22} color={tab === 'home' && !showSettings ? theme.color.primary : theme.color.textMuted} />
          </View>
          <Text style={[styles.tabLabel, tab === 'home' && !showSettings && styles.tabLabelActive]}>Ingatin</Text>
        </Pressable>
        <Pressable style={styles.tabButton} onPress={() => switchTab('trip')}>
          <Plane size={22} color={tab === 'trip' && !showSettings ? theme.color.primary : theme.color.textMuted} />
          <Text style={[styles.tabLabel, tab === 'trip' && !showSettings && styles.tabLabelActive]}>Ngetrip</Text>
        </Pressable>
      </View>

      {!babelOpen && <BabelFab onPress={() => setBabelOpen(true)} bottomInset={insets.bottom} />}

      <Modal visible={babelOpen} transparent animationType="slide" onRequestClose={() => setBabelOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setBabelOpen(false)} />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom }]}>
            <BabelPanel userId={session.user.id} onClose={() => setBabelOpen(false)} onNavigateToRef={handleNavigateToRef} />
          </View>
        </View>
      </Modal>
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
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.color.headerBg,
      borderBottomWidth: 1,
      borderBottomColor: theme.color.border,
      paddingHorizontal: space.lg,
      paddingBottom: space.sm - 2,
    },
    brandButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    brandText: {
      fontSize: fontSize.xs,
      fontWeight: '500',
      color: theme.color.textMuted,
    },
    avatarWrap: {
      position: 'relative',
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.color.primarySoftBgMid,
    },
    avatarText: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: theme.color.primarySoftTextStrong,
    },
    avatarBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 16,
      height: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.color.surface,
      borderWidth: 1,
      borderColor: theme.color.border,
    },
    content: {
      flex: 1,
    },
    tabBar: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: theme.color.surface,
      borderTopWidth: 1,
      borderTopColor: theme.color.border,
      paddingTop: space.sm,
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
      minHeight: 44,
    },
    homeIconWrap: {
      marginTop: -16,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.color.surface,
      borderWidth: 1,
      borderColor: theme.color.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 3,
    },
    tabLabel: {
      fontSize: fontSize.xs,
      fontWeight: '500',
      color: theme.color.textMuted,
    },
    tabLabelActive: {
      color: theme.color.primary,
    },
    modalRoot: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalSheet: {
      height: '75%',
      backgroundColor: theme.color.surface,
    },
  });
}
