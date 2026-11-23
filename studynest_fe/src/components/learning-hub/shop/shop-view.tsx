"use client";

import { Alert, Badge, Button, EmptyState, Modal, Skeleton } from "@/components/ui";
import { mayPortrait, StudyImage } from "@/components/user/home/study-image";
import { hubErrorMessage, isHubUnavailable } from "@/lib/learning-hub/errors";
import { getHubDataSource } from "@/lib/learning-hub/data-source";
import { useShopActions, useShopInventory, useShopItems } from "@/lib/learning-hub/shop-hooks";
import {
  coinCopy, createPurchaseConfirmation, emptyEquipment, formatCoin, itemKindLabels, itemKinds, shopItemState,
} from "@/lib/learning-hub/shop-logic";
import type { Equipment, ItemKind, ShopItem } from "@/lib/learning-hub/shop-types";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/stores/user";
import { Cloud, Coins, Eye, PackageOpen } from "pulsoicon-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { HubLoadError } from "../hub-page-state";
import { MockDataChip } from "../mock-data-chip";
import { EmblemIcon, EquippedMarks, FramedAvatar, RarityBadge, TitleBadge } from "./item-art";

type ShopTab = ItemKind | "mine";
const tabs: readonly ShopTab[] = [...itemKinds, "mine"];
const labels = { ...itemKindLabels, mine: "Của tôi" };
const tabIndex = (tab: string | null) => tabs.findIndex((entry) => entry === tab);

function Preview({ equipment, active, name, avatar, status, previewRef, onReset }: {
  equipment: Equipment;
  active?: ShopItem;
  name: string;
  avatar?: string | null;
  status: string;
  previewRef: RefObject<HTMLHeadingElement | null>;
  onReset: () => void;
}) {
  return (
    <aside aria-labelledby="shop-preview" className="relative isolate min-w-0 overflow-hidden rounded-[1.5rem] border border-primary-pastel bg-surface px-5 py-4 sm:rounded-[2rem] sm:p-6">
      <Cloud aria-hidden="true" strokeWidth={1} className="pointer-events-none absolute -right-5 -bottom-10 -z-10 size-40 rotate-[-12deg] text-primary-light" />
      <h2 id="shop-preview" ref={previewRef} tabIndex={-1} className="scroll-mt-24 rounded-sm text-sm font-bold text-primary-hover">Gương thử đồ</h2>
      <div className="mt-2 flex items-center gap-3 sm:gap-4">
        <FramedAvatar equipment={equipment} src={avatar} name={name} className="size-[4.5rem] text-xl sm:size-24" />
        <div className="min-w-0">
          <p className="font-semibold wrap-anywhere">{name}</p>
          <EquippedMarks equipment={equipment} className="mt-1" />
          <p role="status" className="mt-1 text-sm wrap-anywhere">
            {active ? `Đang thử ${coinCopy(active.name)}` : status}
          </p>
        </div>
      </div>
      {active && <Button variant="ghost" size="sm" onClick={onReset} className="mt-1 min-h-11 px-0 text-primary-hover">Bỏ xem thử</Button>}
    </aside>
  );
}

function ItemCard({ item, avatar, name, balance, equipment, previewing, pending, onPreview, onPurchase, onEquip }: {
  item: ShopItem;
  avatar?: string | null;
  name: string;
  balance?: number;
  equipment?: Equipment;
  previewing: boolean;
  pending: boolean;
  onPreview: (trigger: HTMLButtonElement) => void;
  onPurchase: (trigger: HTMLButtonElement) => void;
  onEquip: (itemId: string | null) => void;
}) {
  const state = shopItemState(item, balance, equipment);
  const id = useId();
  const tone = { common: "bg-primary-light", rare: "bg-secondary", epic: "bg-accent/65", legendary: "bg-accent-vanilla" }[item.rarity];
  return (
    <article aria-labelledby={id} className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-card border border-border bg-surface">
      <div className={cn("relative isolate grid h-28 place-items-center overflow-hidden border-b border-border sm:h-36", tone)}>
        <Cloud animated={false} aria-hidden="true" strokeWidth={1} className="pointer-events-none absolute -left-5 -bottom-12 -z-10 size-36 rotate-[-12deg] text-surface/80" />
        <span aria-hidden="true" className="pointer-events-none absolute -top-6 right-3 -z-10 size-16 rounded-full border border-surface/90" />
        {item.kind === "avatar_frame" && <FramedAvatar src={avatar} name={name} equipment={{ avatar_frame: item }} className="size-20 text-xl sm:size-24" />}
        {item.kind === "title" && <TitleBadge item={item} className="mx-3 max-w-[calc(100%-1.5rem)] bg-surface px-2.5 py-1.5 text-sm" />}
        {item.kind === "emblem" && <EmblemIcon item={item} decorative className="size-16 sm:size-20" />}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-3 py-3.5 sm:p-4">
        <RarityBadge rarity={item.rarity} />
        <h3 id={id} className="text-sm leading-snug font-bold wrap-anywhere sm:text-base">{coinCopy(item.name)}</h3>
        {item.description && item.description !== item.name && (
          <p className="text-xs leading-relaxed wrap-anywhere">{coinCopy(item.description)}</p>
        )}
        {item.price !== null && <p className="flex items-center gap-1.5 text-sm font-bold text-accent-vanilla-foreground">
          <Coins aria-hidden="true" className="size-4 shrink-0" />{formatCoin(item.price)}
        </p>}
        {state.kind !== "available" && (
          <div className="text-xs leading-relaxed">
            <p className={cn("font-semibold", state.kind === "equipped" && "text-success-foreground")}>{state.label}</p>
            {"reason" in state && state.reason && <p className="mt-0.5 wrap-anywhere">{state.reason}</p>}
          </div>
        )}
        <div className="mt-auto grid gap-1.5 pt-1 sm:flex sm:flex-wrap">
          <Button variant="ghost" size="sm" aria-pressed={previewing} aria-label={`Xem thử ${coinCopy(item.name)}`}
            className={cn("min-h-11 px-2 text-primary-hover", previewing && "bg-primary-light")} onClick={(event) => onPreview(event.currentTarget)}
            leftIcon={<Eye className="size-4" />}>Xem thử</Button>
          {state.kind === "available" && <Button size="sm" className="min-h-11 px-2" disabled={pending} onClick={(event) => onPurchase(event.currentTarget)}>Đổi vật phẩm</Button>}
          {(state.kind === "owned" || state.kind === "equipped") && (
            <Button size="sm" variant={state.kind === "owned" ? "pastel" : "outline"} className="min-h-11 px-2"
              aria-disabled={pending || undefined} onClick={() => {
                if (!pending) onEquip(state.kind === "owned" ? item.id : null);
              }}>{state.kind === "owned" ? "Trang bị" : "Gỡ"}</Button>
          )}
        </div>
      </div>
    </article>
  );
}

export function ShopView() {
  const search = useSearchParams();
  const activeIndex = Math.max(tabIndex(search.get("tab")), 0);
  const activeTab = tabs[activeIndex];
  const id = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const previewRef = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const previewTrigger = useRef<HTMLButtonElement | null>(null);
  const user = useUserStore((state) => state.user);
  const catalog = useShopItems(activeTab === "mine" ? undefined : activeTab);
  const inventory = useShopInventory();
  const actions = useShopActions();
  const [preview, setPreview] = useState<ShopItem>();
  const [confirm, setConfirm] = useState<{ item: ShopItem; attempt: ReturnType<typeof createPurchaseConfirmation> }>();
  const [confirmError, setConfirmError] = useState<unknown>();
  const [equipmentError, setEquipmentError] = useState<unknown>();
  const [message, setMessage] = useState("");
  const equipment = inventory.data?.equipment ?? user?.equipment;
  const previewStatus = equipment ? "Trang bị hiện tại" : inventory.error
    ? hubErrorMessage(inventory.error, "Chưa tải được trang bị hiện tại.") : "Đang tải trang bị…";
  const balance = catalog.data?.balance ?? inventory.data?.balance;
  const activeQuery = activeTab === "mine" ? inventory : catalog;
  const items = activeQuery.data?.items ?? [];

  function selectTab(tab: ShopTab) {
    const url = new URL(window.location.href);
    if (tab === tabs[0]) url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url);
    setEquipmentError(undefined);
  }

  function moveTab(event: KeyboardEvent, index: number) {
    const targets: Record<string, number> = {
      ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length,
      Home: 0, End: tabs.length - 1,
    };
    const next = targets[event.key];
    if (typeof next !== "number") return;
    event.preventDefault();
    selectTab(tabs[next]);
    tabRefs.current[next]?.focus();
  }

  function startPurchase(item: ShopItem, trigger: HTMLButtonElement) {
    if (actions.pending) return;
    returnFocus.current = trigger;
    setConfirmError(undefined);
    setConfirm({ item, attempt: createPurchaseConfirmation(item.id) });
  }

  function closeConfirmation() {
    setConfirm(undefined);
    const trigger = returnFocus.current;
    returnFocus.current = null;
    if (!trigger) return;
    requestAnimationFrame(() => {
      if (trigger.isConnected && !trigger.disabled) trigger.focus({ preventScroll: true });
      else tabRefs.current[activeIndex]?.focus({ preventScroll: true });
    });
  }

  async function purchase() {
    if (!confirm) return;
    setConfirmError(undefined);
    try {
      const result = await confirm.attempt.submit(actions.purchase);
      if (!result) return;
      closeConfirmation();
      setMessage(`Đã thêm ${coinCopy(result.item.name)} vào kho.`);
    } catch (error) {
      setConfirmError(error);
    }
  }

  async function equip(item: ShopItem, itemId: string | null) {
    setEquipmentError(undefined);
    setMessage("");
    try {
      const result = await actions.equip(item.kind, itemId);
      if (!result) return;
      if (preview?.kind === item.kind) setPreview(undefined);
      setMessage(`${itemId ? "Đã trang bị" : "Đã gỡ"} ${coinCopy(item.name)}.`);
    } catch (error) {
      setEquipmentError(error);
    }
  }

  const previewEquipment = { ...(equipment ?? emptyEquipment), ...(preview && { [preview.kind]: preview }) };
  const name = user?.fullname || "Bạn";
  const retry = () => void activeQuery.mutate().catch(() => undefined);

  return (
    <main className="relative isolate min-h-screen overflow-clip bg-background pb-16">
      <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-8 sm:pt-10">
        <header className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] md:items-stretch">
          <div className="relative isolate overflow-hidden rounded-hero border border-primary-pastel bg-primary-light px-5 py-6 sm:px-9 sm:py-8">
            <Cloud aria-hidden="true" strokeWidth={0.65} className="pointer-events-none absolute -right-8 -bottom-16 -z-10 size-56 -rotate-12 text-surface sm:size-72" />
            <StudyImage src={mayPortrait} fallback={mayPortrait} sizes="100px" className="absolute right-7 bottom-7 -z-10 hidden size-24 rotate-6 rounded-[1.3rem] border-[3px] border-surface shadow-ambient-sm lg:block" />
            <MockDataChip source={getHubDataSource()} />
            <h1 className="type-display max-w-2xl">Cửa hàng Mây</h1>
            <p className="mt-2 max-w-sm text-sm leading-relaxed sm:text-base">Dùng Coin đổi khung avatar, danh hiệu và biểu tượng cho chuyến bay của bạn.</p>
            <div className="relative mt-5 inline-flex min-h-11 max-w-full items-center gap-2 overflow-hidden rounded-lg border border-dashed border-accent-vanilla-foreground/50 bg-accent-vanilla px-3 py-2 text-sm text-accent-vanilla-foreground">
              <Coins aria-hidden="true" className="size-4 shrink-0" />
              <span className="font-semibold">Số dư</span>
              {balance !== undefined ? <strong className="border-l border-dashed border-current/35 pl-2 wrap-anywhere tabular-nums">{formatCoin(balance)}</strong>
                : inventory.error && (catalog.error || activeTab === "mine") ? <span>Chưa tải được</span>
                  : <div role="status"><span className="sr-only">Đang tải số dư</span><Skeleton className="h-4 w-20 bg-surface/80 motion-reduce:animate-none" /></div>}
            </div>
            <Link href="/levels" className="mt-1 flex min-h-11 w-fit items-center rounded-sm text-sm font-semibold text-primary-hover underline underline-offset-4">Xem thưởng theo cấp</Link>
          </div>
          <Preview equipment={previewEquipment} active={preview} name={name} avatar={user?.avatar} status={previewStatus} previewRef={previewRef} onReset={() => {
            setPreview(undefined);
            if (previewTrigger.current?.isConnected) previewTrigger.current.focus();
            else previewRef.current?.focus({ preventScroll: true });
          }} />
        </header>

        <div role="tablist" aria-label="Ngăn cửa hàng" className="mt-7 grid grid-cols-2 gap-1 rounded-card border border-border bg-surface p-1.5 sm:flex sm:w-fit sm:flex-wrap">
          {tabs.map((tab, index) => (
            <button key={tab} type="button" role="tab" aria-selected={tab === activeTab}
              id={`${id}-${tab}`} aria-controls={`${id}-panel-${tab}`}
              ref={(element) => { tabRefs.current[index] = element; }} tabIndex={tab === activeTab ? 0 : -1}
              onClick={() => selectTab(tab)} onKeyDown={(event) => moveTab(event, index)}
              className="min-h-11 rounded-xl px-2.5 text-sm font-semibold hover:bg-background focus-visible:outline-2 focus-visible:outline-ring aria-selected:bg-primary-light aria-selected:text-primary-hover sm:px-4">
              {labels[tab]}
            </button>
          ))}
        </div>
        <p role="status" className={cn("text-sm font-semibold text-success-foreground", message ? "mt-3" : "sr-only")}>{message}</p>
        {equipmentError != null && <Alert className="mt-3" variant={isHubUnavailable(equipmentError) ? "info" : "destructive"}>{hubErrorMessage(equipmentError, "Chưa cập nhật được trang bị. Bạn thử lại nhé.")}</Alert>}

        {tabs.map((tab) => (
          <section key={tab} role="tabpanel" hidden={tab !== activeTab} id={`${id}-panel-${tab}`} aria-labelledby={`${id}-${tab}`} tabIndex={0} className="mt-4 rounded-card">
            {tab === activeTab && (
              activeQuery.error && (!activeQuery.data || isHubUnavailable(activeQuery.error)) ? (
                <HubLoadError error={activeQuery.error} title={tab === "mine" ? "Chưa tải được kho của bạn" : "Chưa tải được vật phẩm"} message="Bạn thử tải lại nhé." onRetry={retry} isRetrying={activeQuery.isValidating} />
              ) : !activeQuery.data ? (
                <div role="status" aria-label="Đang tải vật phẩm" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                  {[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-56 rounded-card motion-reduce:animate-none" />)}
                </div>
              ) : (
                <>
                  {activeQuery.error && <div className="mb-4"><HubLoadError error={activeQuery.error} title="Chưa làm mới được danh sách" message="Bạn thử tải lại nhé." onRetry={retry} isRetrying={activeQuery.isValidating} /></div>}
                  {items.length === 0 ? <EmptyState icon={<PackageOpen animated={false} />} title={tab === "mine" ? "Kho đồ đang trống" : "Ngăn này chưa có vật phẩm"}
                    description={tab === "mine" ? "Đổi một món bằng Coin hoặc nhận quà khi lên cấp để bắt đầu bộ sưu tập." : undefined}
                    action={tab === "mine" && <Button className="min-h-11" onClick={() => { selectTab(tabs[0]); tabRefs.current[0]?.focus(); }}>Xem khung avatar</Button>} />
                    : <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                      {items.map((item) => <li key={item.id} className="min-w-0">
                        <ItemCard item={item} name={name} avatar={user?.avatar} balance={balance} equipment={equipment} previewing={preview?.id === item.id}
                            pending={actions.pending || Boolean(activeQuery.error)}
                            onPreview={(trigger) => {
                              if (preview?.id === item.id) setPreview(undefined);
                              else {
                                previewTrigger.current = trigger;
                                setPreview(item);
                                previewRef.current?.focus();
                              }
                            }}
                            onPurchase={(trigger) => startPurchase(item, trigger)}
                            onEquip={(itemId) => void equip(item, itemId)} />
                      </li>)}
                    </ul>}
                </>
              )
            )}
          </section>
        ))}
      </div>

      {confirm && createPortal(
        <div className="relative z-[70]">
          <Modal open onClose={closeConfirmation} hideCloseButton closeOnOverlayClick={false}
            title="Đổi vật phẩm" size="sm"
            footer={<>
              <Button variant="outline" onClick={closeConfirmation} className="min-h-11">Đóng</Button>
              <Button isLoading={actions.pending} loadingText="Đang đổi…" disabled={isHubUnavailable(confirmError)}
                onClick={() => void purchase()} className="min-h-11">{confirmError ? "Thử lại" : "Xác nhận đổi"}</Button>
            </>}>
            <p>Bạn muốn dùng <strong>{formatCoin(confirm.item.price ?? 0)}</strong> để đổi <strong className="wrap-anywhere">{coinCopy(confirm.item.name)}</strong>?</p>
            {confirmError != null && <Alert className="mt-4" variant={isHubUnavailable(confirmError) ? "info" : "destructive"}>
              {hubErrorMessage(confirmError, "Chưa đổi được vật phẩm. Bạn thử lại nhé.")}
            </Alert>}
          </Modal>
        </div>,
        document.body,
      )}
    </main>
  );
}
