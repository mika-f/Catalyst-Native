import { CatalystEmptyState } from "@/components/design-system";
import { Users } from "lucide-react-native";
import React from "react";
import { withUniwind } from "uniwind";

const UniUsersIcon = withUniwind(Users);

export const UsersPlaceholder = () => {
  return (
    <CatalystEmptyState icon={<UniUsersIcon />} title="ユーザーを検索" description="キーワードを入力して検索" />
  );
};
