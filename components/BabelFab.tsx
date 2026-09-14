import { useEffect, useRef, useState } from 'react';
import { Dimensions, Image, PanResponder, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bell } from 'lucide-react-native';
import { useTheme } from '../lib/theme';

const STORAGE_KEY = 'ingatin:fab-position';
const BUTTON_SIZE = 56;
const MARGIN = 12;
const DRAG_THRESHOLD = 6;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

// Draggable + position-persisted, mirroring the PWA's assistant FAB
// (localStorage "ingatin:fab-position", same DRAG_THRESHOLD-gated
// tap-vs-drag logic — see assistant-fab.tsx). Built on a plain View, not
// Pressable: Pressable installs its own internal responder handlers
// (onStartShouldSetResponder/onResponderGrant/etc, via usePressEvents)
// under those exact same prop names PanResponder.panHandlers uses, and
// spreads them on *after* any handlers passed in — silently overriding
// ours, so the drag/tap logic below never ran. A bare View has no such
// competing responder wiring, so PanResponder owns the gesture outright.
//
// PanResponder.create() runs once (via useRef) so its callbacks close over
// whatever `pos` was on that first render — reading React state directly
// inside them would always see that stale snapshot. `posRef` is the
// mutable source of truth the callbacks actually read/write; `pos` state
// only exists to trigger a re-render at the new coordinates.
export default function BabelFab({
  onPress,
  bottomInset,
  avatarUrl,
}: {
  onPress: () => void;
  bottomInset: number;
  avatarUrl?: string | null;
}) {
  const theme = useTheme();
  const { width, height } = Dimensions.get('window');
  const maxX = width - BUTTON_SIZE - MARGIN;
  const maxY = height - BUTTON_SIZE - MARGIN;
  const defaultPos = { x: maxX, y: height - BUTTON_SIZE - bottomInset - 90 };

  const posRef = useRef(defaultPos);
  const [pos, setPos] = useState(defaultPos);
  const startPos = useRef(defaultPos);
  const dragged = useRef(false);

  function updatePos(next: { x: number; y: number }) {
    posRef.current = next;
    setPos(next);
  }

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (typeof saved.x === 'number' && typeof saved.y === 'number') {
          updatePos({ x: clamp(saved.x, MARGIN, maxX), y: clamp(saved.y, MARGIN, maxY) });
        }
      })
      .catch(() => {});
    // Only load once on mount — re-clamping on every resize isn't needed
    // for a phone app (orientation change is rare and RN remounts anyway).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragged.current = false;
        startPos.current = posRef.current;
      },
      onPanResponderMove: (_, gesture) => {
        if (!dragged.current && Math.hypot(gesture.dx, gesture.dy) < DRAG_THRESHOLD) return;
        dragged.current = true;
        updatePos({
          x: clamp(startPos.current.x + gesture.dx, MARGIN, maxX),
          y: clamp(startPos.current.y + gesture.dy, MARGIN, maxY),
        });
      },
      onPanResponderRelease: () => {
        if (dragged.current) {
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(posRef.current)).catch(() => {});
        } else {
          onPress();
        }
      },
    })
  ).current;

  return (
    <View
      style={[styles.fab, { left: pos.x, top: pos.y, backgroundColor: theme.color.primary }]}
      {...panResponder.panHandlers}
      accessibilityRole="button"
      accessibilityLabel="Buka asisten Ingatin"
    >
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
      ) : (
        <Bell size={24} color={theme.color.onPrimary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
});
