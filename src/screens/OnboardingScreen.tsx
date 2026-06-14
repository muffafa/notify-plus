import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PermissionsAndroid, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Notify } from '../native/NotifyModule';
import { useAppStatus } from '../hooks/useAppStatus';
import { useNotifyEvents } from '../hooks/useNotifyEvents';
import { useI18n } from '../i18n/i18n';
import { LANGUAGE_LABELS, LANGUAGES, type Lang } from '../i18n/strings';
import { ensurePresetChannels } from '../rules/channels';
import { loadRules, saveRules, starterRule } from '../rules/rules';
import { setOnboardingComplete } from '../store/prefs';
import { Body, Button, Card, Muted, SectionTitle, StatusRow } from '../ui/components';
import { Logo } from '../ui/Logo';
import { colors, space } from '../ui/theme';
import type { NotifyEvent } from '../types';

interface Capture {
  title: string;
  body: string;
  generic: boolean;
  matched: boolean;
  at: number;
}

export function OnboardingScreen({ onDone }: { onDone: () => void }): React.JSX.Element {
  const { t, lang, setLang } = useI18n();
  const [step, setStep] = useState(0);
  const { status, refresh } = useAppStatus();
  const [telegramApps, setTelegramApps] = useState<string[]>([]);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    Notify.getInstalledTelegramPackages()
      .then((apps) => setTelegramApps(apps.map((a) => a.label)))
      .catch(() => {});
  }, []);

  useNotifyEvents(
    useCallback((e: NotifyEvent) => {
      if (e.type === 'service') return;
      setCaptures((prev) =>
        [
          { title: e.sourceTitle, body: e.body, generic: e.generic, matched: e.matched, at: e.postedAt },
          ...prev,
        ].slice(0, 8),
      );
    }, []),
  );

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));

  const requestPostNotifications = useCallback(async () => {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      try {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      } catch {
        // ignore
      }
    }
    refresh();
  }, [refresh]);

  const enableDiagnostic = useCallback(async () => {
    setCaptures([]);
    await Notify.setDiagnosticMode(true);
  }, []);

  const finish = useCallback(async () => {
    setFinishing(true);
    try {
      await ensurePresetChannels();
      await Notify.setDiagnosticMode(false);
      const existing = await loadRules();
      if (existing.length === 0) {
        await saveRules([starterRule()]);
      }
      await setOnboardingComplete(true);
      onDone();
    } finally {
      setFinishing(false);
    }
  }, [onDone]);

  const steps = useMemo(
    () => ['lang', 'intro', 'access', 'post', 'telegram', 'battery', 'diagnostic'] as const,
    [],
  );
  const titleKeys: Record<string, string> = {
    lang: 'ob.lang.title',
    intro: 'ob.intro.title',
    access: 'ob.access.title',
    post: 'ob.post.title',
    telegram: 'ob.tg.title',
    battery: 'ob.bat.title',
    diagnostic: 'ob.diag.title',
  };

  const key = steps[step];

  return (
    <View style={styles.root}>
      <View style={styles.progressBar}>
        {steps.map((s, i) => (
          <View
            key={s}
            style={[styles.progressSeg, { backgroundColor: i <= step ? colors.primary : colors.border }]}
          />
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.logoWrap}>
          <Logo size={64} />
        </View>
        <SectionTitle>{t('ob.step', { n: step + 1, total: steps.length })}</SectionTitle>
        <Text style={styles.h1}>{t(titleKeys[key])}</Text>

        {key === 'lang' && (
          <Card>
            <Body>{t('ob.lang.body')}</Body>
            <View style={{ height: space(3) }} />
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
        )}

        {key === 'intro' && (
          <Card>
            <Body>{t('ob.intro.body')}</Body>
            <View style={{ height: space(3) }} />
            <Muted>{t('ob.intro.note')}</Muted>
          </Card>
        )}

        {key === 'access' && (
          <Card>
            <Body>{t('ob.access.body')}</Body>
            <View style={{ height: space(3) }} />
            <StatusRow label={t('ob.access.status')} ok={!!status?.accessGranted} />
            <View style={{ height: space(2) }} />
            <Button title={t('ob.access.btn')} onPress={() => Notify.openNotificationAccessSettings()} />
          </Card>
        )}

        {key === 'post' && (
          <Card>
            <Body>{t('ob.post.body')}</Body>
            <View style={{ height: space(3) }} />
            <StatusRow label={t('ob.post.status')} ok={!!status?.notificationsEnabled} />
            <View style={{ height: space(2) }} />
            <Button title={t('ob.post.btn')} onPress={requestPostNotifications} />
          </Card>
        )}

        {key === 'telegram' && (
          <Card>
            <Body>{t('ob.tg.body')}</Body>
            <View style={{ height: space(2) }} />
            <Bullet text={t('ob.tg.b1')} />
            <Bullet text={t('ob.tg.b2')} />
            <Bullet text={t('ob.tg.b3')} />
            <View style={{ height: space(2) }} />
            <Muted>
              {telegramApps.length
                ? t('ob.tg.detected', { apps: telegramApps.join(', ') })
                : t('ob.tg.none')}
            </Muted>
          </Card>
        )}

        {key === 'battery' && (
          <Card>
            <Body>
              {t('ob.bat.body')}
              {status?.manufacturer ? t('ob.bat.bodyOem', { mfr: status.manufacturer }) : ''}
            </Body>
            <View style={{ height: space(3) }} />
            <StatusRow label={t('ob.bat.status')} ok={!!status?.batteryIgnored} detail={t('ob.bat.detail')} />
            <View style={{ height: space(2) }} />
            <Button title={t('ob.bat.btn')} onPress={() => Notify.openBatteryOptimizationSettings()} />
            <View style={{ height: space(2) }} />
            <Button variant="ghost" title={t('ob.bat.btn2')} onPress={() => Notify.openAppDetailsSettings()} />
          </Card>
        )}

        {key === 'diagnostic' && (
          <Card>
            <Body>{t('ob.diag.body')}</Body>
            <View style={{ height: space(3) }} />
            <Button title={t('ob.diag.start')} variant="secondary" onPress={enableDiagnostic} />
            <View style={{ height: space(3) }} />
            {captures.length === 0 ? (
              <Muted>{t('ob.diag.waiting')}</Muted>
            ) : (
              captures.map((c, i) => (
                <View key={i} style={styles.captureRow}>
                  <Text style={styles.captureTitle}>{c.title || t('ob.diag.noTitle')}</Text>
                  {c.generic ? (
                    <Text style={{ color: colors.warn }}>{t('ob.diag.generic')}</Text>
                  ) : (
                    <Text style={styles.captureBody}>{c.body}</Text>
                  )}
                </View>
              ))
            )}
          </Card>
        )}

        <View style={styles.footer}>
          {step > 0 ? (
            <Button variant="ghost" title={t('common.back')} onPress={back} style={{ flex: 1 }} />
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <View style={{ width: space(3) }} />
          {step < steps.length - 1 ? (
            <Button title={t('common.continue')} onPress={next} style={{ flex: 1 }} />
          ) : (
            <Button title={t('ob.finish')} onPress={finish} loading={finishing} style={{ flex: 1 }} />
          )}
        </View>
        <View style={{ height: space(8) }} />
      </ScrollView>
    </View>
  );
}

function Bullet({ text }: { text: string }): React.JSX.Element {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  progressBar: { flexDirection: 'row', paddingHorizontal: space(4), paddingTop: space(3), gap: space(1) },
  progressSeg: { flex: 1, height: 4, borderRadius: 2 },
  scroll: { padding: space(4) },
  logoWrap: { alignItems: 'center', marginBottom: space(4), marginTop: space(2) },
  h1: { color: colors.text, fontSize: 26, fontWeight: '700', marginBottom: space(4) },
  footer: { flexDirection: 'row', marginTop: space(2) },
  bullet: { flexDirection: 'row', marginBottom: space(2) },
  bulletDot: { color: colors.accent, fontSize: 16, marginRight: space(2), lineHeight: 22 },
  bulletText: { color: colors.text, fontSize: 15, flex: 1, lineHeight: 22 },
  captureRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space(2), marginTop: space(2) },
  captureTitle: { color: colors.accent, fontWeight: '600', marginBottom: 2 },
  captureBody: { color: colors.text },
});
