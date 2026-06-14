import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { clearMessages, messageCount } from '../db/db';
import { useAppStatus } from '../hooks/useAppStatus';
import { useI18n } from '../i18n/i18n';
import { LANGUAGE_LABELS, LANGUAGES, type Lang } from '../i18n/strings';
import { Notify } from '../native/NotifyModule';
import { PRESET_CHANNELS } from '../rules/channels';
import { setOnboardingComplete } from '../store/prefs';
import { DEFAULT_LOGO_COLOR, normalizeHex, useBrand } from '../ui/brand';
import { Body, Button, Card, Muted, SectionTitle, StatusRow } from '../ui/components';
import { Logo } from '../ui/Logo';
import { colors, radius, space } from '../ui/theme';
import type { ChannelStatus } from '../types';

const COLOR_PRESETS = ['#F97316', '#3B82F6', '#22C55E', '#EF4444', '#A855F7', '#0EA5E9', '#EAB308', '#111827'];

export function SettingsScreen({
  onResetOnboarding,
}: {
  onResetOnboarding: () => void;
}): React.JSX.Element {
  const { t, lang, setLang } = useI18n();
  const { logoColor, setLogoColor } = useBrand();
  const { status, refresh } = useAppStatus();
  const [diagnostic, setDiagnostic] = useState(false);
  const [count, setCount] = useState(0);
  const [channelStatuses, setChannelStatuses] = useState<Record<string, ChannelStatus>>({});
  const [hexDraft, setHexDraft] = useState(logoColor);
  const hexValid = normalizeHex(hexDraft) !== null;

  const onHexChange = useCallback(
    (text: string) => {
      setHexDraft(text);
      const norm = normalizeHex(text);
      if (norm) setLogoColor(norm);
    },
    [setLogoColor],
  );

  const applyColor = useCallback(
    (hex: string) => {
      setLogoColor(hex);
      setHexDraft(hex);
    },
    [setLogoColor],
  );

  const loadExtras = useCallback(async () => {
    try {
      setDiagnostic(await Notify.isDiagnosticMode());
      setCount(await messageCount());
      const entries = await Promise.all(
        PRESET_CHANNELS.map(async (c) => [c.id, await Notify.getChannelStatus(c.id)] as const),
      );
      setChannelStatuses(Object.fromEntries(entries));
    } catch {
      // native module unavailable
    }
  }, []);

  useEffect(() => {
    loadExtras();
  }, [loadExtras]);

  const onToggleDiagnostic = useCallback(async (v: boolean) => {
    setDiagnostic(v);
    await Notify.setDiagnosticMode(v);
  }, []);

  const onClearHistory = useCallback(() => {
    Alert.alert(t('set.clearHistory'), t('set.clearMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('set.clearHistory'),
        style: 'destructive',
        onPress: async () => {
          await clearMessages();
          setCount(0);
        },
      },
    ]);
  }, [t]);

  const onRestartSetup = useCallback(async () => {
    await setOnboardingComplete(false);
    onResetOnboarding();
  }, [onResetOnboarding]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <SectionTitle>{t('set.language')}</SectionTitle>
      <Card>
        {LANGUAGES.map((l: Lang) => (
          <View key={l} style={{ marginBottom: space(2) }}>
            <Button
              title={LANGUAGE_LABELS[l]}
              variant={lang === l ? 'primary' : 'secondary'}
              onPress={() => setLang(l)}
            />
          </View>
        ))}
      </Card>

      <SectionTitle>{t('set.brand')}</SectionTitle>
      <Card>
        <View style={styles.brandRow}>
          <Logo size={56} />
          <View style={styles.brandInfo}>
            <Muted>{t('set.brandDesc')}</Muted>
            <View style={{ height: space(2) }} />
            <TextInput
              value={hexDraft}
              onChangeText={onHexChange}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={DEFAULT_LOGO_COLOR}
              placeholderTextColor={colors.textDim}
              style={styles.hexInput}
            />
            {!hexValid && <Text style={styles.invalid}>{t('set.brandInvalid')}</Text>}
          </View>
        </View>
        <View style={styles.swatches}>
          {COLOR_PRESETS.map((p) => (
            <Pressable
              key={p}
              onPress={() => applyColor(p)}
              style={[
                styles.swatch,
                { backgroundColor: p, borderColor: logoColor === p ? colors.text : colors.border },
              ]}
            />
          ))}
        </View>
        <View style={{ height: space(2) }} />
        <Button variant="ghost" title={t('set.brandReset')} onPress={() => applyColor(DEFAULT_LOGO_COLOR)} />
      </Card>

      <SectionTitle>{t('set.status')}</SectionTitle>
      <Card>
        <StatusRow label={t('set.statusAccess')} ok={!!status?.accessGranted} />
        <StatusRow label={t('set.statusListener')} ok={!!status?.serviceConnected} />
        <StatusRow label={t('set.statusPost')} ok={!!status?.notificationsEnabled} />
        <StatusRow
          label={t('set.statusBattery')}
          ok={!!status?.batteryIgnored}
          detail={status?.manufacturer ? t('set.device', { mfr: status.manufacturer }) : undefined}
        />
        <View style={{ height: space(2) }} />
        <Button variant="secondary" title={t('set.recheck')} onPress={refresh} />
      </Card>

      <SectionTitle>{t('set.shortcuts')}</SectionTitle>
      <Card>
        <Button title={t('set.scAccess')} onPress={() => Notify.openNotificationAccessSettings()} />
        <View style={{ height: space(2) }} />
        <Button variant="secondary" title={t('set.scBattery')} onPress={() => Notify.openBatteryOptimizationSettings()} />
        <View style={{ height: space(2) }} />
        <Button variant="secondary" title={t('set.scAppNotif')} onPress={() => Notify.openAppNotificationSettings()} />
        <View style={{ height: space(2) }} />
        <Button variant="ghost" title={t('set.scAppDetails')} onPress={() => Notify.openAppDetailsSettings()} />
      </Card>

      <SectionTitle>{t('set.channels')}</SectionTitle>
      <Card>
        {PRESET_CHANNELS.map((c) => {
          const st = channelStatuses[c.id];
          const ok = st === 'ok';
          return (
            <Pressable key={c.id} style={styles.channelRow} onPress={() => Notify.openChannelSettings(c.id)}>
              <View style={[styles.dot, { backgroundColor: ok ? colors.success : colors.warn }]} />
              <View style={{ flex: 1 }}>
                <Body>{t('channel.' + c.id)}</Body>
                <Muted>
                  {st === 'blocked' ? t('set.chBlocked') : st === 'missing' ? t('set.chMissing') : t('set.chOk')}
                </Muted>
              </View>
            </Pressable>
          );
        })}
      </Card>

      <SectionTitle>{t('set.diagnostic')}</SectionTitle>
      <Card>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Body>{t('set.diagMode')}</Body>
            <Muted>{t('set.diagDesc')}</Muted>
          </View>
          <Switch value={diagnostic} onValueChange={onToggleDiagnostic} />
        </View>
      </Card>

      <SectionTitle>{t('set.data')}</SectionTitle>
      <Card>
        <Body>{t('set.archived', { n: count })}</Body>
        <View style={{ height: space(3) }} />
        <Button variant="danger" title={t('set.clearHistory')} onPress={onClearHistory} />
      </Card>

      <SectionTitle>{t('set.privacy')}</SectionTitle>
      <Card>
        <Muted>{t('set.privacyBody')}</Muted>
      </Card>

      <Button variant="ghost" title={t('set.rerun')} onPress={onRestartSetup} />
      <View style={{ height: space(10) }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space(4) },
  channelRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space(2) },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: space(3) },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandInfo: { flex: 1, marginLeft: space(4) },
  hexInput: {
    backgroundColor: colors.card2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: space(3),
    paddingVertical: space(2),
    fontSize: 15,
  },
  invalid: { color: colors.warn, fontSize: 12, marginTop: space(1) },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2), marginTop: space(3) },
  swatch: { width: 34, height: 34, borderRadius: radius.sm, borderWidth: 2 },
});
