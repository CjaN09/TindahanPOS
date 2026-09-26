import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
  ActivityIndicator,
} from 'react-native';

export default function SplashScreen({ onFinish }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Entrance Fade & Pop Animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Pulse Glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 3. Auto dismiss after 2.2 seconds
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 2200);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, pulseAnim, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Center Brand / Logo */}
      <Animated.View style={[styles.logoBox, { transform: [{ scale: scaleAnim }] }]}>
        <Animated.View style={[styles.glowRing, { transform: [{ scale: pulseAnim }] }]} />
        <View style={styles.iconCircle}>
          <Text style={styles.logoEmoji}>🏪</Text>
        </View>
      </Animated.View>

      <Text style={styles.superTitle}>SMART RETAIL CLOUD SUITE</Text>
      <Text style={styles.brandTitle}>
        Tindahan<Text style={{ color: '#38BDF8' }}>POS</Text>
      </Text>
      <Text style={styles.creatorTag}>Crafted by Christian Jher A. Naguna</Text>

      {/* Loading Progress Spinner */}
      <View style={styles.loaderSection}>
        <ActivityIndicator size="small" color="#38BDF8" />
        <Text style={styles.loaderText}>Initializing database and cloud sync...</Text>
      </View>

      {/* Bottom Splash Watermark */}
      <View style={styles.splashFooter}>
        <Text style={styles.splashFooterText}>v1.0.0 • Production Build</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070B14',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logoBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
  },
  logoEmoji: {
    fontSize: 38,
  },
  superTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 2,
    marginBottom: 4,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  creatorTag: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 6,
  },
  loaderSection: {
    marginTop: 40,
    alignItems: 'center',
    gap: 10,
  },
  loaderText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  splashFooter: {
    position: 'absolute',
    bottom: 30,
    alignItems: 'center',
  },
  splashFooterText: {
    fontSize: 10,
    color: '#334155',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});