export type EmojiItemType =
  | { kind: "unicode"; emoji: string }
  | { kind: "url"; url: string; customReactionId?: string };

export type EmojiItem = {
  id: string;
  type: EmojiItemType;
  keywords: string[];
};

export type EmojiCategory = {
  id: string;
  title: string;
  icon: string;
  emojis: EmojiItem[];
};

export type EmojiCategoryType =
  | "frequency"
  | "smileys_and_people"
  | "animals_and_nature"
  | "food_and_drink"
  | "activity"
  | "travel_and_places"
  | "objects"
  | "symbols"
  | "flags";

export const CATEGORY_META: Record<
  EmojiCategoryType,
  { title: string; icon: string }
> = {
  frequency: { title: "最近使った絵文字", icon: "clock" },
  smileys_and_people: { title: "スマイリーと人々", icon: "smile" },
  animals_and_nature: { title: "動物と自然", icon: "paw-print" },
  food_and_drink: { title: "食べ物と飲み物", icon: "utensils" },
  activity: { title: "アクティビティ", icon: "trophy" },
  travel_and_places: { title: "旅行と場所", icon: "plane" },
  objects: { title: "物", icon: "lightbulb" },
  symbols: { title: "記号", icon: "heart" },
  flags: { title: "旗", icon: "flag" },
};

export const CATEGORY_ORDER: EmojiCategoryType[] = [
  "smileys_and_people",
  "animals_and_nature",
  "food_and_drink",
  "activity",
  "travel_and_places",
  "objects",
  "symbols",
  "flags",
];

const GROUP_TO_CATEGORY: Record<string, EmojiCategoryType> = {
  "Smileys & Emotion": "smileys_and_people",
  "People & Body": "smileys_and_people",
  "Animals & Nature": "animals_and_nature",
  "Food & Drink": "food_and_drink",
  Activities: "activity",
  "Travel & Places": "travel_and_places",
  Objects: "objects",
  Symbols: "symbols",
  Flags: "flags",
};

export function mapGroupToCategory(
  group: string,
): EmojiCategoryType | undefined {
  return GROUP_TO_CATEGORY[group];
}
