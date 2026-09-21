// 各セルの幅は「コンテナ幅 / カラム数」になるため、ここではカラム数だけを決める
export const getColumnCount = (width: number, min: number, max: number): number => {
  return Math.max(1, Math.floor(width / min), Math.ceil(width / max));
}

export const getColumnWidth = (width: number, min: number, max: number): number => {
  const columns = getColumnCount(width, min, max);
  return width / columns;
};
