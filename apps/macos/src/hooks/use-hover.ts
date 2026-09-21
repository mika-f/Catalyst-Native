import { useState } from "react";

// マウス操作ではホバーが主要なフィードバックになるため、ホバー状態を className に反映できるようにする
export const useHover = () => {
  const [hovered, setHovered] = useState(false);
  return {
    hovered,
    hoverProps: {
      onHoverIn: () => setHovered(true),
      onHoverOut: () => setHovered(false),
    },
  };
};
