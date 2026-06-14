import React, { useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from './theme';

const ACTION_WIDTH = 100;
const OPEN_X = -ACTION_WIDTH;

/**
 * Swipe a row left to reveal a Delete button, then tap it. Built on RN's Animated + PanResponder
 * (no extra native deps). Horizontal swipes are claimed only when clearly horizontal, so the
 * FlatList keeps scrolling vertically.
 *
 * The child should be opaque (solid background) so it hides the action behind it when closed.
 */
export function SwipeableRow({
  children,
  onDelete,
  label = 'Delete',
}: {
  children: React.ReactNode;
  onDelete: () => void;
  label?: string;
}): React.JSX.Element {
  const translateX = useRef(new Animated.Value(0)).current;
  const open = useRef(false);
  const current = useRef(0);

  const settle = (to: number) => {
    Animated.spring(translateX, {
      toValue: to,
      useNativeDriver: true,
      bounciness: 0,
      speed: 20,
    }).start();
    current.current = to;
    open.current = to !== 0;
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_e, g) => {
        const base = open.current ? OPEN_X : 0;
        let next = base + g.dx;
        if (next > 0) next = 0;
        if (next < OPEN_X) next = OPEN_X;
        current.current = next;
        translateX.setValue(next);
      },
      onPanResponderRelease: () => settle(current.current < OPEN_X / 2 ? OPEN_X : 0),
      onPanResponderTerminate: () => settle(current.current < OPEN_X / 2 ? OPEN_X : 0),
    }),
  ).current;

  const remove = () => {
    Animated.timing(translateX, { toValue: -600, duration: 160, useNativeDriver: true }).start(
      () => onDelete(),
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.clip}>
        <View style={styles.actionContainer}>
          <Pressable style={styles.action} onPress={remove}>
            <Text style={styles.actionText}>{label}</Text>
          </Pressable>
        </View>
        <Animated.View style={{ transform: [{ translateX }] }} {...pan.panHandlers}>
          {children}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space(3) },
  clip: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  actionContainer: { position: 'absolute', top: 0, bottom: 0, right: 0, width: ACTION_WIDTH },
  action: {
    flex: 1,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
