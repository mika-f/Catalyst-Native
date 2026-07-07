import { CatalystEmptyState } from "@/components/design-system";
import { Search } from "lucide-react-native";
import React from "react";
import { withUniwind } from "uniwind";

const UniSearchIcon = withUniwind(Search);

export const StatusesPlaceholder = () => {
  return (
    <CatalystEmptyState
      icon={<UniSearchIcon />}
      title="投稿を検索"
      description="キーワードもしくはハッシュタグを入力して検索"
    />
  );
};
