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
import { Muted, SectionTitle } from '../ui/components';
import { SwipeableRow } from '../ui/SwipeableRow';
import { colors, radius, space } from '../ui/theme';
import type { ArchivedMessage, NotifyEvent } from '../types';

const SEARCH_DEBOUNCE_MS = 150;

export function CenterScreen(): React.JSX.Element {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ArchivedMessage[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryRef = useRef(query);
  queryRef.current = query;

  const load = useCallback(async (q: string) => {
    const data = q.trim() ? await searchMessages(q) : await recentMessages(200);
    setItems(data);
  }, []);

  const syncAndLoad = useCallback(async () => {
    try {
      await archivePendingEvents();
    } catch {
      // ignore drain errors
    }
    await load(queryRef.current);
  }, [load]);

  // Initial load (+ drain anything the native service queued while the app was closed).
  useEffect(() => {
    syncAndLoad();
  }, [syncAndLoad]);

  // Debounced search.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(query), SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, load]);

  // Live updates: when a new match arrives, drain + reload.
  useNotifyEvents(
    useCallback(
      (e: NotifyEvent) => {
        if (e.type === 'matched') syncAndLoad();
      },
      [syncAndLoad],
    ),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncAndLoad();
    setRefreshing(false);
  }, [syncAndLoad]);

  const onDelete = useCallback((id: number) => {
    // Optimistic remove; the FTS index is kept in sync by the delete trigger.
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
          await clearMessages().catch(() => {});
        },
      },
    ]);
  }, [t]);

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
            <SectionTitle>{t('center.emptyTitle')}</SectionTitle>
            <Muted>{t('center.emptyBody')}</Muted>
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
          {!!item.matchedKeyword && <Text style={styles.kw}>{item.matchedKeyword}</Text>}
          {!!item.ruleName && <Text style={styles.rule}>{item.ruleName}</Text>}
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
  metaRow: { flexDirection: 'row', marginTop: space(3), gap: space(2) },
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
  rule: { color: colors.textDim, fontSize: 12, alignSelf: 'center' },
});
