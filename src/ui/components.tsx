import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { useI18n } from '../i18n/i18n';
import { colors, radius, space } from './theme';

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}): React.JSX.Element {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Muted({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}): React.JSX.Element {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function Body({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}): React.JSX.Element {
  return <Text style={[styles.body, style]}>{children}</Text>;
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}): React.JSX.Element {
  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'danger'
        ? colors.danger
        : variant === 'secondary'
          ? colors.card2
          : 'transparent';
  const fg = variant === 'secondary' || variant === 'ghost' ? colors.text : colors.primaryText;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function StatusRow({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail?: string;
}): React.JSX.Element {
  const { t } = useI18n();
  return (
    <View style={styles.statusRow}>
      <View style={[styles.dot, { backgroundColor: ok ? colors.success : colors.warn }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.body}>{label}</Text>
        {detail ? <Text style={styles.muted}>{detail}</Text> : null}
      </View>
      <Text style={{ color: ok ? colors.success : colors.warn, fontWeight: '600' }}>
        {ok ? t('common.ok') : t('common.actionNeeded')}
      </Text>
    </View>
  );
}

export function Tag({
  label,
  onRemove,
}: {
  label: string;
  onRemove?: () => void;
}): React.JSX.Element {
  return (
    <Pressable onPress={onRemove} style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
      {onRemove ? <Text style={styles.tagRemove}>  ×</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space(4),
    marginBottom: space(3),
  },
  sectionTitle: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: space(2),
  },
  body: { color: colors.text, fontSize: 15 },
  muted: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  button: {
    paddingVertical: space(3),
    paddingHorizontal: space(4),
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  buttonText: { fontSize: 15, fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space(2) },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: space(3) },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card2,
    borderRadius: radius.sm,
    paddingVertical: space(1.5),
    paddingHorizontal: space(3),
    marginRight: space(2),
    marginBottom: space(2),
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: { color: colors.text, fontSize: 14 },
  tagRemove: { color: colors.textDim, fontSize: 16 },
});
