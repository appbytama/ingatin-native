import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

const CYAN = '#22d3ee';
const VIOLET = '#7c3aed';
const PINK = '#f472b6';

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

// Mirrors the PWA's living-fab-aura.tsx (read off the live DOM's computed
// styles — see git history for the exact inset/style values pulled from
// the rendered button). Three layers behind the idle FAB: a blurred
// rotating color blob (approximates fabAuraMorph+fabHue — RN has no
// conic-gradient or CSS hue-rotate filter, so a rotating 3-stop
// LinearGradient stands in for the morphing/color-cycling plasma blob),
// three staggered expanding-and-fading rings (fabAuraPing, ported exactly:
// scale 0.85->1.6, opacity 0.7->0, 3s, 1s apart), and a spinning ring drawn
// as three colored arcs (fabAuraPing's sibling, the PWA's own "rotating
// dual-tone ring" per its code comment — SVG has no conic gradient either,
// so this is arcs instead of a smooth gradient sweep).
export default function LivingFabAura({ size }: { size: number }) {
  const blobRotate = useRef(new Animated.Value(0)).current;
  const ringSpin = useRef(new Animated.Value(0)).current;
  const ping0 = useRef(new Animated.Value(0)).current;
  const ping1 = useRef(new Animated.Value(0)).current;
  const ping2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loops = [
      Animated.loop(
        Animated.timing(blobRotate, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ),
      Animated.loop(Animated.timing(ringSpin, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true })),
      Animated.loop(
        Animated.stagger(1000, [
          Animated.timing(ping0, { toValue: 1, duration: 3000, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(ping1, { toValue: 1, duration: 3000, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(ping2, { toValue: 1, duration: 3000, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ])
      ),
    ];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const auraSize = size + 32; // PWA's aura container is inset:-16px on all sides
  const blobSize = auraSize * 0.76; // inset:12%
  const ringSize = auraSize * 0.88; // inset:6%

  const blobRotateDeg = blobRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const ringSpinDeg = ringSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={[styles.root, { width: auraSize, height: auraSize, pointerEvents: 'none' }]}>
      <Animated.View
        style={[
          styles.blob,
          { width: blobSize, height: blobSize, borderRadius: blobSize / 2, transform: [{ rotate: blobRotateDeg }] },
        ]}
      >
        <LinearGradient
          colors={[VIOLET, CYAN, PINK, VIOLET]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {[ping0, ping1, ping2].map((anim, i) => {
        const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.6] });
        const opacity = anim.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.7, 0] });
        const ringInset = auraSize * 0.1;
        const pingSize = auraSize - ringInset * 2;
        return (
          <Animated.View
            key={i}
            style={[
              styles.pingRing,
              {
                width: pingSize,
                height: pingSize,
                borderRadius: pingSize / 2,
                borderColor: [CYAN, VIOLET, PINK][i],
                opacity,
                transform: [{ scale }],
              },
            ]}
          />
        );
      })}

      <Animated.View style={[styles.spinRing, { width: ringSize, height: ringSize, transform: [{ rotate: ringSpinDeg }] }]}>
        <Svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
          <Path d={describeArc(ringSize / 2, ringSize / 2, ringSize / 2 - 2, 0, 100)} stroke={CYAN} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d={describeArc(ringSize / 2, ringSize / 2, ringSize / 2 - 2, 120, 220)} stroke={PINK} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d={describeArc(ringSize / 2, ringSize / 2, ringSize / 2 - 2, 240, 340)} stroke={VIOLET} strokeWidth={3} fill="none" strokeLinecap="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blob: {
    position: 'absolute',
    opacity: 0.75,
    overflow: 'hidden',
  },
  pingRing: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  spinRing: {
    position: 'absolute',
  },
});
