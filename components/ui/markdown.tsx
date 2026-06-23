import { openUrlWithBrowser } from "@/models/browser-settings";
import React, { Fragment, useCallback, useMemo } from "react";
import { Text, View } from "react-native";
import { jsx, jsxs } from "react/jsx-runtime";
import RehypeReact from "rehype-react";
import RehypeSanitize from "rehype-sanitize";
import RemarkBreaks from "remark-breaks";
import RemarkGfm from "remark-gfm";
import RemarkParse from "remark-parse";
import RemarkRehype from "remark-rehype";
import { unified } from "unified";

import "@/global.css";

type Props = {
  body: string;
  selectable?: boolean;
};

// rehype-react can produce bare string text nodes (e.g. whitespace between block elements)
// as direct children of the Fragment root. Wrapping them ensures they're valid in React Native.
function makeWrapBareStrings(selectable: boolean) {
  return function wrapBareStrings(node: React.ReactNode): React.ReactNode {
    if (typeof node === "string") {
      const trimmed = node.trim();
      return trimmed ? (
        <Text selectable={selectable} className="text-sm text-light-text dark:text-dark-text">
          {trimmed}
        </Text>
      ) : null;
    }

    return node;
  };
}

export const Markdown = React.memo(({ body, selectable = false }: Props) => {
  const handleLinkPress = useCallback((url: string) => {
    openUrlWithBrowser(url);
  }, []);

  const wrapBareStrings = useMemo(() => makeWrapBareStrings(selectable), [selectable]);

  const content = useMemo(() => {
    const u = unified()
      .use(RemarkParse)
      .use(RemarkGfm)
      .use(RemarkBreaks)
      .use(RemarkRehype)
      .use(RehypeSanitize)
      .use(RehypeReact, {
        Fragment,
        jsx,
        jsxs,
        components: {
          h1: ({ children }: { children: React.ReactNode }) => (
            <Text selectable={selectable} className="text-xl font-bold text-light-text dark:text-dark-text mt-4 mb-1">
              {children}
            </Text>
          ),
          h2: ({ children }: { children: React.ReactNode }) => (
            <Text selectable={selectable} className="text-lg font-bold text-light-text dark:text-dark-text mt-3 mb-1">
              {children}
            </Text>
          ),
          h3: ({ children }: { children: React.ReactNode }) => (
            <Text selectable={selectable} className="text-base font-bold text-light-text dark:text-dark-text mt-2 mb-1">
              {children}
            </Text>
          ),
          h4: ({ children }: { children: React.ReactNode }) => (
            <Text selectable={selectable} className="text-sm font-bold text-light-text dark:text-dark-text mt-2 mb-0.5">
              {children}
            </Text>
          ),
          h5: ({ children }: { children: React.ReactNode }) => (
            <Text selectable={selectable} className="text-sm font-semibold text-light-text dark:text-dark-text mt-2 mb-0.5">
              {children}
            </Text>
          ),
          h6: ({ children }: { children: React.ReactNode }) => (
            <Text selectable={selectable} className="text-sm font-semibold text-light-text-muted dark:text-dark-text-muted mt-2 mb-0.5">
              {children}
            </Text>
          ),
          p: ({ children }: { children: React.ReactNode }) => (
            <Text selectable={selectable} className="text-sm text-light-text dark:text-dark-text leading-relaxed mb-2">
              {children}
            </Text>
          ),
          strong: ({ children }: { children: React.ReactNode }) => (
            <Text className="font-bold text-light-text dark:text-dark-text">
              {children}
            </Text>
          ),
          em: ({ children }: { children: React.ReactNode }) => (
            <Text className="italic text-light-text dark:text-dark-text">
              {children}
            </Text>
          ),
          code: ({ children }: { children: React.ReactNode }) => (
            <Text className="font-mono text-sm bg-light-surface-muted dark:bg-dark-surface-muted text-light-text dark:text-dark-text px-1 rounded">
              {" "}{children}{" "}
            </Text>
          ),
          pre: ({ children }: { children: React.ReactNode }) => (
            <View className="bg-light-surface-muted dark:bg-dark-surface-muted rounded-lg p-3 my-2">
              <Text selectable={selectable} className="font-mono text-xs text-light-text dark:text-dark-text">
                {children}
              </Text>
            </View>
          ),
          blockquote: ({ children }: { children: React.ReactNode }) => (
            <View className="border-l-4 border-light-border dark:border-dark-border pl-3 my-2">
              <Text selectable={selectable} className="text-sm text-light-text-muted dark:text-dark-text-muted italic">
                {children}
              </Text>
            </View>
          ),
          ul: ({ children }: { children: React.ReactNode }) => (
            <View className="my-1 gap-0.5">
              {React.Children.map(children, wrapBareStrings)}
            </View>
          ),
          ol: ({ children }: { children: React.ReactNode }) => (
            <View className="my-1 gap-0.5">
              {React.Children.map(children, wrapBareStrings)}
            </View>
          ),
          li: ({ children }: { children: React.ReactNode }) => (
            <View className="flex-row items-start gap-1.5">
              <Text className="text-sm text-light-text dark:text-dark-text mt-0.5">
                ·
              </Text>
              <Text selectable={selectable} className="flex-1 text-sm text-light-text dark:text-dark-text leading-relaxed">
                {children}
              </Text>
            </View>
          ),
          hr: () => (
            <View className="border-b border-light-divider dark:border-dark-divider my-3" />
          ),
          a: ({
            href,
            children,
          }: {
            href?: string;
            children: React.ReactNode;
          }) => (
            <Text
              className="text-light-tint dark:text-dark-tint"
              onPress={() => href && handleLinkPress(href)}
            >
              {children}
            </Text>
          ),
          br: () => <Text>{"\n"}</Text>,
          div: ({ children }: { children: React.ReactNode }) => (
            <Text selectable={selectable} className="text-sm text-light-text dark:text-dark-text">
              {children}
            </Text>
          ),
          small: ({ children }: { children: React.ReactNode }) => (
            <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
              {children}
            </Text>
          ),
          span: ({ children }: { children: React.ReactNode }) => (
            <Text className="text-sm text-light-text dark:text-dark-text">
              {children}
            </Text>
          ),
          b: ({ children }: { children: React.ReactNode }) => (
            <Text className="font-bold text-light-text dark:text-dark-text">
              {children}
            </Text>
          ),
          i: ({ children }: { children: React.ReactNode }) => (
            <Text className="italic text-light-text dark:text-dark-text">
              {children}
            </Text>
          ),
        },
      });

    return u.processSync(body).result;
  }, [body, selectable, wrapBareStrings, handleLinkPress]);

  return (
    <View>
      {React.Children.map(
        React.isValidElement(content)
          ? (content.props as { children?: React.ReactNode }).children
          : content,
        wrapBareStrings,
      )}
    </View>
  );
});

Markdown.displayName = "Markdown";
