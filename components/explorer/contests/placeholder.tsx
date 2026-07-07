import { CatalystEmptyState } from "@/components/design-system";
import { Trophy } from "lucide-react-native";
import React from "react";
import { withUniwind } from "uniwind";

const UniTrophyIcon = withUniwind(Trophy);

export const ContestsPlaceholder = () => {
  return (
    <CatalystEmptyState icon={<UniTrophyIcon />} title="コンテストを検索" description="キーワードを入力して検索" />
  );
};
