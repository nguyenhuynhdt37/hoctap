"use client";

import { Alert, Button, Modal } from "@/components/ui";
import { hubErrorMessage, isHubUnavailable } from "@/lib/learning-hub/errors";
import { useLevelUpMoment, type LevelUpMoment } from "@/lib/learning-hub/level-up-state";
import { useLearnerEquipment, useShopActions } from "@/lib/learning-hub/shop-hooks";
import { coinCopy, formatCoin, shopInventoryHref } from "@/lib/learning-hub/shop-logic";
import type { ShopItem } from "@/lib/learning-hub/shop-types";
import { useUserStore } from "@/stores/user";
import { motion, useReducedMotion } from "framer-motion";
import { Cloud, Coins, Flag } from "pulsoicon-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LevelItemReward } from "./level-item-reward";

const number = new Intl.NumberFormat("vi-VN");

function Celebration({ levelUp, onClose }: { levelUp: LevelUpMoment["levelUp"]; onClose: () => void }) {
  const reduce = useReducedMotion();
  const { pending, equip } = useShopActions();
  const equipment = useLearnerEquipment();
  const [equipError, setEquipError] = useState<unknown>();
  const [feedback, setFeedback] = useState("");

  async function equipReward(item: ShopItem) {
    setEquipError(undefined);
    setFeedback("");
    try {
      const result = await equip(item.kind, item.id);
      if (result) setFeedback(`Đã trang bị ${coinCopy(item.name)}.`);
    } catch (error) {
      setEquipError(error);
    }
  }

  return (
    <Modal open onClose={onClose} hideCloseButton closeOnOverlayClick={false}
      title={`Bạn đã lên cấp ${number.format(levelUp.to)}!`}
      footer={<>
        <Button variant="outline" onClick={onClose} className="min-h-11">Tiếp tục</Button>
        <Link href={shopInventoryHref} onClick={onClose} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">Xem trong kho</Link>
      </>}>
      <div className="relative isolate mb-4 flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl bg-primary-light p-3.5">
        <Cloud animated={false} aria-hidden="true" className="pointer-events-none absolute -right-6 -bottom-8 -z-10 size-24 -rotate-12 text-surface" strokeWidth={1} />
        <motion.span
          aria-hidden="true"
          initial={reduce ? false : { y: 16, rotate: -10 }}
          animate={{ y: 0, rotate: 0 }}
          transition={{ duration: reduce ? 0 : 0.48, ease: [0.22, 1, 0.36, 1] }}
          className="grid size-11 shrink-0 place-items-center rounded-full border border-primary-pastel bg-surface text-primary-hover"
        ><Flag animated={false} className="size-5" /></motion.span>
        <p className="font-semibold wrap-anywhere">Chuyến bay từ cấp {number.format(levelUp.from)} đến cấp {number.format(levelUp.to)}</p>
      </div>
      <ol className="divide-y divide-border">
        {levelUp.rewards.map(({ level, coins, items }) => (
          <li key={level} className="py-3 first:pt-0">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <h3 className="font-bold">Cấp {number.format(level)}</h3>
              <span className="flex items-center gap-1.5 text-sm font-bold text-accent-vanilla-foreground"><Coins animated={false} aria-hidden="true" className="size-4" />+{formatCoin(coins)}</span>
            </div>
            {items.length > 0 && <ul className="mt-2 space-y-2">
              {items.map((item) => {
                const equipped = equipment ? equipment[item.kind]?.id === item.id : item.equipped;
                return <li key={item.id} className="flex min-w-0 flex-wrap items-center justify-between gap-1.5">
                  <LevelItemReward item={item} />
                  <Button variant={equipped ? "ghost" : "pastel"} size="sm" className="min-h-11"
                    aria-disabled={equipped || pending || isHubUnavailable(equipError) || undefined}
                    aria-label={`${equipped ? "Đang dùng" : "Trang bị ngay"} ${coinCopy(item.name)}`} onClick={() => {
                      if (!equipped && !pending && !isHubUnavailable(equipError)) void equipReward(item);
                    }}>{equipped ? "Đang dùng" : "Trang bị ngay"}</Button>
                </li>;
              })}
            </ul>}
          </li>
        ))}
      </ol>
      <p role="status" className={feedback ? "mt-2 text-sm font-semibold text-success-foreground" : "sr-only"}>{feedback}</p>
      {equipError != null && <Alert variant={isHubUnavailable(equipError) ? "info" : "destructive"} className="mt-2">
        {hubErrorMessage(equipError, "Chưa trang bị được. Bạn thử lại nhé.")}
      </Alert>}
    </Modal>
  );
}

export function LevelUpCelebration() {
  const userId = useUserStore((state) => state.user?.id);
  const moment = useLevelUpMoment((state) => state.moment);
  useEffect(() => {
    if (moment && moment.userId !== userId) useLevelUpMoment.setState({ moment: null });
  }, [moment, userId]);

  if (!moment || moment.userId !== userId || typeof document === "undefined") return null;
  return createPortal(
    <div className="relative z-[70]">
      <Celebration levelUp={moment.levelUp} onClose={() => useLevelUpMoment.setState({ moment: null })} />
    </div>,
    document.body,
  );
}
