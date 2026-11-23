import { coinCopy } from "@/lib/learning-hub/shop-logic";
import type { ShopItem } from "@/lib/learning-hub/shop-types";
import { EmblemIcon, FramedAvatar, TitleBadge } from "../shop/item-art";

export function LevelItemReward({ item }: { item: ShopItem }) {
  return (
    <span className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1 text-xs font-semibold">
      {item.kind === "title" ? <TitleBadge item={item} /> : <>
        {item.kind === "emblem" ? <EmblemIcon item={item} decorative className="size-6" />
          : <FramedAvatar name="Mây" equipment={{ avatar_frame: item }} className="size-7 text-[0.625rem]" />}
        <span className="wrap-anywhere">{coinCopy(item.name)}</span>
      </>}
    </span>
  );
}
