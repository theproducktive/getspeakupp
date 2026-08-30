// Curated list of practice interests. Used to personalize AI-generated topics.
import {
  Plane,
  UtensilsCrossed,
  Laptop,
  Briefcase,
  Clapperboard,
  Music,
  Trophy,
  BookOpen,
  Palette,
  FlaskConical,
  Leaf,
  Dumbbell,
  Shirt,
  Gamepad2,
  GraduationCap,
  Landmark,
  Vote,
  Users,
  TrendingUp,
  Globe2,
  type LucideIcon,
} from "lucide-react";

export type Interest = {
  id: string;
  icon: LucideIcon;
  label_en: string;
  label_fr: string;
  label_ar: string;
};

export const INTERESTS: Interest[] = [
  { id: "travel", icon: Plane, label_en: "Travel", label_fr: "Voyage", label_ar: "السفر" },
  { id: "food", icon: UtensilsCrossed, label_en: "Food & cooking", label_fr: "Cuisine", label_ar: "الطعام والطبخ" },
  { id: "tech", icon: Laptop, label_en: "Technology", label_fr: "Technologie", label_ar: "التكنولوجيا" },
  { id: "business", icon: Briefcase, label_en: "Business", label_fr: "Affaires", label_ar: "الأعمال" },
  { id: "movies", icon: Clapperboard, label_en: "Movies & TV", label_fr: "Cinéma & TV", label_ar: "الأفلام والتلفزيون" },
  { id: "music", icon: Music, label_en: "Music", label_fr: "Musique", label_ar: "الموسيقى" },
  { id: "sports", icon: Trophy, label_en: "Sports", label_fr: "Sport", label_ar: "الرياضة" },
  { id: "books", icon: BookOpen, label_en: "Books", label_fr: "Livres", label_ar: "الكتب" },
  { id: "art", icon: Palette, label_en: "Art & design", label_fr: "Art & design", label_ar: "الفن والتصميم" },
  { id: "science", icon: FlaskConical, label_en: "Science", label_fr: "Science", label_ar: "العلوم" },
  { id: "nature", icon: Leaf, label_en: "Nature", label_fr: "Nature", label_ar: "الطبيعة" },
  { id: "fitness", icon: Dumbbell, label_en: "Fitness & health", label_fr: "Forme & santé", label_ar: "اللياقة والصحة" },
  { id: "fashion", icon: Shirt, label_en: "Fashion", label_fr: "Mode", label_ar: "الموضة" },
  { id: "gaming", icon: Gamepad2, label_en: "Gaming", label_fr: "Jeux vidéo", label_ar: "الألعاب" },
  { id: "education", icon: GraduationCap, label_en: "Education", label_fr: "Éducation", label_ar: "التعليم" },
  { id: "history", icon: Landmark, label_en: "History", label_fr: "Histoire", label_ar: "التاريخ" },
  { id: "politics", icon: Vote, label_en: "Politics & society", label_fr: "Politique & société", label_ar: "السياسة والمجتمع" },
  { id: "family", icon: Users, label_en: "Family & relationships", label_fr: "Famille & relations", label_ar: "العائلة والعلاقات" },
  { id: "career", icon: TrendingUp, label_en: "Career growth", label_fr: "Carrière", label_ar: "التطور المهني" },
  { id: "environment", icon: Globe2, label_en: "Environment", label_fr: "Environnement", label_ar: "البيئة" },
];

export function interestLabel(i: Interest, lang: "en" | "fr" | "ar") {
  return lang === "fr" ? i.label_fr : lang === "ar" ? i.label_ar : i.label_en;
}
