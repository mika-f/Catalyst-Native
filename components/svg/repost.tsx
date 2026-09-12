import * as React from "react";
import Svg, { Path } from "react-native-svg";

type Props = React.ComponentProps<typeof Svg>;

const Repost = (props: Props) => (
  <Svg
    width={24}
    height={24}
    fill="none"
    {...props}
  >
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="m17 2.5 4 4-4 4"
    />
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M3 11V9.5a3 3 0 0 1 3-3h15M7 21.5l-4-4 4-4"
    />
    <Path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M21 13v1.5a3 3 0 0 1-3 3H3"
    />
  </Svg>
)
export { Repost };

