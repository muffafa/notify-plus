import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CHANGELOG } from '../changelog';
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

const CLEANUP_INTERVAL_KEYS = {
  never: 'set.cleanupNever',
  daily: 'set.cleanupDaily',
  weekly: 'set.cleanupWeekly',
  monthly: 'set.cleanupMonthly',
  yearly: 'set.cleanupYearly',
} as const;

// Preset hex -> launcher icon variant (must match the <activity-alias> names in AndroidManifest).
const COLOR_VARIANTS: { hex: string; variant: string }[] = [
  { hex: '#F97316', variant: 'Orange' },
  { hex: '#3B82F6', variant: 'Blue' },
  { hex: '#22C55E', variant: 'Green' },
  { hex: '#EF4444', variant: 'Red' },
  { hex: '#A855F7', variant: 'Purple' },
  { hex: '#0EA5E9', variant: 'Sky' },
  { hex: '#EAB308', variant: 'Yellow' },
  { hex: '#111827', variant: 'Dark' },
];

export function SettingsScreen({
  onResetOnboarding,
}: {
  onResetOnboarding: () => void;
}): React.JSX.Element {
  const { t, lang, setLang } = useI18n();
  const { logoColor, setLogoColor } = useBrand();
  const { status, refresh } = useAppStatus();
  const [diagnostic, setDiagnostic] = useState(false);
  const [manageAll, setManageAll] = useState(true);
  const [openVersions, setOpenVersions] = useState<Set<string>>(new Set());
  const [cleanupInterval, setCleanupIntervalState] = useState<'never' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('never');
  const [cleanupHour, setCleanupHour] = useState(3);
  const [cleanupMinute, setCleanupMinute] = useState(0);
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
      const v = COLOR_VARIANTS.find((c) => c.hex.toLowerCase() === hex.toLowerCase());
      if (v) Notify.setLauncherIconVariant(v.variant).catch(() => {});
    },
    [setLogoColor],
  );

  const loadExtras = useCallback(async () => {
    try {
      setDiagnostic(await Notify.isDiagnosticMode());
      setManageAll((await Notify.getPref('manageAll')) !== 'false');
      const ivPref = await Notify.getPref('cleanup_interval');
      setCleanupIntervalState((ivPref as typeof cleanupInterval) || 'never');
      const hPref = await Notify.getPref('cleanup_hour');
      setCleanupHour(hPref ? (parseInt(hPref, 10) || 3) : 3);
      const mPref = await Notify.getPref('cleanup_minute');
      setCleanupMinute(mPref ? (parseInt(mPref, 10) || 0) : 0);
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

  const onToggleManageAll = useCallback(async (v: boolean) => {
    setManageAll(v);
    await Notify.setPref('manageAll', v ? 'true' : 'false');
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

  const onSaveCleanup = useCallback(async () => {
    try {
      await Notify.scheduleCleanup(cleanupInterval, cleanupHour, cleanupMinute);
    } catch {
      // ignore if native module unavailable
    }
  }, [cleanupInterval, cleanupHour, cleanupMinute]);

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
          {COLOR_VARIANTS.map(({ hex }) => (
            <Pressable
              key={hex}
              onPress={() => applyColor(hex)}
              style={[
                styles.swatch,
                { backgroundColor: hex, borderColor: logoColor === hex ? colors.text : colors.border },
              ]}
            />
          ))}
        </View>
        <View style={{ height: space(2) }} />
        <Muted>{t('set.brandLauncherNote')}</Muted>
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

      <SectionTitle>{t('set.manage')}</SectionTitle>
      <Card>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Body>{t('set.manageAll')}</Body>
            <Muted>{t('set.manageAllDesc')}</Muted>
          </View>
          <Switch value={manageAll} onValueChange={onToggleManageAll} />
        </View>
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

      <SectionTitle>{t('set.autoCleanup')}</SectionTitle>
      <Card>
        <Muted>{t('set.autoCleanupDesc')}</Muted>
        <View style={{ height: space(3) }} />
        <View style={styles.intervalRow}>
          {(['never', 'daily', 'weekly', 'monthly', 'yearly'] as const).map((iv) => (
            <Pressable
              key={iv}
              style={[styles.intervalPill, cleanupInterval === iv && styles.intervalPillActive]}
              onPress={() => setCleanupIntervalState(iv)}
            >
              <Text style={[styles.intervalText, cleanupInterval === iv && styles.intervalTextActive]}>
                {t(CLEANUP_INTERVAL_KEYS[iv])}
              </Text>
            </Pressable>
          ))}
        </View>
        {cleanupInterval !== 'never' && (
          <>
            <View style={{ height: space(3) }} />
            <Body>{t('set.cleanupTime')}</Body>
            <View style={{ height: space(2) }} />
            <View style={styles.timePicker}>
              <View style={styles.timeUnit}>
                <TouchableOpacity onPress={() => setCleanupHour((h) => (h - 1 + 24) % 24)} style={styles.timeBtn}>
                  <Text style={styles.timeBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.timeValue}>{String(cleanupHour).padStart(2, '0')}</Text>
                <TouchableOpacity onPress={() => setCleanupHour((h) => (h + 1) % 24)} style={styles.timeBtn}>
                  <Text style={styles.timeBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.timeSep}>:</Text>
              <View style={styles.timeUnit}>
                <TouchableOpacity onPress={() => setCleanupMinute((m) => (m - 5 + 60) % 60)} style={styles.timeBtn}>
                  <Text style={styles.timeBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.timeValue}>{String(cleanupMinute).padStart(2, '0')}</Text>
                <TouchableOpacity onPress={() => setCleanupMinute((m) => (m + 5) % 60)} style={styles.timeBtn}>
                  <Text style={styles.timeBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
        <View style={{ height: space(3) }} />
        <Button title={t('set.cleanupSave')} onPress={onSaveCleanup} />
      </Card>

      <SectionTitle>{t('set.data')}</SectionTitle>
      <Card>
        <Body>{t('set.archived', { n: count })}</Body>
        <View style={{ height: space(3) }} />
        <Button variant="danger" title={t('set.clearHistory')} onPress={onClearHistory} />
      </Card>

      <SectionTitle>{t('set.changelog')}</SectionTitle>
      <Card>
        {CHANGELOG.map((entry, i) => {
          const open = openVersions.has(entry.version);
          return (
            <View key={entry.version}>
              {i > 0 && <View style={styles.clDivider} />}
              <Pressable
                style={styles.clHeader}
                onPress={() =>
                  setOpenVersions((prev) => {
                    const next = new Set(prev);
                    if (next.has(entry.version)) next.delete(entry.version);
                    else next.add(entry.version);
                    return next;
                  })
                }
              >
                <Text style={styles.clVersion}>v{entry.version}</Text>
                <Muted>{entry.date}</Muted>
                <Text style={styles.clChevron}>{open ? '▲' : '▼'}</Text>
              </Pressable>
              {open &&
                (lang === 'tr' ? entry.tr : entry.en).map((item, j) => (
                  <View key={j} style={styles.clItem}>
                    <Text style={styles.clBullet}>·</Text>
                    <Muted style={{ flex: 1 }}>{item}</Muted>
                  </View>
                ))}
            </View>
          );
        })}
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
  clHeader: { flexDirection: 'row', alignItems: 'center', gap: space(2), paddingVertical: space(1) },
  clVersion: { color: colors.text, fontWeight: '700', fontSize: 15 },
  clChevron: { marginLeft: 'auto', color: colors.textDim, fontSize: 12 },
  clItem: { flexDirection: 'row', gap: space(2), paddingLeft: space(2), marginTop: space(1) },
  clBullet: { color: colors.textDim, lineHeight: 20 },
  clDivider: { height: 1, backgroundColor: colors.border, marginVertical: space(2) },
  // cleanup
  intervalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  intervalPill: {
    paddingHorizontal: space(3),
    paddingVertical: space(2),
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card2,
  },
  intervalPillActive: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
  intervalText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  intervalTextActive: { color: colors.primary },
  timePicker: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
  timeUnit: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  timeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBtnText: { color: colors.text, fontSize: 20, lineHeight: 24, fontWeight: '600' },
  timeValue: { color: colors.text, fontSize: 28, fontWeight: '700', minWidth: 44, textAlign: 'center' },
  timeSep: { color: colors.text, fontSize: 28, fontWeight: '700' },
});
