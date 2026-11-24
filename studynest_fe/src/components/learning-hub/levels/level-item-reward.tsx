import { coinCopy } from "@/lib/learning-hub/shop-logic";
import type { ShopItem } from "@/lib/learning-hub/shop-types";
import { cn } from "@/lib/utils";
import { EmblemIcon, FramedAvatar, TitleBadge } from "../shop/item-art";

interface LevelItemRewardProps {
  item: ShopItem;
  onSelect?: (item: ShopItem) => void;
}

export function LevelItemReward({ item, onSelect }: LevelItemRewardProps) {
  const content =
    item.kind === "title" ? (
      <TitleBadge item={item} />
    ) : (
      <>
        {item.kind === "emblem" ? (
          <EmblemIcon item={item} decorative className="size-6" />
        ) : (
          <FramedAvatar
            name="Mây"
            equipment={{ avatar_frame: item }}
            className="size-7 text-[0.625rem]"
          />
        )}
        <span className="wrap-anywhere">{coinCopy(item.name)}</span>
      </>
    );

  const baseClass =
    "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-foreground shadow-xs";

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(item)}
        aria-label={`Ướm thử ${coinCopy(item.name)}`}
        className={cn(
          baseClass,
          "cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary-pastel hover:bg-primary-light/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0",
        )}
      >
        {content}
      </button>
    );
  }

  return <span className={baseClass}>{content}</span>;
}
