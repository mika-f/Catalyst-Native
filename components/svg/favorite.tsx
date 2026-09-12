import { Path, Svg } from "react-native-svg"

type Props = React.ComponentProps<typeof Svg>

const Favorite = (props: Props) => (
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
      d="M12 21c-1.1-1-8-6.9-9-9-1.7-3.6.3-8 4.5-8 1.9 0 3.6.9 4.5 2.3.9-1.4 2.6-2.3 4.5-2.3 4.2 0 6.2 4.4 4.5 8-1 2.1-7.9 8-9 9Z"
    />
  </Svg>
)


const FavoriteFill = (props: Props) => (
  <Svg
    width={24}
    height={24}
    fill="none"
    {...props}
  >
    <Path
      fill="currentColor"
      d="M12 21c-1.1-1-8-6.9-9-9-1.7-3.6.3-8 4.5-8 1.9 0 3.6.9 4.5 2.3.9-1.4 2.6-2.3 4.5-2.3 4.2 0 6.2 4.4 4.5 8-1 2.1-7.9 8-9 9Z"
    />
  </Svg>
)


export { Favorite, FavoriteFill }
