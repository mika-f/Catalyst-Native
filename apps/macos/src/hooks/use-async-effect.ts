import React, { useEffect } from "react";

export const useAsyncEffect = (callback: () => Promise<void>, deps: React.DependencyList) => {
  useEffect(() => {
    callback().catch((e) => console.error(e));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
 };