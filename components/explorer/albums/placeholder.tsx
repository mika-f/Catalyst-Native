import { CatalystEmptyState } from "@/components/design-system";
import { Images } from "lucide-react-native";
import React from "react";
import { withUniwind } from "uniwind";

const UniImagesIcon = withUniwind(Images);

export const AlbumsPlaceholder = () => {
  return (
    <CatalystEmptyState icon={<UniImagesIcon />} title="アルバムを検索" description="キーワードを入力して検索" />
  );
};
