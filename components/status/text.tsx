import { catalystLinkClassName } from "@/components/design-system";
import { cn } from "@/lib/utils";
import { openUrlWithBrowser } from "@/models/browser-settings";
import { extractEntities } from "@natsuneko-laboratory/react-native-twitter-text";
import { Link } from "expo-router";
import React, { Fragment, useCallback, useMemo } from "react";
import { Text, View } from "react-native";
import { jsx, jsxs } from "react/jsx-runtime";
import RehypeRaw from "rehype-raw";
import RehypeReact from "rehype-react";
import RehypeSanitize from "rehype-sanitize";
import RemarkBreaks from "remark-breaks";
import RemarkParse from "remark-parse";
import RemarkRehype from "remark-rehype";
import { unified } from "unified";
import { withUniwind } from "uniwind";

const UniLink = withUniwind(Link);

function wrapBareStrings(node: React.ReactNode, textClassName: string): React.ReactNode {
  if (typeof node === "string") {
    const trimmed = node.trim();
    return trimmed ? <Text className={textClassName}>{trimmed}</Text> : null;
  }

  return node;
}

export const StatusText = React.memo(
  ({
    linkClassName = cn(catalystLinkClassName, "leading-none"),
    status,
    textClassName = "text-[15px] leading-5 text-light-text dark:text-dark-text",
  }: {
    linkClassName?: string;
    status: string;
    textClassName?: string;
  }) => {
    const handleLinkPress = useCallback((url: string) => {
      openUrlWithBrowser(url);
    }, []);

    const val = useMemo(() => {
      const entities = extractEntities(status);
      const sb: string[] = [];
      let cursor = 0;

      for (const entity of entities) {
        if (entity.range.start > cursor) {
          sb.push(status.slice(cursor, entity.range.start));
        }

        switch (entity.type) {
          case "url": {
            const url = status.slice(entity.range.start, entity.range.end);
            sb.push(`<a href="${url}">${url}</a>`);
            break;
          }
          case "hashtag": {
            const tag = status.slice(entity.range.start + 1, entity.range.end);
            sb.push(`<a href="/search/%23${tag}">#${tag}</a>`);
            break;
          }
          case "mention": {
            const mention = status.slice(entity.range.start + 1, entity.range.end);
            const label = status.slice(entity.range.start, entity.range.end);
            sb.push(`<a href="/user/${mention}">${label}</a>`);
            break;
          }
          default:
            sb.push(status.slice(entity.range.start, entity.range.end));
        }

        cursor = entity.range.end;
      }

      if (cursor < status.length) {
        sb.push(status.slice(cursor));
      }

      const html = sb.join("");

      const u = unified()
        .use(RemarkParse)
        .use(RemarkBreaks)
        .use(RemarkRehype, { allowDangerousHtml: true })
        .use(RehypeRaw)
        .use(RehypeSanitize)
        .use(RehypeReact, {
          Fragment,
          jsx,
          jsxs,
          components: {
            h1: ({ children }: { children: React.ReactNode }) => (
              <Text className={textClassName}>{children}</Text>
            ),
            h2: ({ children }: { children: React.ReactNode }) => (
              <Text className={textClassName}>{children}</Text>
            ),
            h3: ({ children }: { children: React.ReactNode }) => (
              <Text className={textClassName}>{children}</Text>
            ),
            h4: ({ children }: { children: React.ReactNode }) => (
              <Text className={textClassName}>{children}</Text>
            ),
            h5: ({ children }: { children: React.ReactNode }) => (
              <Text className={textClassName}>{children}</Text>
            ),
            h6: ({ children }: { children: React.ReactNode }) => (
              <Text className={textClassName}>{children}</Text>
            ),
            code: ({ children }: { children: React.ReactNode }) => (
              <Text className={textClassName}>{children}</Text>
            ),
            pre: ({ children }: { children: React.ReactNode }) => (
              <Text className={textClassName}>{children}</Text>
            ),
            div: ({ children }: { children: React.ReactNode }) => (
              <Text className={textClassName}>{children}</Text>
            ),
            a: ({ href, children }: { href: string; children: React.ReactNode }) => {
              if (href.startsWith("/")) {
                return (
                  <UniLink className={linkClassName} href={href}>
                    {children}
                  </UniLink>
                );
              }

              return (
                <Text className={linkClassName} onPress={() => handleLinkPress(href)}>
                  {children}
                </Text>
              );
            },
            br: () => <View />,
            p: ({ children }: { children: React.ReactNode }) => (
              <Text className={textClassName}>{children}</Text>
            ),
            span: ({ children }: { children: React.ReactNode }) => (
              <Text className={textClassName}>{children}</Text>
            ),
          },
        });

      return u.processSync(html).result;
    }, [status, handleLinkPress, linkClassName, textClassName]);

    return (
      <View>
        {React.Children.map(
          React.isValidElement(val) ? (val.props as { children?: React.ReactNode }).children : val,
          (child) => wrapBareStrings(child, textClassName),
        )}
      </View>
    );
  },
  (a, b) => a.status === b.status && a.textClassName === b.textClassName && a.linkClassName === b.linkClassName,
);
StatusText.displayName = "StatusText";
