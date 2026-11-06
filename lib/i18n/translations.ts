export const LOCALES = [
  "ar",
  "en",
  "zh",
  "hi",
  "es",
  "fr",
  "de",
  "ru",
  "ja",
  "ko",
  "tr",
  "pt",
] as const;

export type Locale = (typeof LOCALES)[number];

export const LOCALE_COOKIE = "tf_locale";
export const LOCALE_STORAGE = "tf_locale";
export const DEFAULT_LOCALE: Locale = "ar";

export type LocaleMeta = {
  code: Locale;
  flag: string;
  nativeName: string;
  englishName: string;
  dir: "rtl" | "ltr";
  bcp47: string;
  /** Name of the language for AI system prompts */
  aiName: string;
};

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  ar: {
    code: "ar",
    flag: "🇸🇦",
    nativeName: "العربية",
    englishName: "Arabic",
    dir: "rtl",
    bcp47: "ar-SA",
    aiName: "Arabic",
  },
  en: {
    code: "en",
    flag: "🇬🇧",
    nativeName: "English",
    englishName: "English",
    dir: "ltr",
    bcp47: "en-US",
    aiName: "English",
  },
  zh: {
    code: "zh",
    flag: "🇨🇳",
    nativeName: "简体中文",
    englishName: "Chinese",
    dir: "ltr",
    bcp47: "zh-CN",
    aiName: "Simplified Chinese",
  },
  hi: {
    code: "hi",
    flag: "🇮🇳",
    nativeName: "हिन्दी",
    englishName: "Hindi",
    dir: "ltr",
    bcp47: "hi-IN",
    aiName: "Hindi",
  },
  es: {
    code: "es",
    flag: "🇪🇸",
    nativeName: "Español",
    englishName: "Spanish",
    dir: "ltr",
    bcp47: "es-ES",
    aiName: "Spanish",
  },
  fr: {
    code: "fr",
    flag: "🇫🇷",
    nativeName: "Français",
    englishName: "French",
    dir: "ltr",
    bcp47: "fr-FR",
    aiName: "French",
  },
  de: {
    code: "de",
    flag: "🇩🇪",
    nativeName: "Deutsch",
    englishName: "German",
    dir: "ltr",
    bcp47: "de-DE",
    aiName: "German",
  },
  ru: {
    code: "ru",
    flag: "🇷🇺",
    nativeName: "Русский",
    englishName: "Russian",
    dir: "ltr",
    bcp47: "ru-RU",
    aiName: "Russian",
  },
  ja: {
    code: "ja",
    flag: "🇯🇵",
    nativeName: "日本語",
    englishName: "Japanese",
    dir: "ltr",
    bcp47: "ja-JP",
    aiName: "Japanese",
  },
  ko: {
    code: "ko",
    flag: "🇰🇷",
    nativeName: "한국어",
    englishName: "Korean",
    dir: "ltr",
    bcp47: "ko-KR",
    aiName: "Korean",
  },
  tr: {
    code: "tr",
    flag: "🇹🇷",
    nativeName: "Türkçe",
    englishName: "Turkish",
    dir: "ltr",
    bcp47: "tr-TR",
    aiName: "Turkish",
  },
  pt: {
    code: "pt",
    flag: "🇧🇷",
    nativeName: "Português",
    englishName: "Portuguese",
    dir: "ltr",
    bcp47: "pt-BR",
    aiName: "Portuguese",
  },
};

/** Flat dictionary keys used across the app */
export type MessageKey =
  | "nav.dashboard"
  | "nav.marketplace"
  | "nav.properties"
  | "nav.wallet"
  | "nav.subscribe"
  | "nav.approvals"
  | "nav.withdraw"
  | "nav.audit"
  | "nav.menu"
  | "nav.login"
  | "nav.controlPanel"
  | "nav.language"
  | "nav.user"
  | "common.loading"
  | "common.save"
  | "common.cancel"
  | "common.error"
  | "common.month"
  | "common.mostPopular"
  | "home.preparing"
  | "home.eyebrow"
  | "home.heroTitle1"
  | "home.heroTitle2"
  | "home.heroSub"
  | "home.ctaStart"
  | "home.ctaPlans"
  | "home.statYield"
  | "home.statSecurity"
  | "home.statTwins"
  | "home.statSessions"
  | "home.previewLabel"
  | "home.previewName"
  | "home.previewLive"
  | "home.vitalEnergy"
  | "home.vitalMood"
  | "home.morningTitle"
  | "home.morningBody"
  | "home.morningListen"
  | "home.lastDeposit"
  | "home.plansTitle"
  | "home.plansSub"
  | "home.subscribeNow"
  | "home.featuresTitle"
  | "home.featuresSub"
  | "home.footerAbout"
  | "home.footerTerms"
  | "home.footerPrivacy"
  | "home.footerAudit"
  | "home.footerCopy"
  | "home.ticker1"
  | "home.ticker2"
  | "home.ticker3"
  | "home.ticker4"
  | "home.ticker5"
  | "home.ticker6"
  | "plan.starter.badge"
  | "plan.starter.f1"
  | "plan.starter.f2"
  | "plan.starter.f3"
  | "plan.starter.f4"
  | "plan.starter.f5"
  | "plan.starter.f6"
  | "plan.pro.badge"
  | "plan.pro.f1"
  | "plan.pro.f2"
  | "plan.pro.f3"
  | "plan.pro.f4"
  | "plan.pro.f5"
  | "plan.pro.f6"
  | "plan.vip.badge"
  | "plan.vip.f1"
  | "plan.vip.f2"
  | "plan.vip.f3"
  | "plan.vip.f4"
  | "plan.vip.f5"
  | "plan.vip.f6"
  | "plan.syndicate.badge"
  | "plan.syndicate.f1"
  | "plan.syndicate.f2"
  | "plan.syndicate.f3"
  | "plan.syndicate.f4"
  | "plan.syndicate.f5"
  | "plan.syndicate.f6"
  | "feat.night.title"
  | "feat.night.desc"
  | "feat.dual.title"
  | "feat.dual.desc"
  | "feat.ledger.title"
  | "feat.ledger.desc"
  | "feat.voice.title"
  | "feat.voice.desc"
  | "feat.property.title"
  | "feat.property.desc"
  | "feat.sovereign.title"
  | "feat.sovereign.desc"
  | "audio.listen"
  | "audio.stop"
  | "audio.preparing"
  | "audio.noText"
  | "audio.localFail"
  | "audio.webspeechMissing"
  | "audio.playFail"
  | "dash.title"
  | "dash.subtitle"
  | "dash.morningReport"
  | "dash.energy"
  | "dash.mood"
  | "dash.reputation"
  | "dash.heartbeat"
  | "dash.memories"
  | "dash.tasks"
  | "dash.noTwin"
  | "dash.createTwin"
  | "market.title"
  | "market.subtitle"
  | "market.hire"
  | "market.post"
  | "market.empty"
  | "market.price"
  | "approvals.title"
  | "approvals.subtitle"
  | "approvals.approve"
  | "approvals.reject"
  | "approvals.empty"
  | "approvals.type.task"
  | "approvals.type.transfer"
  | "approvals.type.contract"
  | "approvals.type.delivery"
  | "withdraw.title"
  | "withdraw.subtitle"
  | "withdraw.amount"
  | "withdraw.wise"
  | "withdraw.submit"
  | "withdraw.available"
  | "audit.title"
  | "audit.subtitle"
  | "audit.password"
  | "audit.unlock"
  | "audit.treasury"
  | "audit.ledger"
  | "audit.payouts"
  | "audit.refresh"
  | "create.title"
  | "create.subtitle"
  | "create.name"
  | "create.record"
  | "create.stop"
  | "create.submit"
  | "create.recording"
  | "create.recorded"
  | "create.camFail"
  | "auth.loginTitle"
  | "auth.signupTitle"
  | "auth.subtitle"
  | "auth.email"
  | "auth.password"
  | "auth.newPassword"
  | "auth.forgot"
  | "auth.forgotTitle"
  | "auth.forgotSub"
  | "auth.loginCta"
  | "auth.signupCta"
  | "auth.haveAccount"
  | "auth.noAccount"
  | "auth.backHome"
  | "auth.backLogin"
  | "auth.needCredentials"
  | "auth.needEmail"
  | "auth.needPassword"
  | "auth.registerOk"
  | "auth.registerFail"
  | "auth.directReset"
  | "auth.emailReset"
  | "auth.sendResetLink"
  | "auth.updatePasswordNow"
  | "auth.updateFromLink"
  | "auth.resetEmailSent"
  | "auth.resetOk"
  | "auth.resetFail"
  | "auth.resetTitle"
  | "auth.resetSub"
  | "auth.optionalSession"
  | "dash.switchFounder"
  | "dash.switchSon";

type Dict = Record<MessageKey, string>;

const en: Dict = {
  "nav.dashboard": "Twin Desk",
  "nav.marketplace": "Night Market",
  "nav.properties": "Property & Energy",
  "nav.wallet": "Wallet",
  "nav.subscribe": "Plans",
  "nav.approvals": "Approvals",
  "nav.withdraw": "Withdraw",
  "nav.audit": "Admin Audit",
  "nav.menu": "Menu",
  "nav.login": "Sign in",
  "nav.controlPanel": "Control panel",
  "nav.language": "Language",
  "nav.user": "User",
  "common.loading": "Loading...",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.error": "Something went wrong",
  "common.month": "/mo",
  "common.mostPopular": "Most popular",
  "home.preparing": "Preparing the platform...",
  "home.eyebrow": "DIGITAL TWIN ECONOMY · V1.0",
  "home.heroTitle1": "Your digital twin works",
  "home.heroTitle2": "while you sleep",
  "home.heroSub":
    "TwinForge is a FinTech × AI platform that runs your twins on the night market, records every coin in an immutable ledger, and gives you full sovereignty over approvals, withdrawals, and earnings.",
  "home.ctaStart": "Get started",
  "home.ctaPlans": "Explore plans",
  "home.statYield": "Nightly yield rate",
  "home.statSecurity": "Dual accounting security",
  "home.statTwins": "Active twins",
  "home.statSessions": "Encrypted session shield",
  "home.previewLabel": "LIVE TWIN PREVIEW",
  "home.previewName": "Admin Twin",
  "home.previewLive": "● Live now",
  "home.vitalEnergy": "Energy",
  "home.vitalMood": "Mood",
  "home.morningTitle": "Morning briefing",
  "home.morningBody":
    "Completed 3 night tasks. Net earnings +185 Gems after plan commission. Ready for your sovereign decision.",
  "home.morningListen": "🔊 Listen to voice briefing",
  "home.lastDeposit": "Latest wallet deposit",
  "home.plansTitle": "The four plans",
  "home.plansSub":
    "From starter to institutional sovereignty — every plan adds night hours and lowers platform commission.",
  "home.subscribeNow": "Subscribe now",
  "home.featuresTitle": "Architecture & security shield",
  "home.featuresSub":
    "Sovereign accounting with dual-source AI and full owner governance.",
  "home.footerAbout": "About",
  "home.footerTerms": "Terms",
  "home.footerPrivacy": "Privacy",
  "home.footerAudit": "Audit",
  "home.footerCopy": "TwinForge © 2026 · V1.0 Production Ready",
  "home.ticker1": "● 128 twins active on the night shift",
  "home.ticker2": "● +4,820 ForgeGold charged this hour",
  "home.ticker3": "● Dual settlement completed with a balanced ledger",
  "home.ticker4": "● Voice morning briefing ready for 37 owners",
  "home.ticker5": "● Average nightly yield 6.4%",
  "home.ticker6": "● Session encryption shield: active",
  "plan.starter.badge": "Fast entry",
  "plan.starter.f1": "One digital twin",
  "plan.starter.f2": "2 night-work hours daily",
  "plan.starter.f3": "20% platform commission",
  "plan.starter.f4": "Bank withdrawal after cooling",
  "plan.starter.f5": "Text morning report",
  "plan.starter.f6": "Basic inference limit",
  "plan.pro.badge": "Pro growth",
  "plan.pro.f1": "One optimized digital twin",
  "plan.pro.f2": "6 night-work hours",
  "plan.pro.f3": "15% platform commission",
  "plan.pro.f4": "Market match priority",
  "plan.pro.f5": "Voice morning briefing",
  "plan.pro.f6": "Higher inference limit",
  "plan.vip.badge": "Most requested",
  "plan.vip.f1": "High-reputation twin",
  "plan.vip.f2": "12 night-work hours",
  "plan.vip.f3": "10% platform commission",
  "plan.vip.f4": "Faster payout + priority support",
  "plan.vip.f5": "Sovereign life pulses",
  "plan.vip.f6": "Elite inference limit",
  "plan.syndicate.badge": "Institutional sovereignty",
  "plan.syndicate.f1": "Expanded institutional ops",
  "plan.syndicate.f2": "24-hour shift",
  "plan.syndicate.f3": "5% platform commission",
  "plan.syndicate.f4": "Advanced withdrawal powers",
  "plan.syndicate.f5": "Full treasury audit",
  "plan.syndicate.f6": "Institutional inference limit",
  "feat.night.title": "Night shift",
  "feat.night.desc":
    "Match service-market jobs and execute tasks while you sleep via dual AI.",
  "feat.dual.title": "Dual currency system",
  "feat.dual.desc":
    "ForgeGold for internal spend and Earned Gems for bank withdrawals.",
  "feat.ledger.title": "Immutable ledger",
  "feat.ledger.desc":
    "Every double-entry posts to ledger_entries with full balance checks.",
  "feat.voice.title": "Voice morning briefing",
  "feat.voice.desc":
    "Daily summary in your twin’s voice with OpenAI TTS and local fallback.",
  "feat.property.title": "Property & energy",
  "feat.property.desc":
    "Restore twin energy by renting virtual properties with ForgeGold.",
  "feat.sovereign.title": "Owner sovereignty",
  "feat.sovereign.desc":
    "HITL approvals, sovereign decisions, and admin treasury audit.",
  "audio.listen": "🔊 Listen to your twin’s voice briefing",
  "audio.stop": "⏹ Stop",
  "audio.preparing": "Preparing...",
  "audio.noText": "No morning report text yet",
  "audio.localFail": "Local speech failed",
  "audio.webspeechMissing": "Web Speech is unavailable in this browser",
  "audio.playFail": "Audio playback failed",
  "dash.title": "Twin dashboard",
  "dash.subtitle": "Monitor vitals, morning briefing, and sovereign decisions.",
  "dash.morningReport": "Morning report",
  "dash.energy": "Energy",
  "dash.mood": "Mood",
  "dash.reputation": "Reputation",
  "dash.heartbeat": "Life pulse",
  "dash.memories": "Memories",
  "dash.tasks": "Night tasks",
  "dash.noTwin": "No twin yet",
  "dash.createTwin": "Create your twin",
  "market.title": "Night market",
  "market.subtitle": "Hire twins or post service listings for the night shift.",
  "market.hire": "Hire",
  "market.post": "Post listing",
  "market.empty": "No listings yet",
  "market.price": "Price (Gems)",
  "approvals.title": "Approvals",
  "approvals.subtitle": "Sovereign HITL decisions waiting for you.",
  "approvals.approve": "Approve",
  "approvals.reject": "Reject",
  "approvals.empty": "No pending approvals",
  "approvals.type.task": "Task execution",
  "approvals.type.transfer": "High-value transfer",
  "approvals.type.contract": "Contract",
  "approvals.type.delivery": "Delivery acceptance",
  "withdraw.title": "Withdraw",
  "withdraw.subtitle": "Cash out Earned Gems via Wise after cooling.",
  "withdraw.amount": "Amount",
  "withdraw.wise": "Wise email",
  "withdraw.submit": "Request withdrawal",
  "withdraw.available": "Available balance",
  "audit.title": "Admin audit",
  "audit.subtitle": "Treasury, ledger integrity, and payout cooling.",
  "audit.password": "Admin password",
  "audit.unlock": "Unlock",
  "audit.treasury": "Treasury",
  "audit.ledger": "Ledger",
  "audit.payouts": "Payouts",
  "audit.refresh": "Refresh",
  "create.title": "Create your twin",
  "create.subtitle": "Name your twin and record a short soul sample.",
  "create.name": "Twin name",
  "create.record": "Start recording",
  "create.stop": "Stop",
  "create.submit": "Forge twin",
  "create.recording": "Recording... speak about yourself for 30–45 seconds",
  "create.recorded": "Sample captured",
  "create.camFail": "Camera or microphone access failed",
  "auth.loginTitle": "Sign in",
  "auth.signupTitle": "Create account",
  "auth.subtitle": "Enter your sovereign night economy",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.newPassword": "New password",
  "auth.forgot": "Forgot password?",
  "auth.forgotTitle": "Recover access",
  "auth.forgotSub": "Reset instantly or receive an email link",
  "auth.loginCta": "Enter TwinForge",
  "auth.signupCta": "Create account",
  "auth.haveAccount": "Already have an account?",
  "auth.noAccount": "No account yet?",
  "auth.backHome": "Back to home",
  "auth.backLogin": "Back to sign in",
  "auth.needCredentials": "Enter email and password",
  "auth.needEmail": "Enter your email",
  "auth.needPassword": "Enter a new password",
  "auth.registerOk": "Account created and confirmed — welcome!",
  "auth.registerFail": "Registration failed",
  "auth.directReset": "Instant reset",
  "auth.emailReset": "Email link",
  "auth.sendResetLink": "Send recovery link",
  "auth.updatePasswordNow": "Update password now",
  "auth.updateFromLink": "Update via session",
  "auth.resetEmailSent": "Recovery email sent — check your inbox",
  "auth.resetOk": "Password updated successfully",
  "auth.resetFail": "Password reset failed",
  "auth.resetTitle": "Set a new password",
  "auth.resetSub": "Use the email link session or reset directly",
  "auth.optionalSession": "optional for direct reset",
  "dash.switchFounder": "Founder twin",
  "dash.switchSon": "Son twin",
};

const ar: Dict = {
  ...en,
  "nav.dashboard": "لوحة التوأم",
  "nav.marketplace": "سوق الليل",
  "nav.properties": "العقارات والطاقة",
  "nav.wallet": "المحفظة",
  "nav.subscribe": "الاشتراكات",
  "nav.approvals": "الموافقات",
  "nav.withdraw": "السحب",
  "nav.audit": "تدقيق المشرف",
  "nav.menu": "القائمة",
  "nav.login": "دخول",
  "nav.controlPanel": "لوحة التحكم",
  "nav.language": "اللغة",
  "nav.user": "مستخدم",
  "common.loading": "جاري التحميل...",
  "common.save": "حفظ",
  "common.cancel": "إلغاء",
  "common.error": "حدث خطأ ما",
  "common.month": "/شهر",
  "common.mostPopular": "الأكثر طلباً",
  "home.preparing": "جاري تجهيز المنصة...",
  "home.eyebrow": "DIGITAL TWIN ECONOMY · V1.0",
  "home.heroTitle1": "توأمك الرقمي يعمل",
  "home.heroTitle2": "بينما تنام",
  "home.heroSub":
    "TwinForge منصة FinTech × AI تُشغّل توائمك في سوق الليل، تسجّل كل قرش في دفتر أستاذ غير قابل للتعديل، وتمنحك سيادة كاملة على الموافقات والسحب والأرباح.",
  "home.ctaStart": "ابدأ الآن",
  "home.ctaPlans": "استكشف الباقات",
  "home.statYield": "معدل العائد الليلي",
  "home.statSecurity": "أمان محاسبي مزدوج",
  "home.statTwins": "توائم نشطة",
  "home.statSessions": "حماية جلسات مشفّرة",
  "home.previewLabel": "LIVE TWIN PREVIEW",
  "home.previewName": "توأم الأدمن",
  "home.previewLive": "● يعمل الآن",
  "home.vitalEnergy": "الطاقة",
  "home.vitalMood": "المزاج",
  "home.morningTitle": "تقرير الصباح",
  "home.morningBody":
    "أكملت 3 مهام ليلية. صافي الأرباح +185 Gems بعد عمولة الباقة. جاهز لقرارك السيادي.",
  "home.morningListen": "🔊 استمع للتقرير الصوتي",
  "home.lastDeposit": "آخر إيداع محفظة",
  "home.plansTitle": "الباقات الأربع",
  "home.plansSub":
    "من البداية إلى السيادة المؤسسية — كل باقة ترفع ساعات الليل وتخفض عمولة المنصة.",
  "home.subscribeNow": "اشترك الآن",
  "home.featuresTitle": "المزايا المعمارية والدرع الأمني",
  "home.featuresSub":
    "بنية محاسبية سيادية مع ذكاء اصطناعي مزدوج المصدر وحوكمة مالك كاملة.",
  "home.footerAbout": "حول",
  "home.footerTerms": "الشروط",
  "home.footerPrivacy": "الخصوصية",
  "home.footerAudit": "تدقيق",
  "home.footerCopy": "TwinForge © 2026 · V1.0 Production Ready",
  "home.ticker1": "● 128 توأماً نشطاً في الوردية الليلية",
  "home.ticker2": "● +4,820 ForgeGold شُحنت خلال الساعة",
  "home.ticker3": "● تسوية مزدوجة مكتملة بدون خلل في الدفتر",
  "home.ticker4": "● تقرير صباح صوتي جاهز لـ 37 مالكاً",
  "home.ticker5": "● معدل عائد ليلي متوسط 6.4%",
  "home.ticker6": "● درع تشفير الجلسات: نشط",
  "plan.starter.badge": "دخول سريع",
  "plan.starter.f1": "توأم رقمي واحد",
  "plan.starter.f2": "ساعتان عمل ليلي يومياً",
  "plan.starter.f3": "عمولة منصة 20%",
  "plan.starter.f4": "سحب بنكي بعد التبريد",
  "plan.starter.f5": "تقرير صباح نصي",
  "plan.starter.f6": "حد استدلال أساسي",
  "plan.pro.badge": "نمو احترافي",
  "plan.pro.f1": "توأم رقمي واحد محسّن",
  "plan.pro.f2": "6 ساعات عمل ليلي",
  "plan.pro.f3": "عمولة منصة 15%",
  "plan.pro.f4": "أولوية مطابقة السوق",
  "plan.pro.f5": "تقرير صباح صوتي",
  "plan.pro.f6": "حد استدلال أعلى",
  "plan.vip.badge": "الأكثر طلباً",
  "plan.vip.f1": "توأم عالي السمعة",
  "plan.vip.f2": "12 ساعة عمل ليلي",
  "plan.vip.f3": "عمولة منصة 10%",
  "plan.vip.f4": "سحب مسرّع + دعم أولوية",
  "plan.vip.f5": "نبضات حياة سيادية",
  "plan.vip.f6": "حد استدلال نخبة",
  "plan.syndicate.badge": "سيادة مؤسسية",
  "plan.syndicate.f1": "تشغيل مؤسسي موسّع",
  "plan.syndicate.f2": "24 ساعة وردية",
  "plan.syndicate.f3": "عمولة منصة 5%",
  "plan.syndicate.f4": "صلاحيات سحب متقدمة",
  "plan.syndicate.f5": "تدقيق خزينة كامل",
  "plan.syndicate.f6": "حد استدلال مؤسسي",
  "feat.night.title": "الوردية الليلية",
  "feat.night.desc":
    "مطابقة سوق الخدمات وتنفيذ المهام أثناء نومك عبر محرك ذكاء مزدوج.",
  "feat.dual.title": "نظام العملتين",
  "feat.dual.desc":
    "ForgeGold للاستهلاك الداخلي وEarned Gems قابلة للسحب البنكي.",
  "feat.ledger.title": "دفتر أستاذ غير قابل للتعديل",
  "feat.ledger.desc":
    "كل قيد مزدوج يُسجَّل في ledger_entries مع تحقق توازن كامل.",
  "feat.voice.title": "تقرير الصباح الصوتي",
  "feat.voice.desc":
    "ملخص يومي بنبرة التوأم مع OpenAI TTS وFallback عربي محلي.",
  "feat.property.title": "العقارات والطاقة",
  "feat.property.desc":
    "استعادة طاقة التوأم عبر إيجار عقارات افتراضية بتكاليف ForgeGold.",
  "feat.sovereign.title": "سيادة المالك",
  "feat.sovereign.desc":
    "موافقات HITL، قرارات سيادية، وتدقيق مشرف على الخزينة.",
  "audio.listen": "🔊 استمع لتقرير توأمك الصوتي",
  "audio.stop": "⏹ إيقاف",
  "audio.preparing": "جاري التحضير...",
  "audio.noText": "لا يوجد نص لتقرير الصباح بعد",
  "audio.localFail": "تعذّر تشغيل الصوت المحلي",
  "audio.webspeechMissing": "Web Speech غير متاح في هذا المتصفح",
  "audio.playFail": "فشل تشغيل الصوت",
  "dash.title": "لوحة التوأم",
  "dash.subtitle": "راقب المؤشرات الحيوية وتقرير الصباح والقرارات السيادية.",
  "dash.morningReport": "تقرير الصباح",
  "dash.energy": "الطاقة",
  "dash.mood": "المزاج",
  "dash.reputation": "السمعة",
  "dash.heartbeat": "نبضة حياة",
  "dash.memories": "الذكريات",
  "dash.tasks": "مهام الليل",
  "dash.noTwin": "لا يوجد توأم بعد",
  "dash.createTwin": "أنشئ توأمك",
  "market.title": "سوق الليل",
  "market.subtitle": "وظّف توائماً أو انشر عروضاً لوردية الليل.",
  "market.hire": "توظيف",
  "market.post": "نشر عرض",
  "market.empty": "لا عروض بعد",
  "market.price": "السعر (Gems)",
  "approvals.title": "الموافقات",
  "approvals.subtitle": "قرارات سيادية بانتظار موافقتك.",
  "approvals.approve": "موافقة",
  "approvals.reject": "رفض",
  "approvals.empty": "لا موافقات معلّقة",
  "approvals.type.task": "تنفيذ مهمة",
  "approvals.type.transfer": "تحويل عالي القيمة",
  "approvals.type.contract": "عقد",
  "approvals.type.delivery": "قبول تسليم مهمة",
  "withdraw.title": "السحب",
  "withdraw.subtitle": "اسحب Earned Gems عبر Wise بعد فترة التبريد.",
  "withdraw.amount": "المبلغ",
  "withdraw.wise": "بريد Wise",
  "withdraw.submit": "طلب سحب",
  "withdraw.available": "الرصيد المتاح",
  "audit.title": "تدقيق المشرف",
  "audit.subtitle": "الخزينة وسلامة الدفتر وتبريد المدفوعات.",
  "audit.password": "كلمة مرور المشرف",
  "audit.unlock": "فتح",
  "audit.treasury": "الخزينة",
  "audit.ledger": "دفتر الأستاذ",
  "audit.payouts": "المدفوعات",
  "audit.refresh": "تحديث",
  "create.title": "إنشاء توأمك",
  "create.subtitle": "سمِّ توأمك وسجّل عينة قصيرة للروح.",
  "create.name": "اسم التوأم",
  "create.record": "بدء التسجيل",
  "create.stop": "إيقاف",
  "create.submit": "صهر التوأم",
  "create.recording": "جاري التسجيل... تحدث لمدة 30-45 ثانية عن نفسك",
  "create.recorded": "تم التقاط العينة",
  "create.camFail": "فشل الوصول للكاميرا أو الميكروفون",
  "auth.loginTitle": "تسجيل الدخول",
  "auth.signupTitle": "إنشاء حساب",
  "auth.subtitle": "ادخل إلى اقتصادك الليلي السيادي",
  "auth.email": "البريد الإلكتروني",
  "auth.password": "كلمة المرور",
  "auth.newPassword": "كلمة المرور الجديدة",
  "auth.forgot": "نسيت كلمة المرور؟",
  "auth.forgotTitle": "استعادة الوصول",
  "auth.forgotSub": "حدّث فوراً أو استلم رابطاً عبر البريد",
  "auth.loginCta": "دخول إلى TwinForge",
  "auth.signupCta": "إنشاء الحساب",
  "auth.haveAccount": "لديك حساب؟",
  "auth.noAccount": "ليس لديك حساب؟",
  "auth.backHome": "العودة للرئيسية",
  "auth.backLogin": "العودة لتسجيل الدخول",
  "auth.needCredentials": "أدخل البريد وكلمة المرور",
  "auth.needEmail": "أدخل بريدك الإلكتروني",
  "auth.needPassword": "أدخل كلمة مرور جديدة",
  "auth.registerOk": "تم إنشاء الحساب وتأكيده — أهلاً بك!",
  "auth.registerFail": "فشل إنشاء الحساب",
  "auth.directReset": "تحديث فوري",
  "auth.emailReset": "رابط البريد",
  "auth.sendResetLink": "إرسال رابط الاستعادة",
  "auth.updatePasswordNow": "تحديث كلمة المرور الآن",
  "auth.updateFromLink": "تحديث عبر الجلسة",
  "auth.resetEmailSent": "تم إرسال رابط الاستعادة — راجع بريدك",
  "auth.resetOk": "تم تحديث كلمة المرور بنجاح",
  "auth.resetFail": "فشل تحديث كلمة المرور",
  "auth.resetTitle": "تعيين كلمة مرور جديدة",
  "auth.resetSub": "استخدم جلسة الرابط أو التحديث المباشر",
  "auth.optionalSession": "اختياري للتحديث المباشر",
  "dash.switchFounder": "توأم المؤسس",
  "dash.switchSon": "توأم الابن",
};

/** Build a locale dict from English with overrides */
function L(overrides: Partial<Dict>): Dict {
  return { ...en, ...overrides };
}

const zh = L({
  "nav.dashboard": "孪生面板",
  "nav.marketplace": "夜市",
  "nav.properties": "房产与能量",
  "nav.wallet": "钱包",
  "nav.subscribe": "订阅套餐",
  "nav.approvals": "审批",
  "nav.withdraw": "提现",
  "nav.audit": "管理员审计",
  "nav.menu": "菜单",
  "nav.login": "登录",
  "nav.controlPanel": "控制台",
  "nav.language": "语言",
  "nav.user": "用户",
  "common.loading": "加载中...",
  "common.month": "/月",
  "common.mostPopular": "最受欢迎",
  "home.preparing": "正在准备平台...",
  "home.heroTitle1": "你的数字孪生在工作",
  "home.heroTitle2": "而你在睡觉",
  "home.heroSub":
    "TwinForge 是 FinTech × AI 平台：在夜市运行孪生、用不可篡改账本记录每一分钱，并让你对审批、提现与收益拥有完全主权。",
  "home.ctaStart": "立即开始",
  "home.ctaPlans": "查看套餐",
  "home.statYield": "夜间收益率",
  "home.statSecurity": "双重会计安全",
  "home.statTwins": "活跃孪生",
  "home.statSessions": "加密会话防护",
  "home.previewName": "管理员孪生",
  "home.previewLive": "● 正在运行",
  "home.vitalEnergy": "能量",
  "home.vitalMood": "情绪",
  "home.morningTitle": "晨间简报",
  "home.morningBody": "已完成 3 项夜间任务。扣除套餐佣金后净收益 +185 Gems。等待你的主权决策。",
  "home.morningListen": "🔊 收听语音简报",
  "home.lastDeposit": "最近钱包入账",
  "home.plansTitle": "四大套餐",
  "home.plansSub": "从入门到机构主权——每档提升夜间工时并降低平台佣金。",
  "home.subscribeNow": "立即订阅",
  "home.featuresTitle": "架构与安全护盾",
  "home.featuresSub": "主权会计、双源 AI 与完整所有者治理。",
  "home.footerAbout": "关于",
  "home.footerTerms": "条款",
  "home.footerPrivacy": "隐私",
  "home.footerAudit": "审计",
  "plan.starter.badge": "快速入门",
  "plan.pro.badge": "专业成长",
  "plan.vip.badge": "最受欢迎",
  "plan.syndicate.badge": "机构主权",
  "feat.night.title": "夜班",
  "feat.night.desc": "在你睡觉时通过双 AI 匹配服务市场并执行任务。",
  "feat.dual.title": "双币体系",
  "feat.dual.desc": "ForgeGold 用于内部消耗，Earned Gems 可银行提现。",
  "feat.ledger.title": "不可篡改账本",
  "feat.ledger.desc": "每笔复式分录写入 ledger_entries 并完成平衡校验。",
  "feat.voice.title": "语音晨报",
  "feat.voice.desc": "以孪生音色生成每日摘要，支持 OpenAI TTS 与本地回退。",
  "feat.property.title": "房产与能量",
  "feat.property.desc": "用 ForgeGold 租赁虚拟房产恢复孪生能量。",
  "feat.sovereign.title": "所有者主权",
  "feat.sovereign.desc": "HITL 审批、主权决策与管理员金库审计。",
  "audio.listen": "🔊 收听孪生语音简报",
  "audio.stop": "⏹ 停止",
  "audio.preparing": "准备中...",
  "dash.title": "孪生仪表盘",
  "dash.subtitle": "监控生命体征、晨报与主权决策。",
  "dash.createTwin": "创建孪生",
  "market.title": "夜市",
  "market.hire": "雇佣",
  "market.post": "发布任务",
  "approvals.title": "审批",
  "approvals.approve": "批准",
  "approvals.reject": "拒绝",
  "withdraw.title": "提现",
  "withdraw.submit": "申请提现",
  "audit.title": "管理员审计",
  "audit.unlock": "解锁",
  "create.title": "创建你的孪生",
  "create.submit": "锻造孪生",
  "create.record": "开始录制",
  "create.stop": "停止",
});

const hi = L({
  "nav.dashboard": "ट्विन डैशबोर्ड",
  "nav.marketplace": "नाइट मार्केट",
  "nav.properties": "प्रॉपर्टी और ऊर्जा",
  "nav.wallet": "वॉलेट",
  "nav.subscribe": "प्लान",
  "nav.approvals": "अनुमोदन",
  "nav.withdraw": "निकासी",
  "nav.audit": "एडमिन ऑडिट",
  "nav.menu": "मेनू",
  "nav.login": "साइन इन",
  "nav.controlPanel": "कंट्रोल पैनल",
  "nav.language": "भाषा",
  "common.loading": "लोड हो रहा है...",
  "common.month": "/माह",
  "common.mostPopular": "सबसे लोकप्रिय",
  "home.preparing": "प्लेटफ़ॉर्म तैयार हो रहा है...",
  "home.heroTitle1": "आपका डिजिटल ट्विन काम करता है",
  "home.heroTitle2": "जब आप सोते हैं",
  "home.heroSub":
    "TwinForge एक FinTech × AI प्लेटफ़ॉर्म है जो नाइट मार्केट में ट्विन चलाता है, हर सिक्के को अपरिवर्तनीय लेजर में दर्ज करता है, और अनुमोदन, निकासी व कमाई पर पूर्ण स्वामित्व देता है।",
  "home.ctaStart": "शुरू करें",
  "home.ctaPlans": "प्लान देखें",
  "home.statYield": "रात्रि प्रतिफल दर",
  "home.statSecurity": "दोहरी लेखांकन सुरक्षा",
  "home.statTwins": "सक्रिय ट्विन",
  "home.statSessions": "एन्क्रिप्टेड सत्र सुरक्षा",
  "home.previewName": "एडमिन ट्विन",
  "home.previewLive": "● अभी सक्रिय",
  "home.vitalEnergy": "ऊर्जा",
  "home.vitalMood": "मूड",
  "home.morningTitle": "सुबह की ब्रीफिंग",
  "home.morningBody":
    "3 रात्रि कार्य पूरे। प्लान कमीशन के बाद शुद्ध +185 Gems। आपके संप्रभु निर्णय के लिए तैयार।",
  "home.morningListen": "🔊 वॉइस ब्रीफिंग सुनें",
  "home.lastDeposit": "नवीनतम वॉलेट जमा",
  "home.plansTitle": "चार प्लान",
  "home.plansSub":
    "शुरुआत से संस्थागत संप्रभुता तक — हर प्लान रात्रि घंटे बढ़ाता और कमीशन घटाता है।",
  "home.subscribeNow": "अभी सदस्यता लें",
  "home.featuresTitle": "आर्किटेक्चर और सुरक्षा ढाल",
  "home.featuresSub": "दोहरे स्रोत AI और पूर्ण स्वामी शासन के साथ संप्रभु लेखांकन।",
  "home.footerAbout": "परिचय",
  "home.footerTerms": "शर्तें",
  "home.footerPrivacy": "गोपनीयता",
  "home.footerAudit": "ऑडिट",
  "feat.night.title": "नाइट शिफ्ट",
  "feat.dual.title": "दोहरी मुद्रा प्रणाली",
  "feat.ledger.title": "अपरिवर्तनीय लेजर",
  "feat.voice.title": "वॉइस मॉर्निंग ब्रीफिंग",
  "feat.property.title": "प्रॉपर्टी और ऊर्जा",
  "feat.sovereign.title": "स्वामी संप्रभुता",
  "audio.listen": "🔊 अपने ट्विन की वॉइस ब्रीफिंग सुनें",
  "dash.title": "ट्विन डैशबोर्ड",
  "market.title": "नाइट मार्केट",
  "approvals.title": "अनुमोदन",
  "withdraw.title": "निकासी",
  "audit.title": "एडमिन ऑडिट",
  "create.title": "अपना ट्विन बनाएँ",
});

const es = L({
  "nav.dashboard": "Panel del gemelo",
  "nav.marketplace": "Mercado nocturno",
  "nav.properties": "Propiedades y energía",
  "nav.wallet": "Cartera",
  "nav.subscribe": "Planes",
  "nav.approvals": "Aprobaciones",
  "nav.withdraw": "Retirar",
  "nav.audit": "Auditoría admin",
  "nav.menu": "Menú",
  "nav.login": "Entrar",
  "nav.controlPanel": "Panel de control",
  "nav.language": "Idioma",
  "common.loading": "Cargando...",
  "common.month": "/mes",
  "common.mostPopular": "Más popular",
  "home.preparing": "Preparando la plataforma...",
  "home.heroTitle1": "Tu gemelo digital trabaja",
  "home.heroTitle2": "mientras duermes",
  "home.heroSub":
    "TwinForge es una plataforma FinTech × AI que opera tus gemelos en el mercado nocturno, registra cada moneda en un libro mayor inmutable y te da soberanía total sobre aprobaciones, retiros y ganancias.",
  "home.ctaStart": "Empezar",
  "home.ctaPlans": "Ver planes",
  "home.statYield": "Rendimiento nocturno",
  "home.statSecurity": "Seguridad contable dual",
  "home.statTwins": "Gemelos activos",
  "home.statSessions": "Sesiones cifradas",
  "home.previewName": "Gemelo Admin",
  "home.previewLive": "● En vivo",
  "home.vitalEnergy": "Energía",
  "home.vitalMood": "Ánimo",
  "home.morningTitle": "Informe matutino",
  "home.morningBody":
    "Completé 3 tareas nocturnas. Ganancia neta +185 Gems tras comisión. Listo para tu decisión soberana.",
  "home.morningListen": "🔊 Escuchar informe de voz",
  "home.lastDeposit": "Último depósito",
  "home.plansTitle": "Los cuatro planes",
  "home.plansSub":
    "Del inicio a la soberanía institucional: más horas nocturnas y menor comisión.",
  "home.subscribeNow": "Suscribirse",
  "home.featuresTitle": "Arquitectura y escudo de seguridad",
  "home.featuresSub":
    "Contabilidad soberana con IA de doble fuente y gobernanza total del propietario.",
  "home.footerAbout": "Acerca de",
  "home.footerTerms": "Términos",
  "home.footerPrivacy": "Privacidad",
  "home.footerAudit": "Auditoría",
  "feat.night.title": "Turno nocturno",
  "feat.dual.title": "Sistema de doble moneda",
  "feat.ledger.title": "Libro mayor inmutable",
  "feat.voice.title": "Informe matutino por voz",
  "feat.property.title": "Propiedades y energía",
  "feat.sovereign.title": "Soberanía del propietario",
  "audio.listen": "🔊 Escucha el informe de voz de tu gemelo",
  "dash.title": "Panel del gemelo",
  "market.title": "Mercado nocturno",
  "approvals.title": "Aprobaciones",
  "withdraw.title": "Retirar",
  "audit.title": "Auditoría admin",
  "create.title": "Crea tu gemelo",
});

const fr = L({
  "nav.dashboard": "Tableau jumeau",
  "nav.marketplace": "Marché de nuit",
  "nav.properties": "Biens & énergie",
  "nav.wallet": "Portefeuille",
  "nav.subscribe": "Abonnements",
  "nav.approvals": "Approbations",
  "nav.withdraw": "Retrait",
  "nav.audit": "Audit admin",
  "nav.menu": "Menu",
  "nav.login": "Connexion",
  "nav.controlPanel": "Panneau de contrôle",
  "nav.language": "Langue",
  "common.loading": "Chargement...",
  "common.month": "/mois",
  "common.mostPopular": "Le plus demandé",
  "home.preparing": "Préparation de la plateforme...",
  "home.heroTitle1": "Votre jumeau numérique travaille",
  "home.heroTitle2": "pendant que vous dormez",
  "home.heroSub":
    "TwinForge est une plateforme FinTech × IA qui fait travailler vos jumeaux sur le marché de nuit, enregistre chaque pièce dans un grand livre immuable et vous donne une souveraineté totale sur les validations, retraits et gains.",
  "home.ctaStart": "Commencer",
  "home.ctaPlans": "Voir les offres",
  "home.statYield": "Rendement nocturne",
  "home.statSecurity": "Sécurité comptable double",
  "home.statTwins": "Jumeaux actifs",
  "home.statSessions": "Sessions chiffrées",
  "home.previewName": "Jumeau Admin",
  "home.previewLive": "● En direct",
  "home.vitalEnergy": "Énergie",
  "home.vitalMood": "Humeur",
  "home.morningTitle": "Briefing du matin",
  "home.morningBody":
    "3 tâches de nuit terminées. Gain net +185 Gems après commission. Prêt pour votre décision souveraine.",
  "home.morningListen": "🔊 Écouter le briefing vocal",
  "home.lastDeposit": "Dernier dépôt portefeuille",
  "home.plansTitle": "Les quatre offres",
  "home.plansSub":
    "Du démarrage à la souveraineté institutionnelle — plus d’heures de nuit, moins de commission.",
  "home.subscribeNow": "S’abonner",
  "home.featuresTitle": "Architecture et bouclier de sécurité",
  "home.featuresSub":
    "Comptabilité souveraine, IA bi-source et gouvernance propriétaire complète.",
  "home.footerAbout": "À propos",
  "home.footerTerms": "Conditions",
  "home.footerPrivacy": "Confidentialité",
  "home.footerAudit": "Audit",
  "feat.night.title": "Quart de nuit",
  "feat.dual.title": "Système bi-monnaie",
  "feat.ledger.title": "Grand livre immuable",
  "feat.voice.title": "Briefing vocal du matin",
  "feat.property.title": "Biens & énergie",
  "feat.sovereign.title": "Souveraineté du propriétaire",
  "audio.listen": "🔊 Écoutez le briefing vocal de votre jumeau",
  "dash.title": "Tableau de bord jumeau",
  "market.title": "Marché de nuit",
  "approvals.title": "Approbations",
  "withdraw.title": "Retrait",
  "audit.title": "Audit admin",
  "create.title": "Créer votre jumeau",
});

const de = L({
  "nav.dashboard": "Zwilling-Dashboard",
  "nav.marketplace": "Nachtmarkt",
  "nav.properties": "Immobilien & Energie",
  "nav.wallet": "Wallet",
  "nav.subscribe": "Pläne",
  "nav.approvals": "Freigaben",
  "nav.withdraw": "Auszahlung",
  "nav.audit": "Admin-Audit",
  "nav.menu": "Menü",
  "nav.login": "Anmelden",
  "nav.controlPanel": "Kontrollzentrum",
  "nav.language": "Sprache",
  "common.loading": "Lädt...",
  "common.month": "/Monat",
  "common.mostPopular": "Beliebteste",
  "home.preparing": "Plattform wird vorbereitet...",
  "home.heroTitle1": "Dein digitaler Zwilling arbeitet",
  "home.heroTitle2": "während du schläfst",
  "home.heroSub":
    "TwinForge ist eine FinTech × KI-Plattform, die deine Zwillinge auf dem Nachtmarkt betreibt, jede Münze in einem unveränderlichen Ledger erfasst und dir volle Souveränität über Freigaben, Auszahlungen und Erträge gibt.",
  "home.ctaStart": "Jetzt starten",
  "home.ctaPlans": "Pläne entdecken",
  "home.statYield": "Nächtliche Rendite",
  "home.statSecurity": "Doppelte Buchhaltungssicherheit",
  "home.statTwins": "Aktive Zwillinge",
  "home.statSessions": "Verschlüsselte Sitzungen",
  "home.previewName": "Admin-Zwilling",
  "home.previewLive": "● Live",
  "home.vitalEnergy": "Energie",
  "home.vitalMood": "Stimmung",
  "home.morningTitle": "Morgenbriefing",
  "home.morningBody":
    "3 Nachtaufgaben erledigt. Netto +185 Gems nach Planprovision. Bereit für deine souveräne Entscheidung.",
  "home.morningListen": "🔊 Sprachbriefing anhören",
  "home.lastDeposit": "Letzte Wallet-Einzahlung",
  "home.plansTitle": "Die vier Pläne",
  "home.plansSub":
    "Vom Start zur institutionellen Souveränität — mehr Nachtstunden, niedrigere Provision.",
  "home.subscribeNow": "Jetzt abonnieren",
  "home.featuresTitle": "Architektur & Sicherheitsschild",
  "home.featuresSub":
    "Souveräne Buchhaltung mit Dual-KI und voller Eigentümer-Governance.",
  "home.footerAbout": "Über uns",
  "home.footerTerms": "Bedingungen",
  "home.footerPrivacy": "Datenschutz",
  "home.footerAudit": "Audit",
  "feat.night.title": "Nachtschicht",
  "feat.dual.title": "Doppelwährungssystem",
  "feat.ledger.title": "Unveränderliches Ledger",
  "feat.voice.title": "Sprach-Morgenbriefing",
  "feat.property.title": "Immobilien & Energie",
  "feat.sovereign.title": "Eigentümer-Souveränität",
  "audio.listen": "🔊 Höre das Sprachbriefing deines Zwillings",
  "dash.title": "Zwilling-Dashboard",
  "market.title": "Nachtmarkt",
  "approvals.title": "Freigaben",
  "withdraw.title": "Auszahlung",
  "audit.title": "Admin-Audit",
  "create.title": "Zwilling erstellen",
});

const ru = L({
  "nav.dashboard": "Панель двойника",
  "nav.marketplace": "Ночной рынок",
  "nav.properties": "Недвижимость и энергия",
  "nav.wallet": "Кошелёк",
  "nav.subscribe": "Тарифы",
  "nav.approvals": "Согласования",
  "nav.withdraw": "Вывод",
  "nav.audit": "Аудит админа",
  "nav.menu": "Меню",
  "nav.login": "Войти",
  "nav.controlPanel": "Панель управления",
  "nav.language": "Язык",
  "common.loading": "Загрузка...",
  "common.month": "/мес",
  "common.mostPopular": "Самый популярный",
  "home.preparing": "Подготовка платформы...",
  "home.heroTitle1": "Ваш цифровой двойник работает",
  "home.heroTitle2": "пока вы спите",
  "home.heroSub":
    "TwinForge — платформа FinTech × ИИ: запускает двойников на ночном рынке, записывает каждую монету в неизменяемый реестр и даёт полный суверенитет над согласованиями, выводом и доходами.",
  "home.ctaStart": "Начать",
  "home.ctaPlans": "Смотреть тарифы",
  "home.statYield": "Ночная доходность",
  "home.statSecurity": "Двойная бухгалтерская защита",
  "home.statTwins": "Активные двойники",
  "home.statSessions": "Шифрование сессий",
  "home.previewName": "Двойник админа",
  "home.previewLive": "● В эфире",
  "home.vitalEnergy": "Энергия",
  "home.vitalMood": "Настроение",
  "home.morningTitle": "Утренний брифинг",
  "home.morningBody":
    "Выполнено 3 ночные задачи. Чистый доход +185 Gems после комиссии. Готов к вашему суверенному решению.",
  "home.morningListen": "🔊 Слушать голосовой брифинг",
  "home.lastDeposit": "Последнее пополнение",
  "home.plansTitle": "Четыре тарифа",
  "home.plansSub":
    "От старта до институционального суверенитета — больше ночных часов, ниже комиссия.",
  "home.subscribeNow": "Подписаться",
  "home.featuresTitle": "Архитектура и щит безопасности",
  "home.featuresSub":
    "Суверенный учёт, двойной ИИ и полное управление владельца.",
  "home.footerAbout": "О нас",
  "home.footerTerms": "Условия",
  "home.footerPrivacy": "Конфиденциальность",
  "home.footerAudit": "Аудит",
  "feat.night.title": "Ночная смена",
  "feat.dual.title": "Двухвалютная система",
  "feat.ledger.title": "Неизменяемый реестр",
  "feat.voice.title": "Голосовой утренний брифинг",
  "feat.property.title": "Недвижимость и энергия",
  "feat.sovereign.title": "Суверенитет владельца",
  "audio.listen": "🔊 Слушайте голосовой брифинг вашего двойника",
  "dash.title": "Панель двойника",
  "market.title": "Ночной рынок",
  "approvals.title": "Согласования",
  "withdraw.title": "Вывод",
  "audit.title": "Аудит админа",
  "create.title": "Создать двойника",
});

const ja = L({
  "nav.dashboard": "ツインダッシュボード",
  "nav.marketplace": "ナイトマーケット",
  "nav.properties": "物件とエネルギー",
  "nav.wallet": "ウォレット",
  "nav.subscribe": "プラン",
  "nav.approvals": "承認",
  "nav.withdraw": "出金",
  "nav.audit": "管理監査",
  "nav.menu": "メニュー",
  "nav.login": "ログイン",
  "nav.controlPanel": "コントロールパネル",
  "nav.language": "言語",
  "common.loading": "読み込み中...",
  "common.month": "/月",
  "common.mostPopular": "人気No.1",
  "home.preparing": "プラットフォームを準備中...",
  "home.heroTitle1": "あなたのデジタルツインが働き",
  "home.heroTitle2": "あなたは眠る",
  "home.heroSub":
    "TwinForgeはFinTech × AIプラットフォームです。夜市でツインを稼働させ、不変台帳にすべてのコインを記録し、承認・出金・収益の主権をあなたに委ねます。",
  "home.ctaStart": "はじめる",
  "home.ctaPlans": "プランを見る",
  "home.statYield": "夜間利回り",
  "home.statSecurity": "二重会計セキュリティ",
  "home.statTwins": "稼働ツイン",
  "home.statSessions": "暗号化セッション防衛",
  "home.previewName": "管理者ツイン",
  "home.previewLive": "● 稼働中",
  "home.vitalEnergy": "エネルギー",
  "home.vitalMood": "気分",
  "home.morningTitle": "朝のブリーフィング",
  "home.morningBody":
    "夜間タスク3件完了。プラン手数料後の純益 +185 Gems。主権的な判断の準備完了。",
  "home.morningListen": "🔊 音声ブリーフィングを聴く",
  "home.lastDeposit": "最新の入金",
  "home.plansTitle": "4つのプラン",
  "home.plansSub":
    "スタートから機関主権まで——夜間時間を増やし、手数料を下げます。",
  "home.subscribeNow": "今すぐ購読",
  "home.featuresTitle": "アーキテクチャとセキュリティシールド",
  "home.featuresSub": "二重AIと完全な所有者ガバナンスによる主権会計。",
  "home.footerAbout": "概要",
  "home.footerTerms": "利用規約",
  "home.footerPrivacy": "プライバシー",
  "home.footerAudit": "監査",
  "feat.night.title": "夜勤",
  "feat.dual.title": "二通貨システム",
  "feat.ledger.title": "不変台帳",
  "feat.voice.title": "音声モーニングブリーフィング",
  "feat.property.title": "物件とエネルギー",
  "feat.sovereign.title": "所有者主権",
  "audio.listen": "🔊 ツインの音声ブリーフィングを聴く",
  "dash.title": "ツインダッシュボード",
  "market.title": "ナイトマーケット",
  "approvals.title": "承認",
  "withdraw.title": "出金",
  "audit.title": "管理監査",
  "create.title": "ツインを作成",
});

const ko = L({
  "nav.dashboard": "트윈 대시보드",
  "nav.marketplace": "나이트 마켓",
  "nav.properties": "부동산 & 에너지",
  "nav.wallet": "지갑",
  "nav.subscribe": "플랜",
  "nav.approvals": "승인",
  "nav.withdraw": "출금",
  "nav.audit": "관리자 감사",
  "nav.menu": "메뉴",
  "nav.login": "로그인",
  "nav.controlPanel": "제어판",
  "nav.language": "언어",
  "common.loading": "로딩 중...",
  "common.month": "/월",
  "common.mostPopular": "가장 인기",
  "home.preparing": "플랫폼 준비 중...",
  "home.heroTitle1": "디지털 트윈이 일하고",
  "home.heroTitle2": "당신은 잡니다",
  "home.heroSub":
    "TwinForge는 FinTech × AI 플랫폼입니다. 나이트 마켓에서 트윈을 운영하고, 불변 원장에 모든 코인을 기록하며, 승인·출금·수익에 대한 완전한 주권을 제공합니다.",
  "home.ctaStart": "시작하기",
  "home.ctaPlans": "플랜 보기",
  "home.statYield": "야간 수익률",
  "home.statSecurity": "이중 회계 보안",
  "home.statTwins": "활성 트윈",
  "home.statSessions": "암호화 세션 보호",
  "home.previewName": "관리자 트윈",
  "home.previewLive": "● 실시간",
  "home.vitalEnergy": "에너지",
  "home.vitalMood": "기분",
  "home.morningTitle": "모닝 브리핑",
  "home.morningBody":
    "야간 작업 3건 완료. 플랜 수수료 후 순이익 +185 Gems. 주권적 결정을 기다립니다.",
  "home.morningListen": "🔊 음성 브리핑 듣기",
  "home.lastDeposit": "최근 지갑 입금",
  "home.plansTitle": "네 가지 플랜",
  "home.plansSub":
    "스타터부터 기관 주권까지 — 야간 시간을 늘리고 수수료를 낮춥니다.",
  "home.subscribeNow": "지금 구독",
  "home.featuresTitle": "아키텍처 & 보안 실드",
  "home.featuresSub": "이중 AI와 완전한 소유자 거버넌스의 주권 회계.",
  "home.footerAbout": "소개",
  "home.footerTerms": "약관",
  "home.footerPrivacy": "개인정보",
  "home.footerAudit": "감사",
  "feat.night.title": "야간 근무",
  "feat.dual.title": "이중 통화 시스템",
  "feat.ledger.title": "불변 원장",
  "feat.voice.title": "음성 모닝 브리핑",
  "feat.property.title": "부동산 & 에너지",
  "feat.sovereign.title": "소유자 주권",
  "audio.listen": "🔊 트윈 음성 브리핑 듣기",
  "dash.title": "트윈 대시보드",
  "market.title": "나이트 마켓",
  "approvals.title": "승인",
  "withdraw.title": "출금",
  "audit.title": "관리자 감사",
  "create.title": "트윈 만들기",
});

const tr = L({
  "nav.dashboard": "İkiz paneli",
  "nav.marketplace": "Gece pazarı",
  "nav.properties": "Gayrimenkul & enerji",
  "nav.wallet": "Cüzdan",
  "nav.subscribe": "Planlar",
  "nav.approvals": "Onaylar",
  "nav.withdraw": "Çekim",
  "nav.audit": "Yönetici denetimi",
  "nav.menu": "Menü",
  "nav.login": "Giriş",
  "nav.controlPanel": "Kontrol paneli",
  "nav.language": "Dil",
  "common.loading": "Yükleniyor...",
  "common.month": "/ay",
  "common.mostPopular": "En popüler",
  "home.preparing": "Platform hazırlanıyor...",
  "home.heroTitle1": "Dijital ikiziniz çalışır",
  "home.heroTitle2": "siz uyurken",
  "home.heroSub":
    "TwinForge, ikizlerinizi gece pazarında çalıştıran, her jetonu değişmez deftere kaydeden ve onaylar, çekimler ile kazançlar üzerinde tam egemenlik veren bir FinTech × AI platformudur.",
  "home.ctaStart": "Başla",
  "home.ctaPlans": "Planları keşfet",
  "home.statYield": "Gece getirisi",
  "home.statSecurity": "Çift muhasebe güvenliği",
  "home.statTwins": "Aktif ikizler",
  "home.statSessions": "Şifreli oturum kalkanı",
  "home.previewName": "Yönetici İkizi",
  "home.previewLive": "● Canlı",
  "home.vitalEnergy": "Enerji",
  "home.vitalMood": "Ruh hali",
  "home.morningTitle": "Sabah brifingi",
  "home.morningBody":
    "3 gece görevi tamamlandı. Plan komisyonu sonrası net +185 Gems. Egemen kararınız için hazır.",
  "home.morningListen": "🔊 Sesli brifingi dinle",
  "home.lastDeposit": "Son cüzdan yatırımı",
  "home.plansTitle": "Dört plan",
  "home.plansSub":
    "Başlangıçtan kurumsal egemenliğe — daha fazla gece saati, daha düşük komisyon.",
  "home.subscribeNow": "Şimdi abone ol",
  "home.featuresTitle": "Mimari ve güvenlik kalkanı",
  "home.featuresSub":
    "Çift kaynaklı AI ve tam sahip yönetişimi ile egemen muhasebe.",
  "home.footerAbout": "Hakkında",
  "home.footerTerms": "Şartlar",
  "home.footerPrivacy": "Gizlilik",
  "home.footerAudit": "Denetim",
  "feat.night.title": "Gece vardiyası",
  "feat.dual.title": "Çift para birimi",
  "feat.ledger.title": "Değişmez defter",
  "feat.voice.title": "Sesli sabah brifingi",
  "feat.property.title": "Gayrimenkul & enerji",
  "feat.sovereign.title": "Sahip egemenliği",
  "audio.listen": "🔊 İkizinizin sesli brifingini dinleyin",
  "dash.title": "İkiz paneli",
  "market.title": "Gece pazarı",
  "approvals.title": "Onaylar",
  "withdraw.title": "Çekim",
  "audit.title": "Yönetici denetimi",
  "create.title": "İkizinizi oluşturun",
});

const pt = L({
  "nav.dashboard": "Painel do gêmeo",
  "nav.marketplace": "Mercado noturno",
  "nav.properties": "Imóveis e energia",
  "nav.wallet": "Carteira",
  "nav.subscribe": "Planos",
  "nav.approvals": "Aprovações",
  "nav.withdraw": "Saque",
  "nav.audit": "Auditoria admin",
  "nav.menu": "Menu",
  "nav.login": "Entrar",
  "nav.controlPanel": "Painel de controle",
  "nav.language": "Idioma",
  "common.loading": "Carregando...",
  "common.month": "/mês",
  "common.mostPopular": "Mais popular",
  "home.preparing": "Preparando a plataforma...",
  "home.heroTitle1": "Seu gêmeo digital trabalha",
  "home.heroTitle2": "enquanto você dorme",
  "home.heroSub":
    "TwinForge é uma plataforma FinTech × IA que opera seus gêmeos no mercado noturno, registra cada moeda em um livro-razão imutável e dá soberania total sobre aprovações, saques e ganhos.",
  "home.ctaStart": "Começar",
  "home.ctaPlans": "Explorar planos",
  "home.statYield": "Rendimento noturno",
  "home.statSecurity": "Segurança contábil dupla",
  "home.statTwins": "Gêmeos ativos",
  "home.statSessions": "Sessões criptografadas",
  "home.previewName": "Gêmeo Admin",
  "home.previewLive": "● Ao vivo",
  "home.vitalEnergy": "Energia",
  "home.vitalMood": "Humor",
  "home.morningTitle": "Briefing matinal",
  "home.morningBody":
    "Concluí 3 tarefas noturnas. Lucro líquido +185 Gems após comissão. Pronto para sua decisão soberana.",
  "home.morningListen": "🔊 Ouvir briefing de voz",
  "home.lastDeposit": "Último depósito",
  "home.plansTitle": "Os quatro planos",
  "home.plansSub":
    "Do início à soberania institucional — mais horas noturnas e menor comissão.",
  "home.subscribeNow": "Assinar agora",
  "home.featuresTitle": "Arquitetura e escudo de segurança",
  "home.featuresSub":
    "Contabilidade soberana com IA de fonte dupla e governança total do proprietário.",
  "home.footerAbout": "Sobre",
  "home.footerTerms": "Termos",
  "home.footerPrivacy": "Privacidade",
  "home.footerAudit": "Auditoria",
  "feat.night.title": "Turno noturno",
  "feat.dual.title": "Sistema de moeda dupla",
  "feat.ledger.title": "Livro-razão imutável",
  "feat.voice.title": "Briefing matinal por voz",
  "feat.property.title": "Imóveis e energia",
  "feat.sovereign.title": "Soberania do proprietário",
  "audio.listen": "🔊 Ouça o briefing de voz do seu gêmeo",
  "dash.title": "Painel do gêmeo",
  "market.title": "Mercado noturno",
  "approvals.title": "Aprovações",
  "withdraw.title": "Saque",
  "audit.title": "Auditoria admin",
  "create.title": "Crie seu gêmeo",
});

export const dictionaries: Record<Locale, Dict> = {
  ar,
  en,
  zh,
  hi,
  es,
  fr,
  de,
  ru,
  ja,
  ko,
  tr,
  pt,
};

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(
  value: string | null | undefined,
): Locale {
  if (!value) return DEFAULT_LOCALE;
  const short = value.toLowerCase().split("-")[0];
  return isLocale(short) ? short : DEFAULT_LOCALE;
}

export function translate(
  locale: Locale,
  key: MessageKey | string,
  vars?: Record<string, string | number>,
): string {
  const dict = dictionaries[locale] || dictionaries.en;
  let text =
    (dict as Record<string, string>)[key] ||
    (dictionaries.en as Record<string, string>)[key] ||
    key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return text;
}

export function getPlanFeatureKeys(
  sku: "starter" | "pro" | "vip" | "syndicate",
): MessageKey[] {
  return [1, 2, 3, 4, 5, 6].map(
    (n) => `plan.${sku}.f${n}` as MessageKey,
  );
}

export const FEATURE_KEYS = [
  { t: "feat.night.title", d: "feat.night.desc" },
  { t: "feat.dual.title", d: "feat.dual.desc" },
  { t: "feat.ledger.title", d: "feat.ledger.desc" },
  { t: "feat.voice.title", d: "feat.voice.desc" },
  { t: "feat.property.title", d: "feat.property.desc" },
  { t: "feat.sovereign.title", d: "feat.sovereign.desc" },
] as const;

export const TICKER_KEYS = [
  "home.ticker1",
  "home.ticker2",
  "home.ticker3",
  "home.ticker4",
  "home.ticker5",
  "home.ticker6",
] as const;
