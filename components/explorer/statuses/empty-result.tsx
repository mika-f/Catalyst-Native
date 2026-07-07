import { CatalystEmptyState } from "@/components/design-system";
import { SearchX } from "lucide-react-native";
import React from "react";
import { withUniwind } from "uniwind";

const UniSearchXIcon = withUniwind(SearchX);

export const StatusesEmptyResult = () => {
  return (
    <CatalystEmptyState
      icon={<UniSearchXIcon />}
      title="投稿が見つかりません"
      description="別のキーワードで検索してみてください"
    />
  );
};
