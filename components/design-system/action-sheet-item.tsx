import { cn } from "@/lib/utils";
import { CatalystListItem, CatalystListItemContent, type CatalystListItemProps } from "./list-item";
import { CatalystText, type CatalystTextProps } from "./text";

type CatalystActionSheetItemTone = "default" | "accent" | "destructive";

const iconToneClassName: Record<CatalystActionSheetItemTone, string> = {
  default: "text-light-text dark:text-dark-text",
  accent: "text-light-accent dark:text-dark-accent",
  destructive: "text-light-error dark:text-dark-error",
};

const textTone: Record<CatalystActionSheetItemTone, CatalystTextProps["tone"]> = {
  default: "default",
  accent: "accent",
  destructive: "danger",
};

export type CatalystActionSheetItemProps = Omit<CatalystListItemProps, "children"> & {
  title: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  tone?: CatalystActionSheetItemTone;
};

export const CatalystActionSheetItem = ({
  title,
  icon: Icon,
  tone = "default",
  className,
  ...props
}: CatalystActionSheetItemProps) => {
  return (
    <CatalystListItem divided={false} className={cn("min-h-14 px-5 py-3.5", className)} {...props}>
      {Icon && <Icon size={20} className={iconToneClassName[tone]} />}
      <CatalystListItemContent className="gap-0">
        {typeof title === "string" ? (
          <CatalystText
            variant="subtitle"
            tone={textTone[tone]}
            className="text-[15px] font-semibold"
            numberOfLines={1}
          >
            {title}
          </CatalystText>
        ) : (
          title
        )}
      </CatalystListItemContent>
    </CatalystListItem>
  );
};
