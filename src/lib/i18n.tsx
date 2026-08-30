// Lightweight i18n with RTL awareness for SpeakUpp.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type LangCode = "en" | "fr" | "ar";

const dict = {
  en: {
    nav: { signIn: "Sign in", signUp: "Get started", dashboard: "Dashboard", history: "History", rankings: "Rankings", settings: "Settings", signOut: "Sign out", practice: "Practice" },
    landing: {
      badge: "​",
      title1: "Find your voice,",
      title2: "one minute at a time.",
      subtitle: "Practice speaking English, French, or Arabic. Pick the topics you love, think for 3 minutes, speak for 1, and get AI feedback on grammar, vocabulary, and fluency.",
      cta: "Start practicing free",
      languages: "Available languages",
      howTitle: "How it works",
      step1Title: "Pick a language & your interests",
      step1Desc: "Choose English, French, or Arabic, then tap the topics you love — travel, tech, food, music and more.",
      step2Title: "Get a personalized topic",
      step2Desc: "Our AI crafts a fresh prompt based on your interests. Take 3 minutes to think and prepare.",
      step3Title: "Speak for 1 minute",
      step3Desc: "Record your answer. Don't worry about being perfect — we're here for the practice.",
      step4Title: "Get AI feedback",
      step4Desc: "Receive structured notes on grammar, vocabulary, and fluency. Track your progress over time.",
    },
    practice: {
      pickLanguage: "Pick a language",
      pickLevel: "Pick your level",
      starting: "Starting...",
      start: "Start session",
      thinking: "Thinking time",
      speaking: "Speaking",
      done: "Done",
      yourTopic: "Your topic",
      holdToSpeak: "Hold to speak",
      stopRecording: "Stop recording",
      submit: "Submit for feedback",
      analyzing: "Analyzing your speech...",
      micBlocked: "Microphone access is required to record.",
    },
    common: { back: "Back", cancel: "Cancel", save: "Save", level: "Level" },
    auth: {
      signInTitle: "Welcome back",
      signUpTitle: "Create your account",
      email: "Email",
      password: "Password",
      displayName: "Display name",
      signIn: "Sign in",
      signUp: "Create account",
      noAccount: "No account?",
      hasAccount: "Already have an account?",
      orContinue: "or continue with",
      google: "Continue with Google",
      apple: "Continue with Apple",
    },
  },
  fr: {
    nav: { signIn: "Connexion", signUp: "Commencer", dashboard: "Tableau de bord", history: "Historique", rankings: "Classement", settings: "Paramètres", signOut: "Déconnexion", practice: "Pratiquer" },
    landing: {
      badge: "​",
      title1: "Trouve ta voix,",
      title2: "une minute à la fois.",
      subtitle: "Pratique l'anglais, le français ou l'arabe. Choisis les sujets qui t'intéressent, réfléchis 3 minutes, parle 1 minute et reçois un retour de l'IA.",
      cta: "Commencer gratuitement",
      languages: "Langues disponibles",
      howTitle: "Comment ça marche",
      step1Title: "Choisis une langue et tes centres d'intérêt",
      step1Desc: "Anglais, français ou arabe. Sélectionne les sujets qui te passionnent — voyage, tech, cuisine, musique…",
      step2Title: "Reçois un sujet personnalisé",
      step2Desc: "Notre IA crée un sujet à partir de tes intérêts. 3 minutes pour préparer.",
      step3Title: "Parle 1 minute",
      step3Desc: "Enregistre ta réponse. Pas besoin d'être parfait.",
      step4Title: "Retour de l'IA",
      step4Desc: "Notes structurées sur la grammaire, le vocabulaire et la fluidité.",
    },
    practice: {
      pickLanguage: "Choisis une langue",
      pickLevel: "Choisis ton niveau",
      starting: "Démarrage...",
      start: "Commencer la session",
      thinking: "Temps de réflexion",
      speaking: "En train de parler",
      done: "Terminé",
      yourTopic: "Ton sujet",
      holdToSpeak: "Appuie pour parler",
      stopRecording: "Arrêter l'enregistrement",
      submit: "Soumettre pour retour",
      analyzing: "Analyse en cours...",
      micBlocked: "L'accès au microphone est requis.",
    },
    common: { back: "Retour", cancel: "Annuler", save: "Enregistrer", level: "Niveau" },
    auth: {
      signInTitle: "Bon retour",
      signUpTitle: "Crée ton compte",
      email: "E-mail",
      password: "Mot de passe",
      displayName: "Nom affiché",
      signIn: "Se connecter",
      signUp: "Créer un compte",
      noAccount: "Pas de compte ?",
      hasAccount: "Déjà un compte ?",
      orContinue: "ou continue avec",
      google: "Continuer avec Google",
      apple: "Continuer avec Apple",
    },
  },
  ar: {
    nav: { signIn: "تسجيل الدخول", signUp: "ابدأ الآن", dashboard: "لوحة التحكم", history: "السجل", rankings: "الترتيب", settings: "الإعدادات", signOut: "خروج", practice: "تدرب" },
    landing: {
      badge: "​",
      title1: "اعثر على صوتك،",
      title2: "دقيقة في كل مرة.",
      subtitle: "تدرّب على التحدث بالإنجليزية أو الفرنسية أو العربية. اختر المواضيع التي تحبها، فكّر 3 دقائق، تحدث دقيقة، واحصل على تقييم بالذكاء الاصطناعي.",
      cta: "ابدأ التدريب مجاناً",
      languages: "اللغات المتاحة",
      howTitle: "كيف يعمل",
      step1Title: "اختر لغة واهتماماتك",
      step1Desc: "إنجليزية أو فرنسية أو عربية، ثم اختر المواضيع التي تحبها — السفر، التكنولوجيا، الطعام، الموسيقى…",
      step2Title: "احصل على موضوع مخصص",
      step2Desc: "ينشئ الذكاء الاصطناعي موضوعاً مستوحى من اهتماماتك. 3 دقائق للتحضير.",
      step3Title: "تحدث لدقيقة",
      step3Desc: "سجل إجابتك. لا تقلق بشأن الكمال.",
      step4Title: "تقييم ذكي",
      step4Desc: "ملاحظات منظمة عن القواعد والمفردات والطلاقة.",
    },
    practice: {
      pickLanguage: "اختر لغة",
      pickLevel: "اختر مستواك",
      starting: "جارِ البدء...",
      start: "ابدأ الجلسة",
      thinking: "وقت التفكير",
      speaking: "جارِ التحدث",
      done: "تم",
      yourTopic: "موضوعك",
      holdToSpeak: "اضغط للتحدث",
      stopRecording: "إيقاف التسجيل",
      submit: "أرسل للتقييم",
      analyzing: "جارِ التحليل...",
      micBlocked: "يلزم الوصول إلى الميكروفون.",
    },
    common: { back: "رجوع", cancel: "إلغاء", save: "حفظ", level: "مستوى" },
    auth: {
      signInTitle: "أهلاً بعودتك",
      signUpTitle: "أنشئ حسابك",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      displayName: "اسم العرض",
      signIn: "تسجيل الدخول",
      signUp: "إنشاء حساب",
      noAccount: "ليس لديك حساب؟",
      hasAccount: "لديك حساب؟",
      orContinue: "أو تابع باستخدام",
      google: "المتابعة بحساب Google",
      apple: "المتابعة بحساب Apple",
    },
  },
};

type Dict = typeof dict.en;

const I18nContext = createContext<{ lang: LangCode; t: Dict; setLang: (l: LangCode) => void }>({
  lang: "en",
  t: dict.en,
  setLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");

  useEffect(() => {
    const stored = (typeof localStorage !== "undefined" && (localStorage.getItem("ui_lang") as LangCode)) || "en";
    setLangState(stored);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    }
  }, [lang]);

  const setLang = (l: LangCode) => {
    setLangState(l);
    if (typeof localStorage !== "undefined") localStorage.setItem("ui_lang", l);
  };

  const t = dict[lang] as Dict;
  return <I18nContext.Provider value={{ lang, t, setLang }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export const LANGUAGES: { code: LangCode; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "fr", label: "French", native: "Français" },
  { code: "ar", label: "Arabic", native: "العربية" },
];
