import { type Asset, useAssets } from "expo-asset";
import { readAsStringAsync } from "expo-file-system/legacy";
import { useEffect, useState } from "react";
import type { EmojiCategory, EmojiCategoryType, EmojiItem } from "./types";
import { CATEGORY_META, CATEGORY_ORDER, mapGroupToCategory } from "./types";

interface ParsedEmoji {
  emoji: string;
  name: string;
  group: string;
}

function parseEmojiTestData(content: string): Map<string, ParsedEmoji[]> {
  const result = new Map<string, ParsedEmoji[]>();
  let currentGroup = "";

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("# group:")) {
      currentGroup = trimmed.replace("# group:", "").trim();
      continue;
    }

    if (trimmed.startsWith("#")) continue;
    if (!trimmed.includes(";") || !trimmed.includes("#")) continue;

    const [, statusAndComment] = trimmed.split(";");
    if (!statusAndComment) continue;

    const [status, ...commentParts] = statusAndComment.split("#");
    if (status.trim() !== "fully-qualified") continue;

    const comment = commentParts.join("#").trim();
    const parts = comment.split(" ");
    if (parts.length < 3) continue;

    const emoji = parts[0];
    const name = parts.slice(2).join(" ");

    if (!result.has(currentGroup)) {
      result.set(currentGroup, []);
    }
    result.get(currentGroup)!.push({ emoji, name, group: currentGroup });
  }

  return result;
}

let cachedCategories: EmojiCategory[] | null = null;
// 複数の EmojiPickerSheet が同時にマウントされてもパースを一度だけにするための共有 Promise
let pendingLoad: Promise<EmojiCategory[]> | null = null;

function buildCategories(content: string): EmojiCategory[] {
  const parsedData = parseEmojiTestData(content);
  const categoryMap = new Map<string, EmojiItem[]>();

  for (const [group, emojis] of parsedData) {
    const categoryId = mapGroupToCategory(group);
    if (!categoryId) continue;

    const items = emojis.map(
      (e): EmojiItem => ({
        id: e.emoji,
        type: { kind: "unicode", emoji: e.emoji },
        keywords: [e.name],
      }),
    );

    const existing = categoryMap.get(categoryId) ?? [];
    categoryMap.set(categoryId, [...existing, ...items]);
  }

  return CATEGORY_ORDER.filter((type) => categoryMap.has(type)).map(
    (type): EmojiCategory => ({
      id: type,
      title: CATEGORY_META[type].title,
      icon: CATEGORY_META[type].icon,
      emojis: categoryMap.get(type)!,
    }),
  );
}

function loadCategories(asset: Asset): Promise<EmojiCategory[]> {
  if (!pendingLoad) {
    pendingLoad = (async () => {
      if (!asset.localUri) {
        await asset.downloadAsync();
      }
      const content = await readAsStringAsync(asset.localUri!);
      cachedCategories = buildCategories(content);
      return cachedCategories;
    })();

    // 失敗時は Promise を破棄して次回の呼び出しで再試行できるようにする
    pendingLoad.catch(() => {
      pendingLoad = null;
    });
  }

  return pendingLoad;
}

export function useDefaultCategories(): {
  categories: EmojiCategory[];
  isLoading: boolean;
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const [assets, assetError] = useAssets([require("@/assets/images/emoji-test.txt")]);
  const [categories, setCategories] = useState<EmojiCategory[]>(
    cachedCategories ?? [],
  );
  const [isLoading, setIsLoading] = useState(cachedCategories === null);

  useEffect(() => {
    if (assetError) {
      console.error("Failed to load emoji asset:", assetError);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false);
      return;
    }

    if (!assets || assets.length === 0) return;

    // ロードは共有 Promise に集約されているため、別のインスタンスが
    // すでにロード済み・ロード中でもここで必ず isLoading が解除される
    let cancelled = false;
    loadCategories(assets[0])
      .then((loaded) => {
        if (!cancelled) {
          setCategories(loaded);
        }
      })
      .catch((e) => {
        console.error("Failed to load emoji data:", e);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [assets, assetError]);

  return { categories, isLoading };
}

export function getFilteredCategories(
  exclude: EmojiCategoryType[],
  categories: EmojiCategory[],
): EmojiCategory[] {
  return categories.filter((c) => !exclude.includes(c.id as EmojiCategoryType));
}
