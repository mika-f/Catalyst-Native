import { useEffect, useRef } from "react";

export const useInterval = (callback: () => void | Promise<void>, delay: number) => {
  const savedCallback = useRef(callback);

  // Remember the latest callback if it changes.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    if (delay !== null) {
      const run = () => {
        const val = savedCallback.current();
        if (val instanceof Promise) {
          val.then(() => { }).catch(() => { });
        }
      };

      const id = setInterval(run, delay);

      // run immediately once before the interval starts
      run();
      return () => clearInterval(id);
    }
  }, [delay]);
};

