/**
 * Lightweight i18n: two flat dictionaries (TR/EN) + a translate() with {var} interpolation.
 * Default language is Turkish. No external dependency.
 */
export type Lang = 'tr' | 'en';

export const LANGUAGES: Lang[] = ['tr', 'en'];

export const LANGUAGE_LABELS: Record<Lang, string> = {
  tr: 'Türkçe',
  en: 'English',
};

type Dict = Record<string, string>;

const en: Dict = {
  // common
  'common.back': 'Back',
  'common.continue': 'Continue',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.ok': 'OK',
  'common.actionNeeded': 'Action needed',

  // tabs / titles
  'tab.deals': 'Filtered',
  'tab.other': 'Other',
  'tab.rules': 'Rules',
  'tab.settings': 'Settings',
  'title.center': 'Notification Center',
  'title.other': 'Other notifications',
  'title.rules': 'Filter Rules',
  'title.settings': 'Settings',

  // onboarding shell
  'ob.step': 'Step {n} of {total}',
  'ob.finish': 'Finish setup',
  // language step
  'ob.lang.title': 'Choose your language',
  'ob.lang.body': 'You can change this later in Settings.',
  // intro
  'ob.intro.title': 'Welcome to notify-plus',
  'ob.intro.body':
    "notify-plus reads your phone's notifications on-device, keeps only the Telegram deal messages that match your keywords, and re-alerts you loudly — so you can leave Telegram quiet and still catch the deals. Matched alerts mirror to your Galaxy Watch automatically.",
  'ob.intro.note':
    'Everything stays on your device. notify-plus does not log in to Telegram and never sends your notifications anywhere.',
  // access
  'ob.access.title': 'Grant notification access',
  'ob.access.body':
    'Grant Notification access so notify-plus can read incoming Telegram notifications and re-issue the ones you care about.',
  'ob.access.status': 'Notification access',
  'ob.access.btn': 'Open notification access settings',
  // post
  'ob.post.title': 'Allow notifications',
  'ob.post.body':
    'Allow notify-plus to post notifications (Android 13+). This is what shows the loud alert and mirrors it to your watch.',
  'ob.post.status': 'Post notifications',
  'ob.post.btn': 'Allow notifications',
  // telegram
  'ob.tg.title': 'Configure Telegram',
  'ob.tg.body': 'Configure Telegram so the deal channels still post (silent) notifications:',
  'ob.tg.b1': 'Settings → Notifications and Sounds → Message Previews = ON.',
  'ob.tg.b2':
    'For each deal channel: do NOT mute. Open it → set Sound to None / Disable Sound (it stays unmuted but silent).',
  'ob.tg.b3': 'Remove any Telegram passcode lock (a lock hides the message text).',
  'ob.tg.detected': 'Detected: {apps}',
  'ob.tg.none': 'No Telegram app detected — install Telegram and configure the channels above.',
  // battery
  'ob.bat.title': 'Keep it running',
  'ob.bat.body':
    'Android can kill background apps and stop delivering notifications. Exclude BOTH Telegram and notify-plus from battery optimization.',
  'ob.bat.bodyOem': ' On {mfr} devices this is often aggressive.',
  'ob.bat.status': 'notify-plus battery optimization',
  'ob.bat.detail': 'Should be: not optimized / unrestricted',
  'ob.bat.btn': 'Open battery optimization settings',
  'ob.bat.btn2': 'Open app details (autostart / unrestricted)',
  // diagnostic
  'ob.diag.title': 'Confirm it works',
  'ob.diag.body':
    "Let's confirm we actually receive readable text. Tap Start, then send or wait for a message in one configured Telegram channel.",
  'ob.diag.start': 'Start listening',
  'ob.diag.waiting': 'Waiting for a Telegram notification…',
  'ob.diag.generic':
    'Text looks hidden — check Message Previews / passcode / that the channel is not muted.',
  'ob.diag.noTitle': '(no title)',

  // center
  'center.search': 'Search filtered…',
  'center.count': '{n} filtered',
  'center.clearAll': 'Clear all',
  'center.emptyTitle': 'Nothing filtered yet',
  'center.emptyBody':
    'Matched messages will appear here. Make sure your rules and Telegram setup are configured, then wait for a matching message.',
  'center.emptyOtherTitle': 'Nothing here yet',
  'center.emptyOtherBody':
    'Telegram messages that do not match any keyword rule will appear here (when "Manage all Telegram notifications" is on).',
  'center.emptyExcludedTitle': 'No excluded messages',
  'center.emptyExcludedBody': 'Messages blocked by an exclude keyword will appear here.',
  'center.filterAll': 'All',
  'center.filterExcluded': 'Excluded',
  'center.clearMsg': 'Delete every item in this list?',

  // rules
  'rules.subtitle': 'Rules are evaluated top to bottom; the first match wins.',
  'rules.keywordCount': '{n} keyword(s)',
  'rules.empty': 'No rules yet. Add one to start catching deals.',
  'rules.new': '+ New rule',
  'rules.edit': 'Edit rule',
  'rules.name': 'Name',
  'rules.keywords': 'Keywords (match if ANY present)',
  'rules.keywordsPh': 'e.g. iphone, fiyat hatası',
  'rules.exclude': 'Exclude keywords (skip if ANY present)',
  'rules.excludePh': 'e.g. kılıf, aksesuar',
  'rules.channelFilter': 'Channel filter (optional)',
  'rules.channelFilterDesc':
    'Only match notifications whose chat/channel title contains any of these. Empty = any Telegram chat.',
  'rules.channelFilterPh': 'e.g. indirim kanalı',
  'rules.alertChannel': 'Alert channel (sound + vibration)',
  'rules.suppress': 'Hide the original Telegram notification on match',
  'rules.matchOptions': 'Match options',
  'rules.searchTitle': 'Search in channel name',
  'rules.searchTitleDesc': 'Include the channel/chat name when matching keywords',
  'rules.exactWordKw': 'Whole-word — keywords',
  'rules.exactWordKwDesc': 'Each keyword must be a whole word (not a substring)',
  'rules.exactWordExclude': 'Whole-word — excluded keywords',
  'rules.exactWordExcludeDesc': 'Excluded keywords must also be whole words',
  'rules.punctBoundary': 'Punctuation = word boundary',
  'rules.punctBoundaryDesc': '. , : ; ! ? ( ) [ ] " \' count as word boundaries',
  'rules.caseSensitive': 'Case sensitive',
  'rules.caseSensitiveDesc': 'A ≠ a — "iPhone" won\'t match "iphone"',
  'rules.turkishSensitive': 'Turkish character sensitive',
  'rules.turkishSensitiveDesc': 'ı ≠ i, ş ≠ s — Turkish chars stay distinct',
  'rules.requireAll': 'All keywords must match (AND)',
  'rules.requireAllDesc': 'Every keyword must be present at the same time',
  'rules.test': 'Test a sample message',
  'rules.testPh': 'Paste a sample deal message…',
  'rules.wouldMatch': '✓ Would match',
  'rules.wouldMatchKw': '✓ Would match ("{kw}")',
  'rules.wouldNot': '× Would not match',
  'rules.excludedBy': '× Excluded by "{kw}"',
  'rules.saveRule': 'Save rule',
  'rules.shareRule': 'Share this rule',
  'rules.deleteRule': 'Delete rule',
  'rules.exportAll': 'Export all rules',
  'rules.import': 'Import rules',
  'rules.importTitle': 'Import Rules',
  'rules.importPh': 'Paste exported rule JSON here…',
  'rules.importAdd': 'Add to existing',
  'rules.importReplace': 'Replace all',
  'rules.importError': 'Invalid JSON — paste the exported rule text.',
  'rules.importFound': '{n} rule(s) found',
  'rules.kwLimit': 'Max {n} keywords reached',
  'rules.kwTooLong': 'Max {n} chars per keyword',

  // channels (in-app labels)
  'channel.deals_high': 'High-value deals',
  'channel.deals_default': 'Normal deals',
  'channel.deals_silent': 'Silent (log only)',

  // settings
  'set.status': 'Status',
  'set.statusAccess': 'Notification access',
  'set.statusListener': 'Listener connected',
  'set.statusPost': 'Can post notifications',
  'set.statusBattery': 'Battery: unrestricted',
  'set.device': 'Device: {mfr}',
  'set.recheck': 'Re-check',
  'set.shortcuts': 'Fix-it shortcuts',
  'set.scAccess': 'Notification access',
  'set.scBattery': 'Battery optimization',
  'set.scAppNotif': 'App notification settings',
  'set.scAppDetails': 'App details (autostart)',
  'set.channels': 'Alert channels',
  'set.chBlocked': 'Disabled by user — tap to fix',
  'set.chMissing': 'Not created yet',
  'set.chOk': 'Tap to adjust sound/vibration',
  'set.diagnostic': 'Diagnostic',
  'set.diagMode': 'Diagnostic mode',
  'set.diagDesc':
    'Surfaces every Telegram notification (matched or not) so you can confirm capture. Turn off for normal use.',
  'set.data': 'Data',
  'set.archived': '{n} archived message(s) on this device.',
  'set.clearHistory': 'Clear history',
  'set.clearMsg': 'Delete all archived messages on this device?',
  'set.privacy': 'Privacy',
  'set.privacyBody':
    'notify-plus processes notifications entirely on your device. It does not log in to Telegram, and it never transmits your notifications or messages off the device.',
  'set.rerun': 'Re-run setup',
  'set.changelog': 'Changelog',
  'set.language': 'Language',
  'set.brand': 'Logo color',
  'set.brandDesc': 'Set the logo background color as a hex code.',
  'set.brandInvalid': 'Enter a valid hex, e.g. #F97316',
  'set.brandReset': 'Reset to orange',
  'set.brandLauncherNote':
    'Tapping a preset swatch also recolors the home-screen icon (may take a few seconds). A custom hex changes only the in-app logo.',
  'set.manage': 'Telegram notifications',
  'set.manageAll': 'Manage all Telegram notifications',
  'set.manageAllDesc':
    'Hide the original Telegram notification and put non-matching messages in the Other tab. Turn off to act only on keyword matches and leave other Telegram notifications untouched.',

  // auto cleanup
  'set.autoCleanup': 'Auto Cleanup',
  'set.autoCleanupDesc':
    'Automatically delete archived notifications older than the chosen interval. The cleanup runs at the set time each day/week/etc.',
  'set.cleanupNever': 'Never',
  'set.cleanupDaily': 'Daily',
  'set.cleanupWeekly': 'Weekly',
  'set.cleanupMonthly': 'Monthly',
  'set.cleanupYearly': 'Yearly',
  'set.cleanupTime': 'Cleanup time',
  'set.cleanupSave': 'Save schedule',
};

const tr: Dict = {
  // common
  'common.back': 'Geri',
  'common.continue': 'Devam',
  'common.cancel': 'İptal',
  'common.delete': 'Sil',
  'common.ok': 'Tamam',
  'common.actionNeeded': 'İşlem gerekli',

  // tabs / titles
  'tab.deals': 'Filtrelenenler',
  'tab.other': 'Diğer',
  'tab.rules': 'Kurallar',
  'tab.settings': 'Ayarlar',
  'title.center': 'Bildirim Merkezi',
  'title.other': 'Diğer bildirimler',
  'title.rules': 'Filtre Kuralları',
  'title.settings': 'Ayarlar',

  // onboarding shell
  'ob.step': 'Adım {n}/{total}',
  'ob.finish': 'Kurulumu bitir',
  // language
  'ob.lang.title': 'Dilini seç',
  'ob.lang.body': "Bunu daha sonra Ayarlar'dan değiştirebilirsin.",
  // intro
  'ob.intro.title': "notify-plus'a hoş geldin",
  'ob.intro.body':
    "notify-plus telefonundaki bildirimleri cihazda okur, yalnızca anahtar kelimelerinle eşleşen Telegram fırsat mesajlarını tutar ve seni sesli olarak uyarır — böylece Telegram'ı sessizde bırakıp fırsatları yine de yakalarsın. Eşleşen uyarılar Galaxy Watch'ına otomatik olarak yansır.",
  'ob.intro.note':
    "Her şey cihazında kalır. notify-plus Telegram'a giriş yapmaz ve bildirimlerini hiçbir yere göndermez.",
  // access
  'ob.access.title': 'Bildirim erişimi ver',
  'ob.access.body':
    "notify-plus'ın gelen Telegram bildirimlerini okuyabilmesi ve önemsediklerini yeniden gösterebilmesi için Bildirim erişimi ver.",
  'ob.access.status': 'Bildirim erişimi',
  'ob.access.btn': 'Bildirim erişimi ayarlarını aç',
  // post
  'ob.post.title': 'Bildirimlere izin ver',
  'ob.post.body':
    "notify-plus'ın bildirim göndermesine izin ver (Android 13+). Sesli uyarıyı gösteren ve saatine yansıtan budur.",
  'ob.post.status': 'Bildirim gönderme',
  'ob.post.btn': 'Bildirimlere izin ver',
  // telegram
  'ob.tg.title': "Telegram'ı ayarla",
  'ob.tg.body': "Fırsat kanallarının yine de (sessiz) bildirim göndermesi için Telegram'ı ayarla:",
  'ob.tg.b1': 'Ayarlar → Bildirimler ve Sesler → Mesaj Önizlemeleri = AÇIK.',
  'ob.tg.b2':
    'Her fırsat kanalı için: sessize ALMA. Kanalı aç → Sesi Yok / Sesi Kapat yap (sessize alınmaz ama sessiz olur).',
  'ob.tg.b3': 'Telegram parola kilidini kaldır (kilit mesaj metnini gizler).',
  'ob.tg.detected': 'Algılandı: {apps}',
  'ob.tg.none': 'Telegram uygulaması bulunamadı — Telegram yükle ve yukarıdaki kanalları ayarla.',
  // battery
  'ob.bat.title': 'Çalışır halde tut',
  'ob.bat.body':
    "Android arka plan uygulamalarını kapatıp bildirimleri durdurabilir. HEM Telegram'ı HEM notify-plus'ı pil optimizasyonundan hariç tut.",
  'ob.bat.bodyOem': ' {mfr} cihazlarında bu genellikle agresiftir.',
  'ob.bat.status': 'notify-plus pil optimizasyonu',
  'ob.bat.detail': 'Olması gereken: optimize edilmemiş / kısıtlanmamış',
  'ob.bat.btn': 'Pil optimizasyonu ayarlarını aç',
  'ob.bat.btn2': 'Uygulama detayları (otomatik başlat / kısıtlama yok)',
  // diagnostic
  'ob.diag.title': 'Çalıştığını doğrula',
  'ob.diag.body':
    "Gerçekten okunabilir metin aldığımızı doğrulayalım. Başlat'a dokun, sonra ayarlı bir Telegram kanalına mesaj gönder ya da bekle.",
  'ob.diag.start': 'Dinlemeyi başlat',
  'ob.diag.waiting': 'Telegram bildirimi bekleniyor…',
  'ob.diag.generic':
    'Metin gizli görünüyor — Mesaj Önizlemeleri / parola / kanalın sessize alınmadığını kontrol et.',
  'ob.diag.noTitle': '(başlık yok)',

  // center
  'center.search': 'Filtrelenenlerde ara…',
  'center.count': '{n} filtrelenen',
  'center.clearAll': 'Tümünü temizle',
  'center.emptyTitle': 'Henüz filtrelenen yok',
  'center.emptyBody':
    'Eşleşen mesajlar burada görünecek. Kurallarını ve Telegram ayarını yaptığından emin ol, sonra eşleşen bir mesaj bekle.',
  'center.emptyOtherTitle': 'Burada henüz bir şey yok',
  'center.emptyOtherBody':
    'Hiçbir anahtar kelime kuralına uymayan Telegram mesajları burada görünür ("Tüm Telegram bildirimlerini yönet" açıkken).',
  'center.emptyExcludedTitle': 'Hariç tutulan mesaj yok',
  'center.emptyExcludedBody': 'Hariç kelimesiyle engellenen mesajlar burada görünür.',
  'center.filterAll': 'Tümü',
  'center.filterExcluded': 'Hariç tutulanlar',
  'center.clearMsg': 'Bu listedeki tüm öğeler silinsin mi?',

  // rules
  'rules.subtitle': 'Kurallar yukarıdan aşağıya değerlendirilir; ilk eşleşen kazanır.',
  'rules.keywordCount': '{n} anahtar kelime',
  'rules.empty': 'Henüz kural yok. Fırsatları yakalamak için bir tane ekle.',
  'rules.new': '+ Yeni kural',
  'rules.edit': 'Kuralı düzenle',
  'rules.name': 'Ad',
  'rules.keywords': 'Anahtar kelimeler (HERHANGİ biri varsa eşleşir)',
  'rules.keywordsPh': 'örn. iphone, fiyat hatası',
  'rules.exclude': 'Hariç tutulan kelimeler (HERHANGİ biri varsa atla)',
  'rules.excludePh': 'örn. kılıf, aksesuar',
  'rules.channelFilter': 'Kanal filtresi (isteğe bağlı)',
  'rules.channelFilterDesc':
    'Yalnızca sohbet/kanal başlığı bunlardan birini içeren bildirimlerle eşleş. Boş = tüm Telegram sohbetleri.',
  'rules.channelFilterPh': 'örn. indirim kanalı',
  'rules.alertChannel': 'Uyarı kanalı (ses + titreşim)',
  'rules.suppress': 'Eşleşmede orijinal Telegram bildirimini gizle',
  'rules.matchOptions': 'Eşleşme seçenekleri',
  'rules.searchTitle': 'Kanal adında da ara',
  'rules.searchTitleDesc': 'Kanal/sohbet adını da anahtar kelime aramasına dahil et',
  'rules.exactWordKw': 'Tam kelime — anahtar kelimeler',
  'rules.exactWordKwDesc': 'Her anahtar kelime tam kelime olmalı (alt dize olmamalı)',
  'rules.exactWordExclude': 'Tam kelime — hariç tutulanlar',
  'rules.exactWordExcludeDesc': 'Hariç tutulan kelimeler de tam kelime olarak aranır',
  'rules.punctBoundary': 'Noktalama = kelime sınırı',
  'rules.punctBoundaryDesc': '. , : ; ! ? ( ) [ ] " \' kelime sınırı sayılır',
  'rules.caseSensitive': 'Büyük/küçük harf duyarlı',
  'rules.caseSensitiveDesc': 'A ≠ a — "iPhone" aranıyorsa "iphone" eşleşmez',
  'rules.turkishSensitive': 'Türkçe karakter duyarlı',
  'rules.turkishSensitiveDesc': 'ı ≠ i, ş ≠ s — Türkçe harfler ayrı tutulur',
  'rules.requireAll': 'Tüm kelimeler eşleşsin (AND)',
  'rules.requireAllDesc': 'Listedeki tüm kelimeler aynı anda bulunmalı',
  'rules.test': 'Örnek mesajı test et',
  'rules.testPh': 'Örnek bir fırsat mesajı yapıştır…',
  'rules.wouldMatch': '✓ Eşleşir',
  'rules.wouldMatchKw': '✓ Eşleşir ("{kw}")',
  'rules.wouldNot': '× Eşleşmez',
  'rules.excludedBy': '× "{kw}" hariç tuttu',
  'rules.saveRule': 'Kuralı kaydet',
  'rules.shareRule': 'Bu kuralı paylaş',
  'rules.deleteRule': 'Kuralı sil',
  'rules.exportAll': 'Tüm kuralları dışa aktar',
  'rules.import': 'Kuralları içe aktar',
  'rules.importTitle': 'Kural İçe Aktar',
  'rules.importPh': 'Dışa aktarılan kural JSON\'ını buraya yapıştır…',
  'rules.importAdd': 'Mevcut kurallara ekle',
  'rules.importReplace': 'Tümünü değiştir',
  'rules.importError': 'Geçersiz JSON — dışa aktarılan kural metnini yapıştır.',
  'rules.importFound': '{n} kural bulundu',
  'rules.kwLimit': 'En fazla {n} kelime eklenebilir',
  'rules.kwTooLong': 'Kelime en fazla {n} karakter olabilir',

  // channels
  'channel.deals_high': 'Yüksek değerli fırsatlar',
  'channel.deals_default': 'Normal fırsatlar',
  'channel.deals_silent': 'Sessiz (yalnızca kayıt)',

  // settings
  'set.status': 'Durum',
  'set.statusAccess': 'Bildirim erişimi',
  'set.statusListener': 'Dinleyici bağlı',
  'set.statusPost': 'Bildirim gönderebilir',
  'set.statusBattery': 'Pil: kısıtlamasız',
  'set.device': 'Cihaz: {mfr}',
  'set.recheck': 'Yeniden kontrol et',
  'set.shortcuts': 'Düzeltme kısayolları',
  'set.scAccess': 'Bildirim erişimi',
  'set.scBattery': 'Pil optimizasyonu',
  'set.scAppNotif': 'Uygulama bildirim ayarları',
  'set.scAppDetails': 'Uygulama detayları (otomatik başlat)',
  'set.channels': 'Uyarı kanalları',
  'set.chBlocked': 'Kullanıcı tarafından kapatıldı — düzeltmek için dokun',
  'set.chMissing': 'Henüz oluşturulmadı',
  'set.chOk': 'Ses/titreşim ayarlamak için dokun',
  'set.diagnostic': 'Tanılama',
  'set.diagMode': 'Tanılama modu',
  'set.diagDesc':
    'Her Telegram bildirimini (eşleşsin ya da eşleşmesin) gösterir, böylece yakalamayı doğrulayabilirsin. Normal kullanımda kapat.',
  'set.data': 'Veri',
  'set.archived': 'Bu cihazda {n} arşivlenmiş mesaj.',
  'set.clearHistory': 'Geçmişi temizle',
  'set.clearMsg': 'Bu cihazdaki tüm arşivlenmiş mesajlar silinsin mi?',
  'set.privacy': 'Gizlilik',
  'set.privacyBody':
    "notify-plus bildirimleri tamamen cihazında işler. Telegram'a giriş yapmaz ve bildirimlerini ya da mesajlarını cihaz dışına asla göndermez.",
  'set.rerun': 'Kurulumu tekrar çalıştır',
  'set.changelog': 'Değişiklik günlüğü',
  'set.language': 'Dil',
  'set.brand': 'Logo rengi',
  'set.brandDesc': 'Logo arka plan rengini hex kodu olarak ayarla.',
  'set.brandInvalid': 'Geçerli bir hex gir, örn. #F97316',
  'set.brandReset': 'Turuncuya sıfırla',
  'set.brandLauncherNote':
    'Hazır renge dokununca ana ekran ikonu da değişir (birkaç saniye sürebilir). Serbest hex sadece uygulama içi logoyu değiştirir.',
  'set.manage': 'Telegram bildirimleri',
  'set.manageAll': 'Tüm Telegram bildirimlerini yönet',
  'set.manageAllDesc':
    'Orijinal Telegram bildirimini gizler ve eşleşmeyen mesajları Diğer sekmesine koyar. Sadece anahtar kelime eşleşmelerinde işlem yapmak ve diğer Telegram bildirimlerine dokunmamak için kapat.',

  // otomatik temizleme
  'set.autoCleanup': 'Otomatik Temizleme',
  'set.autoCleanupDesc':
    'Belirlenen süreden eski arşivlenmiş bildirimleri otomatik sil. Temizleme her gün/hafta/ay/yıl belirlenen saatte çalışır.',
  'set.cleanupNever': 'Asla',
  'set.cleanupDaily': 'Günlük',
  'set.cleanupWeekly': 'Haftalık',
  'set.cleanupMonthly': 'Aylık',
  'set.cleanupYearly': 'Yıllık',
  'set.cleanupTime': 'Temizleme saati',
  'set.cleanupSave': 'Zamanlamayı kaydet',
};

export const dictionaries: Record<Lang, Dict> = { tr, en };

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  let str = dictionaries[lang][key] ?? en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return str;
}
