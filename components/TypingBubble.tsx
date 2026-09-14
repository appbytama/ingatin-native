import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useTheme, radius, type Theme } from '../lib/theme';

// Mirrors the PWA's TypingBubble (chat-bubble.tsx): three dots bouncing
// with a staggered delay (-0.3s/-0.15s/0s in CSS terms — reproduced here as
// staggered animation start times instead).
export default function TypingBubble() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const dot0 = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    function bounceLoop(anim: Animated.Value, delay: number) {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.delay(700 - delay),
        ])
      );
    }
    const loops = [bounceLoop(dot0, 0), bounceLoop(dot1, 150), bounceLoop(dot2, 300)];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.bubble}>
      {[dot0, dot1, dot2].map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: theme.color.chevron, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] },
          ]}
        />
      ))}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    bubble: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.color.surfaceMuted,
      borderRadius: radius.sheet,
      borderBottomLeftRadius: radius.badge,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
  });
}
