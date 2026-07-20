import { act, render, waitFor } from "@testing-library/react-native";
import React from "react";
import type { TimelineHandle, TimelineStatusItem } from "./base";
import { TimelineBase } from "./base";

type CapturedProps = {
  data: TimelineStatusItem[];
  refreshControl: { props: { refreshing: boolean; onRefresh: () => void } };
  onEndReached: () => void;
  ListEmptyComponent?: React.ComponentType;
};

let mockCaptured: CapturedProps | null = null;
let mockCapturedScrollToOffset: jest.Mock;

// jest.mock のファクトリはトップレベル import をそのまま参照できない
// (out-of-scope variable の制約) ため、ここでは require を使う
jest.mock("@shopify/flash-list", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactActual = require("react");
  return {
    FlashList: ReactActual.forwardRef((props: CapturedProps, ref: React.Ref<unknown>) => {
      mockCaptured = props;
      ReactActual.useImperativeHandle(ref, () => ({ scrollToOffset: mockCapturedScrollToOffset }));
      return null;
    }),
  };
});

jest.mock("./status", () => ({ TimelineStatus: () => null }));
jest.mock("./placeholder", () => ({ TimelinePlaceholder: () => null }));

const item = (id: string) => ({ id }) as unknown as TimelineStatusItem;

describe("TimelineBase", () => {
  beforeEach(() => {
    mockCaptured = null;
    mockCapturedScrollToOffset = jest.fn();
  });

  it("初回マウント時に fetcher を呼び、取得結果を data として渡す", async () => {
    const fetcher = jest.fn().mockResolvedValue([item("1"), item("2")]);

    await render(<TimelineBase fetcher={fetcher} />);

    await waitFor(() => {
      expect(mockCaptured?.data).toEqual([item("1"), item("2")]);
    });
    expect(fetcher).toHaveBeenCalledWith(null, null);
  });

  it("pull-to-refresh で新着アイテムを先頭にマージする", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce([item("2"), item("1")])
      .mockResolvedValueOnce([item("3")]);

    await render(<TimelineBase fetcher={fetcher} />);
    await waitFor(() => expect(mockCaptured?.data).toEqual([item("2"), item("1")]));

    await act(async () => {
      await mockCaptured?.refreshControl.props.onRefresh();
    });

    await waitFor(() => {
      expect(mockCaptured?.data).toEqual([item("3"), item("2"), item("1")]);
    });
    expect(fetcher).toHaveBeenLastCalledWith("2", null);
  });

  it("onRefresh コールバックを最後に呼ぶ", async () => {
    const fetcher = jest.fn().mockResolvedValue([]);
    const onRefresh = jest.fn();

    await render(<TimelineBase fetcher={fetcher} onRefresh={onRefresh} />);
    await waitFor(() => expect(mockCaptured).not.toBeNull());

    await act(async () => {
      await mockCaptured?.refreshControl.props.onRefresh();
    });

    expect(onRefresh).toHaveBeenCalled();
  });

  it("末尾到達 (onEndReached) で古いアイテムを末尾にマージする", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce([item("2"), item("1")])
      .mockResolvedValueOnce([item("0")]);

    await render(<TimelineBase fetcher={fetcher} />);
    await waitFor(() => expect(mockCaptured?.data).toEqual([item("2"), item("1")]));

    await act(async () => {
      await mockCaptured?.onEndReached();
    });

    await waitFor(() => {
      expect(mockCaptured?.data).toEqual([item("2"), item("1"), item("0")]);
    });
    expect(fetcher).toHaveBeenLastCalledWith(null, "1");
  });

  it("fetcher が空配列を返したら以降の onEndReached を無視する (hasMore=false)", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce([item("1")])
      .mockResolvedValueOnce([]);

    await render(<TimelineBase fetcher={fetcher} />);
    await waitFor(() => expect(mockCaptured?.data).toEqual([item("1")]));

    await act(async () => {
      await mockCaptured?.onEndReached();
    });
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));

    await act(async () => {
      await mockCaptured?.onEndReached();
    });

    // 3 回目は呼ばれない (hasMore が false のためガードされる)
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("fetcher が既知の ID しか返さなければ hasMore を false にする (無限ループ防止)", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce([item("1")])
      .mockResolvedValueOnce([item("1")]); // 既に取得済みの ID のみ

    await render(<TimelineBase fetcher={fetcher} />);
    await waitFor(() => expect(mockCaptured?.data).toEqual([item("1")]));

    await act(async () => {
      await mockCaptured?.onEndReached();
    });
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));

    await act(async () => {
      await mockCaptured?.onEndReached();
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("scrollToTop ハンドルで FlashList の scrollToOffset を呼ぶ", async () => {
    const fetcher = jest.fn().mockResolvedValue([]);
    const ref = React.createRef<TimelineHandle>();

    await render(<TimelineBase fetcher={fetcher} ref={ref} />);
    await waitFor(() => expect(mockCaptured).not.toBeNull());

    ref.current?.scrollToTop();

    expect(mockCapturedScrollToOffset).toHaveBeenCalledWith({ offset: 0, animated: true });
  });
});
