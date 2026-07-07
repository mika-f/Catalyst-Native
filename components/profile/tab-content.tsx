import { EgeriaUser } from "@/models/sdk-types";
import React from "react";
import { UserAlbums } from "./albums";
import { UserGallery } from "./gallery";
import { UserLikes } from "./likes";
import { UserTimeline, UserTimelineHandle } from "./timeline";

import "@/global.css";

type Props = {
  tab: { route: string };
  user?: EgeriaUser | null;
};

export const TabContent = React.forwardRef<UserTimelineHandle, Props>(({ tab, user }, ref) => {
  if (user) {
    switch (tab.route) {
      case "posts":
        return <UserTimeline ref={ref} user={user} />;

      case "gallery":
        return <UserGallery ref={ref} user={user} />;

      case "album":
        return <UserAlbums user={user} />;

      case "likes":
        return <UserLikes ref={ref} />;
    }
  }

  return null;
});
TabContent.displayName = "TabContent";
