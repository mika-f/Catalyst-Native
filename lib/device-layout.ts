import { Platform } from "react-native";

export const isIPad = Platform.OS === "ios" && Platform.isPad;

/**
 * Mac Catalyst 上で動作しているか。
 * Catalyst では Platform.OS は "ios" のままで、iPad 互換の画面として描画される。
 * UIKit の一部 (SFSafariViewController など) が利用できないため、その分岐に使う。
 */
export const isMacCatalyst = Platform.OS === "ios" && Platform.isMacCatalyst;
export const POST_COLUMNS = isIPad ? 4 : 3;
export const MEDIA_COLUMNS = isIPad ? 3 : 2;
export const LIST_COLUMNS = isIPad ? 2 : 1;
