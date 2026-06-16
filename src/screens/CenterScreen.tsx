import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  archivePendingEvents,
  clearMessages,
  deleteMessage,
  recentMessages,
  searchMessages,
} from '../db/db';
import { useNotifyEvents } from '../hooks/useNotifyEvents';
import { useI18n } from '../i18n/i18n';
import { Notify } from '../native/NotifyModule';
import { Muted, SectionTitle } from '../ui/components';
import { SwipeableRow } from '../ui/SwipeableRow';
import { colors, radius, space } from '../ui/theme';
import type { ArchivedMessage, MessageKind, NotifyEvent } from '../types';

const SEARCH_DEBOUNCE_MS = 150;

export function CenterScreen({ kinds = ['matched'] }: { kinds?: MessageKind[] }): React.JSX.Element {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ArchivedMessage[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [kindFilter, setKindFilter] = useState<MessageKind | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryRef = useRef(query);
  queryRef.current = query;

  const isOtherTab = kinds.includes('other') || kinds.includes('excluded');

  const load = useCallback(
    async (q: string) => {
      const activeKinds = kindFilter ? [kindFilter] : kinds;
      const data = q.trim()
        ? await searchMessages(q, activeKinds)
        : await recentMessages(activeKinds, 200);
      setItems(data);
    },
    [kindFilter, kinds],
  );

  const syncAndLoad = useCallback(async () => {
    try {
      await archivePendingEvents();
    } catch {
      // ignore drain errors
    }
    await load(queryRef.current);
  }, [load]);

  useEffect(() => {
    syncAndLoad();
  }, [syncAndLoad]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(query), SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, load]);

  useNotifyEvents(
    useCallback(
      (e: NotifyEvent) => {
        if (e.type !== 'service' && kinds.includes(e.type as MessageKind)) syncAndLoad();
      },
      [syncAndLoad, kinds],
    ),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncAndLoad();
    setRefreshing(false);
  }, [syncAndLoad]);

  const onDelete = useCallback((id: number) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    deleteMessage(id).catch(() => {});
  }, []);

  const onClearAll = useCallback(() => {
    Alert.alert(t('center.clearAll'), t('center.clearMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('center.clearAll'),
        style: 'destructive',
        onPress: async () => {
          setItems([]);
          const toDelete = kindFilter ? [kindFilter] : kinds;
          await clearMessages(toDelete).catch(() => {});
          // Our loud match re-posts are the only system notifications; cancel them so the
          // launcher badge resets when the user clears the matched list.
          if (toDelete.includes('matched')) {
            await Notify.clearPostedNotifications().catch(() => {});
          }
        },
      },
    ]);
  }, [t, kinds, kindFilter]);

  const emptyTitle = kindFilter === 'excluded'
    ? t('center.emptyExcludedTitle')
    : isOtherTab
      ? t('center.emptyOtherTitle')
      : t('center.emptyTitle');
  const emptyBody = kindFilter === 'excluded'
    ? t('center.emptyExcludedBody')
    : isOtherTab
      ? t('center.emptyOtherBody')
      : t('center.emptyBody');

  return (
    <View style={styles.root}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t('center.search')}
        placeholderTextColor={colors.textDim}
        style={styles.search}
        autoCorrect={false}
        autoCapitalize="none"
      />

      {isOtherTab && (
        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterPill, kindFilter === null && styles.filterPillActive]}
            onPress={() => setKindFilter(null)}
          >
            <Text style={[styles.filterText, kindFilter === null && styles.filterTextActive]}>
              {t('center.filterAll')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterPill, kindFilter === 'excluded' && styles.filterPillExcluded]}
            onPress={() => setKindFilter(kindFilter === 'excluded' ? null : 'excluded')}
          >
            <Text style={[styles.filterText, kindFilter === 'excluded' && styles.filterTextExcluded]}>
              {t('center.filterExcluded')}
            </Text>
          </Pressable>
        </View>
      )}

      {items.length > 0 && (
        <View style={styles.toolbar}>
          <Muted>{t('center.count', { n: items.length })}</Muted>
          <Pressable onPress={onClearAll} hitSlop={8}>
            <Text style={styles.clearAll}>{t('center.clearAll')}</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textDim} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <SectionTitle>{emptyTitle}</SectionTitle>
            <Muted>{emptyBody}</Muted>
          </View>
        }
        renderItem={({ item }) => <MessageRow item={item} onDelete={onDelete} />}
      />
    </View>
  );
}

function MessageRow({
  item,
  onDelete,
}: {
  item: ArchivedMessage;
  onDelete: (id: number) => void;
}): React.JSX.Element {
  const { t } = useI18n();
  const time = new Date(item.postedAt).toLocaleString();
  const isExcluded = item.kind === 'excluded';
  return (
    <SwipeableRow onDelete={() => onDelete(item.id)} label={t('common.delete')}>
      <View style={styles.row}>
        <View style={styles.rowHeader}>
          <Text style={styles.source} numberOfLines={1}>
            {item.sourceTitle || item.sourcePackage}
          </Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        <Text style={styles.body}>{item.body}</Text>
        <View style={styles.metaRow}>
          {isExcluded && !!item.matchedKeyword && (
            <Text style={styles.kwExcluded}>{item.matchedKeyword}</Text>
          )}
          {isExcluded && !!item.ruleName && (
            <Text style={[styles.rule, styles.ruleExcluded]}>{item.ruleName}</Text>
          )}
          {!isExcluded && !!item.matchedKeyword && (
            <Text style={styles.kw}>{item.matchedKeyword}</Text>
          )}
          {!isExcluded && !!item.ruleName && (
            <Text style={styles.rule}>{item.ruleName}</Text>
          )}
        </View>
      </View>
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  search: {
    margin: space(4),
    marginBottom: space(2),
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    fontSize: 15,
  },
  filterRow: {
    flexDirection: 'row',
    gap: space(2),
    paddingHorizontal: space(4),
    paddingBottom: space(2),
  },
  filterPill: {
    paddingHorizontal: space(3),
    paddingVertical: space(1),
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
  filterPillExcluded: { borderColor: colors.danger, backgroundColor: colors.danger + '22' },
  filterText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: colors.primary },
  filterTextExcluded: { color: colors.danger },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space(4),
    paddingBottom: space(2),
  },
  clearAll: { color: colors.danger, fontWeight: '600', fontSize: 14 },
  list: { paddingHorizontal: space(4), paddingBottom: space(8) },
  empty: { paddingTop: space(12), alignItems: 'center' },
  row: {
    backgroundColor: colors.card,
    padding: space(4),
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: space(2) },
  source: { color: colors.accent, fontWeight: '700', flex: 1, marginRight: space(2) },
  time: { color: colors.textDim, fontSize: 12 },
  body: { color: colors.text, fontSize: 15, lineHeight: 21 },
  metaRow: { flexDirection: 'row', marginTop: space(3), gap: space(2), flexWrap: 'wrap' },
  kw: {
    color: colors.primaryText,
    backgroundColor: colors.primary,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: space(2),
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  kwExcluded: {
    color: colors.primaryText,
    backgroundColor: colors.danger,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: space(2),
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  rule: { color: colors.textDim, fontSize: 12, alignSelf: 'center' },
  ruleExcluded: { color: colors.danger },
});
