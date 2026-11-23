"use client";

import { Alert, Button, CoinBadge, EmptyState, Modal, Skeleton } from "@/components/ui";
import { hubErrorMessage, isHubUnavailable } from "@/lib/learning-hub/errors";
import { getHubDataSource } from "@/lib/learning-hub/data-source";
import { useCoinBalances, useShopActions, useShopInventory, useShopItems } from "@/lib/learning-hub/shop-hooks";
import {
  coinCopy, createPurchaseConfirmation, emptyEquipment, itemKindLabels, itemKinds, shopItemState,
} from "@/lib/learning-hub/shop-logic";
import type { Equipment, ItemKind, Rarity, ShopItem } from "@/lib/learning-hub/shop-types";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/stores/user";
import { ArrowRight, Check, Cloud, Coins, Eye, PackageOpen, RotateCcw, Store } from "pulsoicon-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { HubLoadError } from "../hub-page-state";
import { BuyCoinDialog } from "./buy-coin-dialog";
import { ExchangeWhiteDialog } from "./exchange-white-dialog";
import { MockDataChip } from "../mock-data-chip";
import { EmblemIcon, EquippedMarks, FramedAvatar, RarityBadge, TitleBadge } from "./item-art";

type ShopTab = ItemKind | "mine";
type RarityFilter = "all" | Rarity;

const tabs: readonly ShopTab[] = [...itemKinds, "mine"];
const labels = { ...itemKindLabels, mine: "Của tôi" };
const tabIndex = (tab: string | null) => tabs.findIndex((entry) => entry === tab);

const rarityFilters: ReadonlyArray<{ value: RarityFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "common", label: "Phổ thông" },
  { value: "rare", label: "Hiếm" },
  { value: "epic", label: "Sử thi" },
  { value: "legendary", label: "Huyền thoại" },
];

const stageTones: Record<Rarity, string> = {
  common: "bg-[radial-gradient(circle_at_50%_35%,#FFFFFF_0%,#E8F3FC_68%,#D6E9FA_100%)]",
  rare: "bg-[radial-gradient(circle_at_50%_35%,#FFF9FC_0%,#FCE4EF_68%,#F7CFE2_100%)]",
  epic: "bg-[radial-gradient(circle_at_50%_30%,#3F2A70_0%,#241645_72%,#170E2E_100%)]",
  legendary: "bg-[radial-gradient(circle_at_50%_30%,#5C3B10_0%,#2F1D08_72%,#1A1004_100%)]",
};

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
    <aside
      aria-labelledby="shop-preview"
      className="relative isolate flex min-w-0 flex-col justify-between overflow-hidden rounded-[2rem] border border-[#BFD7ED]/35 bg-gradient-to-br from-[#13263A] via-[#1E3E62] to-[#2B598A] p-6 text-white shadow-lg"
    >
      {/* Spotlight glow */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 -z-10 size-44 rounded-full bg-[#F5C542]/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-10 -z-10 size-44 rounded-full bg-[#C8B0F7]/20 blur-3xl" />

      <div className="flex items-center justify-between gap-2">
        <h2
          id="shop-preview"
          ref={previewRef}
          tabIndex={-1}
          className="scroll-mt-24 text-xs font-bold uppercase tracking-[0.16em] text-[#FFE89E]"
        >
          Gương thử đồ · Spotlight
        </h2>
        {active && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/20 cursor-pointer"
          >
            <RotateCcw aria-hidden="true" className="size-3" />
            <span>Bỏ thử</span>
          </button>
        )}
      </div>

      <div className="mt-5 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <div className="relative flex shrink-0 items-center justify-center rounded-full bg-white/8 p-1.5 ring-1 ring-white/15">
          <FramedAvatar equipment={equipment} src={avatar} name={name} className="size-24 text-xl sm:size-28" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-lg font-bold tracking-tight text-white wrap-anywhere">{name}</p>
          <EquippedMarks equipment={equipment} className="justify-center sm:justify-start" />
          <p role="status" className="text-xs text-white/75 wrap-anywhere">
            {active ? `Đang xem thử: ${coinCopy(active.name)}` : status}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-white/15 pt-3 text-[11px] text-white/70">
        <span>Hiệu ứng hiển thị trực tiếp trên hồ sơ của bạn</span>
        {active && <RarityBadge rarity={active.rarity} />}
      </div>
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
  const darkStage = item.rarity === "epic" || item.rarity === "legendary";

  return (
    <article
      aria-labelledby={id}
      className={cn(
        "group relative flex h-full min-w-0 flex-col overflow-hidden rounded-[24px] border bg-surface transition-all duration-200 hover:-translate-y-1 hover:shadow-ambient-md",
        state.kind === "equipped"
          ? "border-primary ring-2 ring-primary/20"
          : previewing
            ? "border-[#C47E0A] ring-2 ring-[#E2B545]/35"
            : "border-border hover:border-primary-pastel",
      )}
    >
      {/* Sân khấu trưng bày sản phẩm */}
      <div className={cn("relative isolate grid h-36 place-items-center overflow-hidden border-b border-border/70 px-3 sm:h-44", stageTones[item.rarity])}>
        <div className="pointer-events-none absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between gap-2">
          <RarityBadge rarity={item.rarity} />
          {state.kind === "equipped" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-primary-foreground shadow-2xs">
              <Check aria-hidden="true" animated={false} className="size-3" />
              <span>Đang dùng</span>
            </span>
          )}
        </div>

        {!darkStage && (
          <Cloud animated={false} aria-hidden="true" strokeWidth={0.9} className="pointer-events-none absolute -left-6 -bottom-12 -z-10 size-36 -rotate-12 text-white/75" />
        )}
        {darkStage && (
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-8 bottom-3 -z-10 h-6 rounded-full blur-xl",
              item.rarity === "legendary" ? "bg-[#F5C542]/45" : "bg-[#C8B0F7]/45",
            )}
          />
        )}

        <div className="mt-5 transition-transform duration-200 group-hover:scale-105">
          {item.kind === "avatar_frame" && (
            <FramedAvatar src={avatar} name={name} equipment={{ avatar_frame: item }} className="size-24 text-xl sm:size-28" />
          )}
          {item.kind === "title" && (
            <TitleBadge item={item} className="mx-1 px-3.5 py-1.5 text-sm" />
          )}
          {item.kind === "emblem" && (
            <EmblemIcon item={item} decorative className="size-20 sm:size-24" />
          )}
        </div>
      </div>

      {/* Thông tin & hành động */}
      <div className="flex flex-1 flex-col gap-2.5 p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 id={id} className="text-sm leading-snug font-bold text-foreground wrap-anywhere sm:text-base">
            {coinCopy(item.name)}
          </h3>
          {item.price !== null && (
            <CoinBadge kind="white" amount={item.price} size="sm" className="shrink-0" />
          )}
        </div>

        {item.description && item.description !== item.name && (
          <p className="text-xs leading-relaxed text-muted-foreground wrap-anywhere">
            {coinCopy(item.description)}
          </p>
        )}

        {state.kind !== "available" && state.kind !== "equipped" && (
          <div className="text-xs leading-relaxed">
            <p className="font-semibold text-muted-foreground">{state.label}</p>
            {"reason" in state && state.reason && (
              <p className="mt-0.5 text-muted-foreground wrap-anywhere">{state.reason}</p>
            )}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={previewing}
            aria-label={`Xem thử ${coinCopy(item.name)}`}
            className={cn("min-h-10 rounded-xl px-2.5 text-primary-hover", previewing && "bg-primary-light")}
            onClick={(event) => onPreview(event.currentTarget)}
            leftIcon={<Eye className="size-4" />}
          >
            Thử
          </Button>
          {state.kind === "available" && (
            <Button
              size="sm"
              className="min-h-10 flex-1 rounded-xl px-3"
              disabled={pending}
              onClick={(event) => onPurchase(event.currentTarget)}
            >
              Đổi ngay
            </Button>
          )}
          {(state.kind === "owned" || state.kind === "equipped") && (
            <Button
              size="sm"
              variant={state.kind === "owned" ? "pastel" : "outline"}
              className="min-h-10 flex-1 rounded-xl px-3"
              aria-disabled={pending || undefined}
              onClick={() => {
                if (!pending) onEquip(state.kind === "owned" ? item.id : null);
              }}
            >
              {state.kind === "owned" ? "Trang bị" : "Gỡ ra"}
            </Button>
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
  const coins = useCoinBalances();
  const [buying, setBuying] = useState(false);
  const [exchanging, setExchanging] = useState(false);
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("all");
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
  const rawItems = activeQuery.data?.items ?? [];

  const items = useMemo(
    () => (rarityFilter === "all" ? rawItems : rawItems.filter((entry) => entry.rarity === rarityFilter)),
    [rawItems, rarityFilter],
  );

  function selectTab(tab: ShopTab) {
    const url = new URL(window.location.href);
    if (tab === tabs[0]) url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url);
    setEquipmentError(undefined);
    setRarityFilter("all");
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
        {/* HERO ATELIER BOUTIQUE + SPOTLIGHT MIRROR */}
        <header className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-stretch">
          <div className="relative isolate flex flex-col justify-between overflow-hidden rounded-[2rem] border border-primary-pastel bg-gradient-to-br from-surface via-primary-light/60 to-accent/35 px-6 py-6 shadow-ambient-sm sm:px-9 sm:py-8">
            <Cloud aria-hidden="true" strokeWidth={0.65} className="pointer-events-none absolute -right-8 -bottom-16 -z-10 size-60 -rotate-12 text-surface sm:size-72" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-pastel bg-surface/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                  <Store aria-hidden="true" animated={false} className="size-3.5" />
                  <span>Atelier Mây</span>
                </span>
                <MockDataChip source={getHubDataSource()} />
              </div>

              <h1 className="type-display mt-3 max-w-2xl">Cửa hàng Mây</h1>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                Sưu tầm khung avatar, danh hiệu và huy hiệu độc bản để tạo dấu ấn riêng trên hành trình học tập.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                {coins.data ? (
                  <CoinBadge kind="gold" amount={coins.data.paid} size="lg" />
                ) : coins.error ? (
                  <CoinBadge kind="gold" amount="—" size="lg" />
                ) : (
                  <Skeleton className="h-10 w-24 rounded-full motion-reduce:animate-none" />
                )}

                {balance !== undefined ? (
                  <CoinBadge kind="white" amount={balance} size="lg" />
                ) : inventory.error && (catalog.error || activeTab === "mine") ? (
                  <CoinBadge kind="white" amount="—" size="lg" />
                ) : (
                  <div role="status">
                    <span className="sr-only">Đang tải số dư</span>
                    <Skeleton className="h-10 w-24 rounded-full bg-surface/80 motion-reduce:animate-none" />
                  </div>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setExchanging(true)}
                  disabled={!coins.data}
                  className="min-h-10 gap-1.5 rounded-full border-[#CBD5E1] bg-surface px-4 hover:border-primary-pastel"
                >
                  <span>Đổi</span>
                  <Coins aria-hidden="true" animated={false} className="size-4 text-[#64748B]" />
                </Button>
                <Button size="sm" onClick={() => setBuying(true)} disabled={!coins.data} className="min-h-10 rounded-full px-4">
                  Nạp thêm
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  <span>Quy đổi tại cửa hàng:</span>
                  <CoinBadge kind="gold" amount={1} size="sm" />
                  <ArrowRight aria-hidden="true" animated={false} className="size-3" />
                  <CoinBadge kind="white" amount={5} size="sm" />
                </span>
                <Link href="/levels" className="font-semibold text-primary-hover underline underline-offset-4">
                  Xem thưởng theo cấp
                </Link>
              </div>
            </div>
          </div>

          <Preview
            equipment={previewEquipment}
            active={preview}
            name={name}
            avatar={user?.avatar}
            status={previewStatus}
            previewRef={previewRef}
            onReset={() => {
              setPreview(undefined);
              if (previewTrigger.current?.isConnected) previewTrigger.current.focus();
              else previewRef.current?.focus({ preventScroll: true });
            }}
          />
        </header>

        {/* THANH TAB + BỘ LỌC ĐỘ HIẾM NHANH */}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div role="tablist" aria-label="Ngăn cửa hàng" className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-surface p-1.5 shadow-2xs sm:flex sm:w-fit sm:flex-wrap">
            {tabs.map((tab, index) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={tab === activeTab}
                id={`${id}-${tab}`}
                aria-controls={`${id}-panel-${tab}`}
                ref={(element) => { tabRefs.current[index] = element; }}
                tabIndex={tab === activeTab ? 0 : -1}
                onClick={() => selectTab(tab)}
                onKeyDown={(event) => moveTab(event, index)}
                className="min-h-10 rounded-xl px-3 text-sm font-semibold transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-ring aria-selected:bg-primary aria-selected:text-primary-foreground sm:px-4 cursor-pointer"
              >
                {labels[tab]}
              </button>
            ))}
          </div>

          <div role="group" aria-label="Lọc theo độ hiếm" className="flex flex-wrap items-center gap-1.5">
            {rarityFilters.map((filter) => {
              const active = rarityFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setRarityFilter(filter.value)}
                  className={cn(
                    "min-h-9 rounded-full border px-3 text-xs font-semibold transition-all cursor-pointer",
                    active
                      ? "border-primary bg-primary-light text-primary shadow-2xs"
                      : "border-border bg-surface text-muted-foreground hover:border-primary-pastel hover:text-foreground",
                  )}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        <p role="status" className={cn("text-sm font-semibold text-success-foreground", message ? "mt-3" : "sr-only")}>{message}</p>
        {equipmentError != null && (
          <Alert className="mt-3" variant={isHubUnavailable(equipmentError) ? "info" : "destructive"}>
            {hubErrorMessage(equipmentError, "Chưa cập nhật được trang bị. Bạn thử lại nhé.")}
          </Alert>
        )}

        {tabs.map((tab) => (
          <section key={tab} id={`${id}-panel-${tab}`} role="tabpanel" aria-labelledby={`${id}-${tab}`} hidden={tab !== activeTab} className="mt-6">
            {tab === activeTab && (
              activeQuery.isLoading && !activeQuery.data ? (
                <div role="status" aria-label="Đang tải vật phẩm" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
                  {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-72 rounded-[24px] motion-reduce:animate-none" />)}
                </div>
              ) : activeQuery.error && !activeQuery.data ? (
                <HubLoadError error={activeQuery.error} message="Chưa tải được gian hàng lúc này." onRetry={retry} />
              ) : (
                <>
                  {activeQuery.error != null && (
                    <Alert className="mb-4" variant={isHubUnavailable(activeQuery.error) ? "info" : "destructive"}>
                      {hubErrorMessage(activeQuery.error, "Đang hiển thị dữ liệu gần nhất.")}
                    </Alert>
                  )}
                  {items.length === 0 ? (
                    <EmptyState
                      icon={<PackageOpen className="size-8" />}
                      title={
                        rarityFilter !== "all"
                          ? "Không có vật phẩm thuộc độ hiếm này"
                          : tab === "mine"
                            ? "Bạn chưa có vật phẩm nào"
                            : "Gian hàng này chưa có vật phẩm"
                      }
                      description={
                        rarityFilter !== "all"
                          ? "Thử chọn lại 'Tất cả' để xem đầy đủ gian hàng."
                          : tab === "mine"
                            ? "Đổi vật phẩm bằng đồng trắng hoặc nhận quà khi lên cấp."
                            : "Quay lại sau hoặc chuyển sang gian hàng khác nhé."
                      }
                      action={
                        rarityFilter !== "all" ? (
                          <Button className="min-h-11" onClick={() => setRarityFilter("all")}>Xem tất cả</Button>
                        ) : tab === "mine" ? (
                          <Button className="min-h-11" onClick={() => { selectTab(tabs[0]); tabRefs.current[0]?.focus(); }}>
                            Xem khung avatar
                          </Button>
                        ) : undefined
                      }
                    />
                  ) : (
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
                      {items.map((item) => (
                        <li key={item.id} className="min-w-0">
                          <ItemCard
                            item={item}
                            name={name}
                            avatar={user?.avatar}
                            balance={balance}
                            equipment={equipment}
                            previewing={preview?.id === item.id}
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
                            onEquip={(itemId) => void equip(item, itemId)}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )
            )}
          </section>
        ))}
      </div>

      {coins.data && <BuyCoinDialog open={buying} rateVnd={coins.data.rateVnd} onClose={() => setBuying(false)} />}
      {coins.data && (
        <ExchangeWhiteDialog
          open={exchanging}
          paidBalance={coins.data.paid}
          whiteBalance={balance ?? coins.data.bonus}
          onClose={() => setExchanging(false)}
          onSuccess={(result) => {
            setMessage(`Đã đổi thành công +${new Intl.NumberFormat("vi-VN").format(result.white_gained)} vào số dư.`);
            void Promise.allSettled([
              coins.mutate(),
              inventory.mutate(),
              catalog.mutate(),
            ]);
          }}
        />
      )}

      {confirm && createPortal(
        <div className="relative z-[70]">
          <Modal
            open
            onClose={closeConfirmation}
            hideCloseButton
            closeOnOverlayClick={false}
            title="Đổi vật phẩm"
            size="sm"
            footer={
              <>
                <Button variant="outline" onClick={closeConfirmation} className="min-h-11">Đóng</Button>
                <Button
                  isLoading={actions.pending}
                  loadingText="Đang đổi…"
                  disabled={isHubUnavailable(confirmError)}
                  onClick={() => void purchase()}
                  className="min-h-11"
                >
                  {confirmError ? "Thử lại" : "Xác nhận đổi"}
                </Button>
              </>
            }
          >
            <p className="flex flex-wrap items-center gap-1.5 text-sm">
              <span>Bạn muốn dùng</span>
              <CoinBadge kind="white" amount={confirm.item.price ?? 0} size="sm" />
              <span>để đổi</span>
              <strong className="wrap-anywhere">{coinCopy(confirm.item.name)}</strong>?
            </p>
            {confirmError != null && (
              <Alert className="mt-4" variant={isHubUnavailable(confirmError) ? "info" : "destructive"}>
                {hubErrorMessage(confirmError, "Chưa đổi được vật phẩm. Bạn thử lại nhé.")}
              </Alert>
            )}
          </Modal>
        </div>,
        document.body,
      )}
    </main>
  );
}
