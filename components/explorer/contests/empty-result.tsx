import { CatalystEmptyState } from "@/components/design-system";
import { SearchX } from "lucide-react-native";
import React from "react";
import { withUniwind } from "uniwind";

const UniSearchXIcon = withUniwind(SearchX);

export const ContestsEmptyResult = () => {
  return (
    <CatalystEmptyState
      icon={<UniSearchXIcon />}
      title="コンテストが見つかりません"
      description="別のキーワードで検索してみてください"
    />
  );
};
