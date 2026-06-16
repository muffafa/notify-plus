export interface ChangelogEntry {
  version: string;
  date: string;
  tr: string[];
  en: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.2.0',
    date: '2026-06-16',
    tr: [
      'Otomatik temizleme: günlük/haftalık/aylık/yıllık/asla seçeneğiyle belirli bir saatte eski bildirimleri sil',
      'Tam kelime eşleşmesi anahtar kelimeler ve hariç tutulanlar için ayrı ayrı ayarlanabilir',
      'Noktalama işareti kelime sınırı seçeneği ( . , : ! ? vb. )',
      'Değişiklik günlüğü ayarlar ekranına eklendi',
    ],
    en: [
      'Auto cleanup: delete old notifications on a daily/weekly/monthly/yearly/never schedule at a chosen time',
      'Whole-word match configurable separately for keywords and excluded keywords',
      'Punctuation-as-word-boundary option ( . , : ! ? etc. )',
      'Changelog added to Settings screen',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-06-15',
    tr: [
      'Eşleşme seçenekleri: kanal adında ara, tam kelime, büyük/küçük harf duyarlılığı, Türkçe karakter hassasiyeti',
      'AND modu: tüm kelimelerin aynı anda bulunması şartı (her kural için ayrı)',
      'Kural dışa/içe aktarma: Android paylaşım sayfasıyla kuralları paylaş',
      'Virgülle ayrılmış kelime girişi; 256 kelime / kelime başına 256 karakter sınırı',
      '"Diğer" ve "Filtrelenenler" sekmeleri eklendi',
      'Launcher ikonu renk varyantları (ayarlardan değiştirilebilir)',
    ],
    en: [
      'Match options per rule: search in channel name, whole-word, case sensitivity, Turkish character sensitivity',
      'AND mode: all keywords must be present simultaneously (per rule)',
      'Rule export/import: share rules via Android share sheet',
      'Comma-separated keyword input; 256 keyword / 256 char-per-keyword limits',
      'Added "Other" and "Filtered" tabs',
      'Launcher icon color variants (switchable from Settings)',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-06-14',
    tr: [
      'İlk sürüm',
      'Android Notification Listener ile Telegram bildirimi yakalama',
      'Anahtar kelime eşleşme kuralları (hariç tutma desteğiyle)',
      'Galaxy Watch / Wear OS otomatik yansıtma',
      'Özel ses + titreşim kanalları',
      'Cihazda Türkçe arama destekli SQLite arşiv',
      'Canlı tanılama göstergesine sahip kurulum sihirbazı',
      'Türkçe / İngilizce dil desteği',
    ],
    en: [
      'Initial release',
      'Telegram notification capture via Android Notification Listener',
      'Keyword match rules with exclude support',
      'Galaxy Watch / Wear OS automatic mirroring',
      'Custom sound + vibration channels',
      'On-device SQLite archive with Turkish-aware full-text search',
      'Onboarding wizard with live diagnostic',
      'Turkish / English language support',
    ],
  },
];
