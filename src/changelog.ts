export interface ChangelogEntry {
  version: string;
  date: string;
  tr: string[];
  en: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.1.0',
    date: '2026-06-15',
    tr: [
      'Eşleşme seçenekleri: kanal adında ara, tam kelime, büyük/küçük harf duyarlılığı, Türkçe karakter hassasiyeti',
      'AND modu: tüm kelimelerin aynı anda bulunması şartı (her kural için ayrı)',
      '"Fırsatlar" sekmesi "Filtrelenenler" olarak yeniden adlandırıldı',
    ],
    en: [
      'Match options per rule: search in channel name, whole-word, case sensitivity, Turkish character sensitivity',
      'AND mode: all keywords must be present simultaneously (per rule)',
      'Tab renamed from "Deals" to "Filtered"',
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
      'Launcher ikonu renk varyantları (ayarlardan değiştirilebilir)',
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
      'Launcher icon color variants (switchable from Settings)',
      'Turkish / English language support',
    ],
  },
];
