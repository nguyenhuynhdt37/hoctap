"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type UrlStringField<T extends string = string> = {
  type: "string";
  default: T;
  allowed?: readonly T[];
  trim?: boolean;
};

export type UrlNumberField = {
  type: "number";
  default: number;
  min?: number;
  max?: number;
  int?: boolean;
};

export type UrlBooleanField = {
  type: "boolean";
  default: boolean;
};

export type UrlQueryField =
  | UrlStringField<any>
  | UrlNumberField
  | UrlBooleanField;

export type UrlQuerySchema = Record<string, UrlQueryField>;

export type InferUrlQueryField<F extends UrlQueryField> =
  F extends { type: "string"; allowed: readonly (infer A extends string)[] }
    ? A
    : F extends { type: "string" }
      ? string
      : F extends { type: "number" }
        ? number
        : F extends { type: "boolean" }
          ? boolean
          : never;

export type InferUrlQueryState<S extends UrlQuerySchema> = {
  [K in keyof S]: InferUrlQueryField<S[K]>;
};

export interface SetUrlQueryOptions {
  /**
   * Tự động đưa trang (pageKey) về mặc định khi thay đổi bộ lọc khác.
   * Mặc định: true nếu patch có chứa key khác pageKey và không tự truyền pageKey.
   */
  resetPage?: boolean;
  /** Cho phép override hành vi scroll khi router.replace */
  scroll?: boolean;
}

export interface UseUrlQueryStateOptions<S extends UrlQuerySchema> {
  /** Tên param phân trang trong schema (mặc định: "page") */
  pageKey?: keyof S & string;
  /** Giữ vị trí cuộn trang khi cập nhật URL (mặc định: false) */
  scroll?: boolean;
}

/**
 * Parse toàn bộ giá trị từ URLSearchParams theo schema, đảm bảo type-safe và fallback an toàn.
 */
export function parseUrlQueryState<S extends UrlQuerySchema>(
  searchParams: Pick<URLSearchParams, "get">,
  schema: S
): InferUrlQueryState<S> {
  const result = {} as InferUrlQueryState<S>;

  for (const key of Object.keys(schema) as Array<keyof S & string>) {
    const field = schema[key];
    const raw = searchParams.get(key);

    if (raw === null) {
      result[key] = field.default as InferUrlQueryField<S[typeof key]>;
      continue;
    }

    if (field.type === "string") {
      const normalized = field.trim ? raw.trim() : raw;
      if (field.allowed && field.allowed.length > 0) {
        result[key] = (
          field.allowed.includes(normalized) ? normalized : field.default
        ) as InferUrlQueryField<S[typeof key]>;
      } else {
        result[key] = normalized as InferUrlQueryField<S[typeof key]>;
      }
      continue;
    }

    if (field.type === "number") {
      if (raw.trim() === "") {
        result[key] = field.default as InferUrlQueryField<S[typeof key]>;
        continue;
      }
      const parsed = field.int === false ? Number(raw) : Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed)) {
        result[key] = field.default as InferUrlQueryField<S[typeof key]>;
        continue;
      }
      let clamped = parsed;
      if (typeof field.min === "number" && clamped < field.min) {
        clamped = field.min;
      }
      if (typeof field.max === "number" && clamped > field.max) {
        clamped = field.max;
      }
      result[key] = clamped as InferUrlQueryField<S[typeof key]>;
      continue;
    }

    if (field.type === "boolean") {
      const lowered = raw.trim().toLowerCase();
      if (lowered === "true" || lowered === "1") {
        result[key] = true as InferUrlQueryField<S[typeof key]>;
      } else if (lowered === "false" || lowered === "0") {
        result[key] = false as InferUrlQueryField<S[typeof key]>;
      } else {
        result[key] = field.default as InferUrlQueryField<S[typeof key]>;
      }
    }
  }

  return result;
}

/**
 * Xây dựng query string mới từ URLSearchParams hiện tại và bản vá (patch).
 * - Tự động xóa param khi bằng giá trị mặc định để URL gọn sạch.
 * - Bảo toàn 100% các query param ngoại lai không khai báo trong schema.
 * - Tự động reset pageKey về mặc định khi đổi các filter khác.
 */
export function buildNextUrlQuery<S extends UrlQuerySchema>(
  currentQueryString: string,
  schema: S,
  patch: Partial<InferUrlQueryState<S>>,
  options?: { resetPage?: boolean; pageKey?: keyof S & string }
): string {
  const params = new URLSearchParams(currentQueryString);
  const pageKey = (options?.pageKey ?? ("page" as keyof S & string)) as string;
  const patchKeys = Object.keys(patch) as Array<keyof S & string>;

  for (const key of patchKeys) {
    const field = schema[key];
    if (!field) continue;

    const nextVal = patch[key];
    if (nextVal === undefined || nextVal === null) {
      params.delete(key);
      continue;
    }

    if (field.type === "string") {
      const strVal = field.trim ? String(nextVal).trim() : String(nextVal);
      if (
        strVal === field.default ||
        (field.allowed && field.allowed.length > 0 && !field.allowed.includes(strVal))
      ) {
        params.delete(key);
      } else {
        params.set(key, strVal);
      }
      continue;
    }

    if (field.type === "number") {
      const numVal = Number(nextVal);
      if (!Number.isFinite(numVal)) {
        params.delete(key);
        continue;
      }
      let normalized = field.int === false ? numVal : Math.trunc(numVal);
      if (typeof field.min === "number" && normalized < field.min) {
        normalized = field.min;
      }
      if (typeof field.max === "number" && normalized > field.max) {
        normalized = field.max;
      }
      if (normalized === field.default) {
        params.delete(key);
      } else {
        params.set(key, String(normalized));
      }
      continue;
    }

    if (field.type === "boolean") {
      const boolVal = Boolean(nextVal);
      if (boolVal === field.default) {
        params.delete(key);
      } else {
        params.set(key, boolVal ? "true" : "false");
      }
    }
  }

  const hasNonPagePatch = patchKeys.some((k) => k !== pageKey);
  const patchIncludesPage = patchKeys.includes(pageKey as keyof S & string);
  const shouldResetPage =
    options?.resetPage !== undefined
      ? options.resetPage
      : hasNonPagePatch && !patchIncludesPage;

  if (shouldResetPage && Object.prototype.hasOwnProperty.call(schema, pageKey)) {
    params.delete(pageKey);
  }

  return params.toString();
}

/**
 * Xóa toàn bộ các key trong schema về mặc định, giữ nguyên các param ngoại lai.
 */
export function buildResetUrlQuery<S extends UrlQuerySchema>(
  currentQueryString: string,
  schema: S
): string {
  const params = new URLSearchParams(currentQueryString);
  for (const key of Object.keys(schema)) {
    params.delete(key);
  }
  return params.toString();
}

const URL_QUERY_SYNC_EVENT = "studynest:url-query-sync";

/**
 * Hook đồng bộ trạng thái bộ lọc & phân trang 2 chiều với URL query string (searchParams).
 */
export function useUrlQueryState<S extends UrlQuerySchema>(
  schema: S,
  options?: UseUrlQueryStateOptions<S>
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const nextSearchParamsStr = searchParams.toString();
  const [currentQuery, setCurrentQuery] = useState<string>(nextSearchParamsStr);

  const schemaRef = useRef(schema);
  schemaRef.current = schema;

  const queryRef = useRef(currentQuery);
  queryRef.current = currentQuery;

  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const defaultScroll = options?.scroll ?? false;
  const pageKey = (options?.pageKey ?? ("page" as keyof S & string)) as keyof S & string;

  // Đồng bộ khi Next.js router điều hướng (Link, router.push, v.v.)
  useEffect(() => {
    setCurrentQuery((prev) => {
      if (prev === nextSearchParamsStr) return prev;
      queryRef.current = nextSearchParamsStr;
      return nextSearchParamsStr;
    });
  }, [nextSearchParamsStr]);

  // Đồng bộ khi bấm Back/Forward (popstate) hoặc component khác cùng cập nhật URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncFromLocation = () => {
      const liveQuery = window.location.search.startsWith("?")
        ? window.location.search.slice(1)
        : window.location.search;
      if (liveQuery !== queryRef.current) {
        queryRef.current = liveQuery;
        setCurrentQuery(liveQuery);
      }
    };
    window.addEventListener("popstate", syncFromLocation);
    window.addEventListener(URL_QUERY_SYNC_EVENT, syncFromLocation);
    return () => {
      window.removeEventListener("popstate", syncFromLocation);
      window.removeEventListener(URL_QUERY_SYNC_EVENT, syncFromLocation);
    };
  }, []);

  const values = useMemo(
    () => parseUrlQueryState(new URLSearchParams(currentQuery), schemaRef.current),
    [currentQuery]
  );

  const commitQuery = useCallback(
    (nextQuery: string, scroll?: boolean) => {
      if (nextQuery === queryRef.current) return;
      queryRef.current = nextQuery;
      setCurrentQuery(nextQuery);
      const targetUrl = nextQuery
        ? `${pathnameRef.current}?${nextQuery}`
        : pathnameRef.current;
      // Dùng window.history.replaceState + local reactive state + custom sync event
      // để cập nhật URL và UI tức thì 0ms, không gửi request RSC thừa và không bao giờ remount form.
      if (typeof window !== "undefined") {
        window.history.replaceState(window.history.state, "", targetUrl);
        window.dispatchEvent(new Event(URL_QUERY_SYNC_EVENT));
        if (scroll ?? defaultScroll) {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        return;
      }
      router.replace(targetUrl, { scroll: scroll ?? defaultScroll });
    },
    [router, defaultScroll]
  );

  const setParams = useCallback(
    (patch: Partial<InferUrlQueryState<S>>, opts?: SetUrlQueryOptions) => {
      const nextQuery = buildNextUrlQuery(
        queryRef.current,
        schemaRef.current,
        patch,
        {
          resetPage: opts?.resetPage,
          pageKey,
        }
      );
      commitQuery(nextQuery, opts?.scroll);
    },
    [commitQuery, pageKey]
  );

  const setParam = useCallback(
    <K extends keyof S & string>(
      key: K,
      value: InferUrlQueryState<S>[K],
      opts?: SetUrlQueryOptions
    ) => {
      setParams({ [key]: value } as unknown as Partial<InferUrlQueryState<S>>, opts);
    },
    [setParams]
  );

  const resetParams = useCallback(
    (opts?: { scroll?: boolean }) => {
      const nextQuery = buildResetUrlQuery(queryRef.current, schemaRef.current);
      commitQuery(nextQuery, opts?.scroll);
    },
    [commitQuery]
  );

  return {
    values,
    setParam,
    setParams,
    resetParams,
    searchParams,
  };
}

/**
 * Hook hỗ trợ ô tìm kiếm nhập mượt ở local state và tự động debounce đồng bộ lên URL.
 * Đồng thời cập nhật lại ô input khi URL thay đổi từ bên ngoài (Back/Forward, Reset).
 */
export function useDebouncedUrlSearch(
  urlValue: string,
  onCommit: (value: string) => void,
  delayMs = 350
) {
  const [inputValue, setInputValue] = useState(urlValue);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  const lastUrlValueRef = useRef(urlValue);

  useEffect(() => {
    if (urlValue !== lastUrlValueRef.current) {
      lastUrlValueRef.current = urlValue;
      setInputValue(urlValue);
    }
  }, [urlValue]);

  useEffect(() => {
    if (inputValue === lastUrlValueRef.current) return;
    const timer = window.setTimeout(() => {
      lastUrlValueRef.current = inputValue;
      onCommitRef.current(inputValue);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [inputValue, delayMs]);

  const commitNow = useCallback((nextVal?: string) => {
    const val = nextVal !== undefined ? nextVal : inputValue;
    setInputValue(val);
    lastUrlValueRef.current = val;
    onCommitRef.current(val);
  }, [inputValue]);

  return {
    inputValue,
    setInputValue,
    commitNow,
  };
}
