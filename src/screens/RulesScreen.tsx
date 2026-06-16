import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useI18n } from '../i18n/i18n';
import { evaluateRule } from '../matching/match';
import { PRESET_CHANNELS } from '../rules/channels';
import { emptyRule, loadRules, newRuleId, saveRules } from '../rules/rules';
import { Body, Button, Card, Muted, SectionTitle, Tag } from '../ui/components';
import { colors, radius, space } from '../ui/theme';
import type { Rule, RuleMode } from '../types';

const MAX_KW_COUNT = 256;
const MAX_KW_LEN = 256;

// ─── rule import helper ───────────────────────────────────────────────────────

function sanitizeImported(raw: unknown): Rule[] {
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
    .map((r) => {
      const base = emptyRule();
      const strArr = (v: unknown): string[] =>
        Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
      return {
        ...base,
        id: newRuleId(),
        ...(typeof r.name === 'string' && { name: r.name }),
        ...(typeof r.enabled === 'boolean' && { enabled: r.enabled }),
        ...(typeof r.mode === 'string' && (r.mode === 'keywords' || r.mode === 'all') && { mode: r.mode }),
        ...(Array.isArray(r.sourcePackages) && { sourcePackages: strArr(r.sourcePackages) }),
        ...(Array.isArray(r.sourceTitleContains) && { sourceTitleContains: strArr(r.sourceTitleContains) }),
        keywords: strArr(r.keywords).slice(0, MAX_KW_COUNT),
        excludeKeywords: strArr(r.excludeKeywords).slice(0, MAX_KW_COUNT),
        ...(typeof r.channelId === 'string' && { channelId: r.channelId }),
        ...(typeof r.suppressOriginal === 'boolean' && { suppressOriginal: r.suppressOriginal }),
        ...(typeof r.searchTitle === 'boolean' && { searchTitle: r.searchTitle }),
        ...(typeof r.exactWord === 'boolean' && { exactWord: r.exactWord }),
        ...(typeof r.caseSensitive === 'boolean' && { caseSensitive: r.caseSensitive }),
        ...(typeof r.turkishSensitive === 'boolean' && { turkishSensitive: r.turkishSensitive }),
        ...(typeof r.requireAllKeywords === 'boolean' && { requireAllKeywords: r.requireAllKeywords }),
      };
    });
}

function parseImport(json: string): Rule[] | null {
  try {
    const parsed: unknown = JSON.parse(json);
    const rules = sanitizeImported(parsed);
    return rules.length > 0 ? rules : null;
  } catch {
    return null;
  }
}

// ─── RulesScreen (list) ───────────────────────────────────────────────────────

export function RulesScreen(): React.JSX.Element {
  const { t } = useI18n();
  const [rules, setRules] = useState<Rule[]>([]);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [showImport, setShowImport] = useState(false);

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

  const onExportAll = useCallback(async () => {
    if (rules.length === 0) return;
    await Share.share({ message: JSON.stringify(rules, null, 2) });
  }, [rules]);

  const onImportConfirm = useCallback(
    async (imported: Rule[], replace: boolean) => {
      const next = replace ? imported : [...rules, ...imported];
      await persist(next);
      setShowImport(false);
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
    <>
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
        <View style={{ height: space(2) }} />
        <Button variant="secondary" title={t('rules.import')} onPress={() => setShowImport(true)} />
        {rules.length > 0 && (
          <>
            <View style={{ height: space(2) }} />
            <Button variant="ghost" title={t('rules.exportAll')} onPress={onExportAll} />
          </>
        )}
        <View style={{ height: space(10) }} />
      </ScrollView>

      <ImportModal
        visible={showImport}
        onClose={() => setShowImport(false)}
        onConfirm={onImportConfirm}
      />
    </>
  );
}

// ─── ImportModal ──────────────────────────────────────────────────────────────

function ImportModal({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (rules: Rule[], replace: boolean) => void;
}): React.JSX.Element {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const parsed = text.trim() ? parseImport(text) : null;
  const hasText = text.trim().length > 0;

  const handleClose = () => {
    setText('');
    onClose();
  };

  const confirm = (replace: boolean) => {
    if (!parsed) return;
    onConfirm(parsed, replace);
    setText('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{t('rules.importTitle')}</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            placeholder={t('rules.importPh')}
            placeholderTextColor={colors.textDim}
            style={styles.importInput}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {hasText && (
            <Text style={{ color: parsed ? colors.success : colors.warn, fontSize: 13, marginBottom: space(2) }}>
              {parsed
                ? t('rules.importFound', { n: parsed.length })
                : t('rules.importError')}
            </Text>
          )}
          {parsed && (
            <>
              <Button title={t('rules.importAdd')} onPress={() => confirm(false)} />
              <View style={{ height: space(2) }} />
              <Button variant="danger" title={t('rules.importReplace')} onPress={() => confirm(true)} />
              <View style={{ height: space(2) }} />
            </>
          )}
          <Button variant="ghost" title={t('common.cancel')} onPress={handleClose} />
        </View>
      </View>
    </Modal>
  );
}

// ─── RuleEditor ───────────────────────────────────────────────────────────────

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

  const onShareRule = useCallback(async () => {
    await Share.share({ message: JSON.stringify([rule], null, 2) });
  }, [rule]);

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
              maxCount={MAX_KW_COUNT}
              maxLen={MAX_KW_LEN}
            />
            <View style={{ height: space(3) }} />
            <FieldLabel text={t('rules.exclude')} />
            <TagEditor
              values={rule.excludeKeywords}
              onChange={(excludeKeywords) => update({ excludeKeywords })}
              placeholder={t('rules.excludePh')}
              maxCount={MAX_KW_COUNT}
              maxLen={MAX_KW_LEN}
            />
            <View style={{ height: space(3) }} />
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Body>{t('rules.requireAll')}</Body>
                <Muted>{t('rules.requireAllDesc')}</Muted>
              </View>
              <Switch
                value={rule.requireAllKeywords ?? false}
                onValueChange={(v) => update({ requireAllKeywords: v })}
              />
            </View>
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
          maxCount={MAX_KW_COUNT}
          maxLen={MAX_KW_LEN}
        />
      </Card>

      <Card>
        <FieldLabel text={t('rules.matchOptions')} />
        <ToggleRow
          label={t('rules.searchTitle')}
          desc={t('rules.searchTitleDesc')}
          value={rule.searchTitle ?? true}
          onChange={(v) => update({ searchTitle: v })}
        />
        <View style={{ height: space(2) }} />
        <ToggleRow
          label={t('rules.exactWord')}
          desc={t('rules.exactWordDesc')}
          value={rule.exactWord ?? false}
          onChange={(v) => update({ exactWord: v })}
        />
        <View style={{ height: space(2) }} />
        <ToggleRow
          label={t('rules.caseSensitive')}
          desc={t('rules.caseSensitiveDesc')}
          value={rule.caseSensitive ?? false}
          onChange={(v) => update({ caseSensitive: v })}
        />
        <View style={{ height: space(2) }} />
        <ToggleRow
          label={t('rules.turkishSensitive')}
          desc={t('rules.turkishSensitiveDesc')}
          value={rule.turkishSensitive ?? false}
          onChange={(v) => update({ turkishSensitive: v })}
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
      <Button variant="secondary" title={t('rules.shareRule')} onPress={onShareRule} />
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ text }: { text: string }): React.JSX.Element {
  return <Text style={styles.fieldLabel}>{text}</Text>;
}

function ToggleRow({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}): React.JSX.Element {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Body>{label}</Body>
        <Muted>{desc}</Muted>
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
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
  maxCount,
  maxLen,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  maxCount?: number;
  maxLen?: number;
}): React.JSX.Element {
  const { t } = useI18n();
  const [draft, setDraft] = useState('');
  const [warn, setWarn] = useState('');

  const limit = maxCount ?? MAX_KW_COUNT;
  const lenLimit = maxLen ?? MAX_KW_LEN;

  const addItems = useCallback(
    (raw: string[]) => {
      const existing = new Set(values);
      const valid: string[] = [];
      let tooLong = false;

      for (const item of raw) {
        if (item.length > lenLimit) { tooLong = true; continue; }
        if (!existing.has(item) && item.length > 0) { existing.add(item); valid.push(item); }
      }

      if (values.length >= limit) {
        setWarn(t('rules.kwLimit', { n: limit }));
        return;
      }
      if (tooLong) {
        setWarn(t('rules.kwTooLong', { n: lenLimit }));
      } else {
        setWarn('');
      }
      const remaining = limit - values.length;
      if (valid.length > 0) onChange([...values, ...valid.slice(0, remaining)]);
    },
    [values, onChange, limit, lenLimit, t],
  );

  const onChangeText = (text: string) => {
    if (text.includes(',')) {
      const parts = text.split(',').map((s) => s.trim()).filter(Boolean);
      // Everything before the last segment gets added; last segment stays in draft
      const toAdd = parts.slice(0, -1);
      const remaining = parts[parts.length - 1] ?? '';
      if (toAdd.length > 0) addItems(toAdd);
      setDraft(remaining);
    } else {
      setDraft(text);
    }
  };

  const onSubmit = () => {
    const v = draft.trim();
    if (v) addItems([v]);
    setDraft('');
  };

  const atLimit = values.length >= limit;

  return (
    <View>
      <View style={styles.tagWrap}>
        {values.map((v) => (
          <Tag key={v} label={v} onRemove={() => { onChange(values.filter((x) => x !== v)); setWarn(''); }} />
        ))}
      </View>
      <TextInput
        value={draft}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        blurOnSubmit={false}
        returnKeyType="done"
        placeholder={atLimit ? t('rules.kwLimit', { n: limit }) : placeholder}
        placeholderTextColor={atLimit ? colors.warn : colors.textDim}
        style={styles.input}
        editable={!atLimit}
      />
      {!!warn && <Text style={styles.warnText}>{warn}</Text>}
      <Text style={styles.countText}>{values.length}/{limit}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  warnText: { color: colors.warn, fontSize: 12, marginTop: space(1) },
  countText: { color: colors.textDim, fontSize: 11, marginTop: space(1), textAlign: 'right' },
  // Import modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space(5),
    paddingBottom: space(8),
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: space(3),
  },
  importInput: {
    backgroundColor: colors.card2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: space(3),
    paddingVertical: space(3),
    fontSize: 13,
    height: 160,
    textAlignVertical: 'top',
    marginBottom: space(3),
    fontFamily: 'monospace',
  },
});
