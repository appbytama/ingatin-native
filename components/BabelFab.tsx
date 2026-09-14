import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, PanResponder, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell } from 'lucide-react-native';
import LivingFabAura from './LivingFabAura';
import { useTheme } from '../lib/theme';

const STORAGE_KEY = 'ingatin:fab-position';
const BUTTON_SIZE = 56;
const MARGIN = 12;
const DRAG_THRESHOLD = 6;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

// fabFloat's exact waypoints (globals.css), replayed as a looped sequence
// instead of a single sine wave so the wander matches the PWA's own
// slightly irregular drift rather than a perfectly smooth circle.
const FLOAT_WAYPOINTS: [number, number][] = [
  [0, 0],
  [6, -5],
  [-4, -8],
  [-7, 3],
  [3, 7],
  [0, 0],
];
const FLOAT_DURATION = 7000;

// fabHeartbeat's exact keyframe scale values, held at 1 for the back half
// of the cycle (the CSS only defines up to 48%) — a "lub-dub...pause".
const HEARTBEAT_WAYPOINTS: [number, number][] = [
  [0, 1],
  [0.12, 1.06],
  [0.24, 0.99],
  [0.36, 1.04],
  [0.48, 1],
  [1, 1],
];
const HEARTBEAT_DURATION = 2200;

function loopedWaypointSequence(anim: Animated.Value, waypoints: [number, number][], totalDuration: number) {
  const steps = [];
  for (let i = 1; i < waypoints.length; i++) {
    const [fromT] = waypoints[i - 1];
    const [toT, toV] = waypoints[i];
    steps.push(
      Animated.timing(anim, {
        toValue: toV,
        duration: (toT - fromT) * totalDuration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
  }
  return Animated.loop(Animated.sequence(steps));
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

  const floatAnim = useRef(new Animated.Value(0)).current;
  const heartbeatAnim = useRef(new Animated.Value(1)).current;
  const sweepAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.timing(floatAnim, { toValue: 1, duration: FLOAT_DURATION, easing: Easing.linear, useNativeDriver: true })
    );
    const heartbeatLoop = loopedWaypointSequence(heartbeatAnim, HEARTBEAT_WAYPOINTS, HEARTBEAT_DURATION);
    const sweepLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweepAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(sweepAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    floatLoop.start();
    heartbeatLoop.start();
    sweepLoop.start();
    return () => {
      floatLoop.stop();
      heartbeatLoop.stop();
      sweepLoop.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const floatSteps = FLOAT_WAYPOINTS.map((_, i) => i / (FLOAT_WAYPOINTS.length - 1));
  const floatX = floatAnim.interpolate({ inputRange: floatSteps, outputRange: FLOAT_WAYPOINTS.map((p) => p[0]) });
  const floatY = floatAnim.interpolate({ inputRange: floatSteps, outputRange: FLOAT_WAYPOINTS.map((p) => p[1]) });
  const sweepTranslate = sweepAnim.interpolate({ inputRange: [0, 1], outputRange: [-BUTTON_SIZE, BUTTON_SIZE] });

  return (
    <Animated.View
      style={[styles.wrap, { left: pos.x, top: pos.y, transform: [{ translateX: floatX }, { translateY: floatY }] }]}
    >
      <LivingFabAura size={BUTTON_SIZE} />
      <Animated.View
        style={[styles.fab, { backgroundColor: theme.color.primary, transform: [{ scale: heartbeatAnim }] }]}
        {...panResponder.panHandlers}
        accessibilityRole="button"
        accessibilityLabel="Buka asisten Ingatin"
      >
        <Animated.View style={[styles.sheen, { transform: [{ translateX: sweepTranslate }, { rotate: '35deg' }] }]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.28)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <Bell size={24} color={theme.color.onPrimary} />
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  sheen: {
    position: 'absolute',
    top: -BUTTON_SIZE * 0.5,
    left: -BUTTON_SIZE * 0.5,
    width: BUTTON_SIZE * 2,
    height: BUTTON_SIZE * 2,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
});
