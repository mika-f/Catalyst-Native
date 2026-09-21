import { useEffect } from "react";

export const useOneTimeEffect = (callback: () => void) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => callback(), []);
};
