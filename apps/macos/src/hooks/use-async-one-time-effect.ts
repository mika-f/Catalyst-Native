import { useEffect } from "react";

export const useAsyncOneTimeEffect = (callback: () => Promise<void>) => {
  useEffect(() => {
    callback()
      .then(() => {})
      .catch((error) => {
        console.error("Error in useAsyncOneTimeEffect:", error);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
