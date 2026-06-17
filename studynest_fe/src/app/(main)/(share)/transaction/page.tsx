"use client";

import Failed from "@/components/shared/transaction/failed";
import Success from "@/components/shared/transaction/success";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const Transaction = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get("status");
  const orderId = searchParams.get("order_id");
  const [redirectUrl, setRedirectUrl] = useState("/");

  // Lấy redirect URL từ query params, bao gồm cả query params trong redirect
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Lấy toàn bộ query string
    const queryString = window.location.search;

    // Tìm vị trí của redirect=
    const redirectIndex = queryString.indexOf("redirect=");

    if (redirectIndex !== -1) {
      // Lấy phần sau redirect= (có thể chứa query params)
      const redirectValue = queryString.substring(redirectIndex + 9); // 9 = length of "redirect="

      // Tách các params khác (status, order_id) nếu có
      // Tìm vị trí của &status hoặc &order_id để cắt
      let endIndex = redirectValue.length;
      const statusIndex = redirectValue.indexOf("&status=");
      const orderIdIndex = redirectValue.indexOf("&order_id=");

      if (statusIndex !== -1) {
        endIndex = Math.min(endIndex, statusIndex);
      }
      if (orderIdIndex !== -1) {
        endIndex = Math.min(endIndex, orderIdIndex);
      }

      const redirectUrl = redirectValue.substring(0, endIndex);

      if (redirectUrl) {
        // Decode URL và đảm bảo bắt đầu với /
        const decoded = decodeURIComponent(redirectUrl);
        setRedirectUrl(decoded.startsWith("/") ? decoded : `/${decoded}`);
      }
    }
  }, []);

  useEffect(() => {
    if (!status) return;

    const timer = setTimeout(() => {
      router.push(redirectUrl);
    }, 3000);

    return () => clearTimeout(timer);
  }, [status, redirectUrl, router]);

  if (status === "success") {
    return <Success />;
  }

  if (status === "failed") {
    return <Failed />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Đang xử lý...</p>
      </div>
    </div>
  );
};

export default Transaction;
