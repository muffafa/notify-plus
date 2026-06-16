/**
 * notify-plus root. Android-first on-device Telegram deal filter.
 * See README.md for architecture and the on-device verification steps.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { archivePendingEvents, deleteMessagesOlderThan, initDb } from './src/db/db';
import { I18nProvider, useI18n } from './src/i18n/i18n';
import { Notify } from './src/native/NotifyModule';
import { ensurePresetChannels } from './src/rules/channels';
import { getOnboardingComplete } from './src/store/prefs';
import { CenterScreen } from './src/screens/CenterScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { RulesScreen } from './src/screens/RulesScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { BrandProvider } from './src/ui/brand';
import { Logo } from './src/ui/Logo';
import { colors, space } from './src/ui/theme';

type Phase = 'loading' | 'onboarding' | 'app';
type Tab = 'center' | 'other' | 'rules' | 'settings';

const TABS: { key: Tab; labelKey: string; titleKey: string }[] = [
  { key: 'center', labelKey: 'tab.deals', titleKey: 'title.center' },
  { key: 'other', labelKey: 'tab.other', titleKey: 'title.other' },
  { key: 'rules', labelKey: 'tab.rules', titleKey: 'title.rules' },
  { key: 'settings', labelKey: 'tab.settings', titleKey: 'title.settings' },
];

function AppInner(): React.JSX.Element {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>('loading');
  const [tab, setTab] = useState<Tab>('center');

  const runPendingCleanup = useCallback(async () => {
    try {
      const cutoff = await Notify.getAndClearCleanupCutoff();
      if (cutoff > 0) await deleteMessagesOlderThan(cutoff);
    } catch {
      // ignore: native module may not be available
    }
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      await ensurePresetChannels();
      await initDb();
      await archivePendingEvents();
      await runPendingCleanup();
    } catch {
      // native module not available until the Android app is rebuilt; UI still renders
    }
    const done = await getOnboardingComplete().catch(() => false);
    setPhase(done ? 'app' : 'onboarding');
  }, [runPendingCleanup]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Drain the native queue and run any pending cleanup whenever the app comes to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        archivePendingEvents().catch(() => {});
        runPendingCleanup();
      }
    });
    return () => sub.remove();
  }, [runPendingCleanup]);

  const activeTitleKey = TABS.find((tb) => tb.key === tab)?.titleKey ?? '';
  const activeTitle = activeTitleKey ? t(activeTitleKey) : '';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        {phase === 'loading' && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        )}

        {phase === 'onboarding' && <OnboardingScreen onDone={() => setPhase('app')} />}

        {phase === 'app' && (
          <View style={styles.appRoot}>
            <View style={styles.headerRow}>
              <Logo size={30} />
              <Text style={styles.header}>{activeTitle}</Text>
            </View>
            <View style={styles.content}>
              {tab === 'center' && <CenterScreen kinds={['matched']} />}
              {tab === 'other' && <CenterScreen kinds={['other', 'excluded']} />}
              {tab === 'rules' && <RulesScreen />}
              {tab === 'settings' && (
                <SettingsScreen onResetOnboarding={() => setPhase('onboarding')} />
              )}
            </View>
            <View style={styles.tabBar}>
              {TABS.map((tb) => (
                <Pressable key={tb.key} style={styles.tab} onPress={() => setTab(tb.key)}>
                  <Text style={[styles.tabLabel, tab === tb.key && styles.tabLabelActive]}>
                    {t(tb.labelKey)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  appRoot: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    paddingHorizontal: space(4),
    paddingTop: space(3),
    paddingBottom: space(2),
  },
  header: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: space(3) },
  tabLabel: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  tabLabelActive: { color: colors.primary },
});

function App(): React.JSX.Element {
  return (
    <I18nProvider>
      <BrandProvider>
        <AppInner />
      </BrandProvider>
    </I18nProvider>
  );
}

export default App;
