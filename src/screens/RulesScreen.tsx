import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useI18n } from '../i18n/i18n';
import { evaluateRule } from '../matching/match';
import { PRESET_CHANNELS } from '../rules/channels';
import { emptyRule, loadRules, saveRules } from '../rules/rules';
import { Body, Button, Card, Muted, SectionTitle, Tag } from '../ui/components';
import { colors, radius, space } from '../ui/theme';
import type { Rule, RuleMode } from '../types';

export function RulesScreen(): React.JSX.Element {
  const { t } = useI18n();
  const [rules, setRules] = useState<Rule[]>([]);
  const [editing, setEditing] = useState<Rule | null>(null);

  const reload = useCallback(async () => {
    setRules(await loadRules());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const persist = useCallback(async (next: Rule[]) => {
    setRules(next);
    await saveRules(next);
  }, []);

  const onSaveRule = useCallback(
    async (rule: Rule) => {
      const exists = rules.some((r) => r.id === rule.id);
      const next = exists ? rules.map((r) => (r.id === rule.id ? rule : r)) : [...rules, rule];
      await persist(next);
      setEditing(null);
    },
    [rules, persist],
  );

  const onDelete = useCallback(
    async (id: string) => {
      await persist(rules.filter((r) => r.id !== id));
      setEditing(null);
    },
    [rules, persist],
  );

  const onToggle = useCallback(
    async (id: string, enabled: boolean) => {
      await persist(rules.map((r) => (r.id === id ? { ...r, enabled } : r)));
    },
    [rules, persist],
  );

  if (editing) {
    return (
      <RuleEditor
        initial={editing}
        onCancel={() => setEditing(null)}
        onSave={onSaveRule}
        onDelete={rules.some((r) => r.id === editing.id) ? () => onDelete(editing.id) : undefined}
      />
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Muted>{t('rules.subtitle')}</Muted>
      <View style={{ height: space(3) }} />

      {rules.map((rule) => (
        <Card key={rule.id} style={styles.ruleCard}>
          <View style={styles.ruleHeader}>
            <Pressable style={{ flex: 1 }} onPress={() => setEditing(rule)}>
              <Text style={styles.ruleName}>{rule.name}</Text>
              <Muted>
                {rule.mode === 'all'
                  ? t('rules.modeAll')
                  : t('rules.keywordCount', { n: rule.keywords.length })}
                {`  ·  ${t('channel.' + rule.channelId)}`}
              </Muted>
            </Pressable>
            <Switch value={rule.enabled} onValueChange={(v) => onToggle(rule.id, v)} />
          </View>
        </Card>
      ))}

      {rules.length === 0 && <Muted>{t('rules.empty')}</Muted>}

      <View style={{ height: space(3) }} />
      <Button title={t('rules.new')} onPress={() => setEditing(emptyRule())} />
      <View style={{ height: space(10) }} />
    </ScrollView>
  );
}

function RuleEditor({
  initial,
  onCancel,
  onSave,
  onDelete,
}: {
  initial: Rule;
  onCancel: () => void;
  onSave: (rule: Rule) => void;
  onDelete?: () => void;
}): React.JSX.Element {
  const { t } = useI18n();
  const [rule, setRule] = useState<Rule>(initial);
  const [testText, setTestText] = useState('');

  const update = (patch: Partial<Rule>) => setRule((r) => ({ ...r, ...patch }));
  const testResult = evaluateRule(rule, '', testText);
  const testLabel = testResult.matched
    ? testResult.keyword
      ? t('rules.wouldMatchKw', { kw: testResult.keyword })
      : t('rules.wouldMatch')
    : t('rules.wouldNot');

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <SectionTitle>{t('rules.edit')}</SectionTitle>

      <Card>
        <FieldLabel text={t('rules.name')} />
        <TextInput
          value={rule.name}
          onChangeText={(text) => update({ name: text })}
          style={styles.input}
          placeholderTextColor={colors.textDim}
        />
      </Card>

      <Card>
        <FieldLabel text={t('rules.matchMode')} />
        <View style={styles.segment}>
          {(['keywords', 'all'] as RuleMode[]).map((m) => (
            <SegBtn
              key={m}
              active={rule.mode === m}
              label={m === 'keywords' ? t('rules.byKeywords') : t('rules.allFromSources')}
              onPress={() => update({ mode: m })}
            />
          ))}
        </View>
        {rule.mode === 'keywords' ? (
          <>
            <View style={{ height: space(3) }} />
            <FieldLabel text={t('rules.keywords')} />
            <TagEditor
              values={rule.keywords}
              onChange={(keywords) => update({ keywords })}
              placeholder={t('rules.keywordsPh')}
            />
            <View style={{ height: space(3) }} />
            <FieldLabel text={t('rules.exclude')} />
            <TagEditor
              values={rule.excludeKeywords}
              onChange={(excludeKeywords) => update({ excludeKeywords })}
              placeholder={t('rules.excludePh')}
            />
          </>
        ) : (
          <Muted>{t('rules.allNote')}</Muted>
        )}
      </Card>

      <Card>
        <FieldLabel text={t('rules.channelFilter')} />
        <Muted>{t('rules.channelFilterDesc')}</Muted>
        <View style={{ height: space(2) }} />
        <TagEditor
          values={rule.sourceTitleContains}
          onChange={(sourceTitleContains) => update({ sourceTitleContains })}
          placeholder={t('rules.channelFilterPh')}
        />
      </Card>

      <Card>
        <FieldLabel text={t('rules.alertChannel')} />
        <View style={styles.segmentWrap}>
          {PRESET_CHANNELS.map((c) => (
            <SegBtn
              key={c.id}
              active={rule.channelId === c.id}
              label={t('channel.' + c.id)}
              onPress={() => update({ channelId: c.id })}
            />
          ))}
        </View>
        <View style={styles.toggleRow}>
          <Body>{t('rules.suppress')}</Body>
          <Switch
            value={rule.suppressOriginal}
            onValueChange={(v) => update({ suppressOriginal: v })}
          />
        </View>
      </Card>

      <Card>
        <FieldLabel text={t('rules.test')} />
        <TextInput
          value={testText}
          onChangeText={setTestText}
          placeholder={t('rules.testPh')}
          placeholderTextColor={colors.textDim}
          style={[styles.input, { height: 70 }]}
          multiline
        />
        <View style={{ height: space(2) }} />
        <Text style={{ color: testResult.matched ? colors.success : colors.textDim, fontWeight: '600' }}>
          {testLabel}
        </Text>
      </Card>

      <Button title={t('rules.saveRule')} onPress={() => onSave(rule)} />
      <View style={{ height: space(2) }} />
      <Button variant="ghost" title={t('common.cancel')} onPress={onCancel} />
      {onDelete && (
        <>
          <View style={{ height: space(2) }} />
          <Button variant="danger" title={t('rules.deleteRule')} onPress={onDelete} />
        </>
      )}
      <View style={{ height: space(10) }} />
    </ScrollView>
  );
}

function FieldLabel({ text }: { text: string }): React.JSX.Element {
  return <Text style={styles.fieldLabel}>{text}</Text>;
}

function SegBtn({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segBtn, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
      <Text style={{ color: active ? colors.primaryText : colors.text, fontWeight: '600', fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function TagEditor({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}): React.JSX.Element {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  };
  return (
    <View>
      <View style={styles.tagWrap}>
        {values.map((v) => (
          <Tag key={v} label={v} onRemove={() => onChange(values.filter((x) => x !== v))} />
        ))}
      </View>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={add}
        blurOnSubmit={false}
        returnKeyType="done"
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space(4) },
  ruleCard: { marginBottom: space(2) },
  ruleHeader: { flexDirection: 'row', alignItems: 'center' },
  ruleName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  input: {
    backgroundColor: colors.card2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: space(3),
    paddingVertical: space(3),
    fontSize: 15,
  },
  fieldLabel: { color: colors.textDim, fontSize: 13, fontWeight: '600', marginBottom: space(2) },
  segment: { flexDirection: 'row', gap: space(2) },
  segmentWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2), marginBottom: space(3) },
  segBtn: {
    paddingVertical: space(2),
    paddingHorizontal: space(3),
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space(2),
  },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: space(2) },
});
