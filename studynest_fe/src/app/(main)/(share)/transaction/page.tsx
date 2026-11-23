"use client";

import Failed from "@/components/shared/transaction/failed";
import Success from "@/components/shared/transaction/success";
import { sanitizeRedirect } from "@/lib/auth/safe-redirect";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const Transaction = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get("status");
  const redirectUrl = sanitizeRedirect(searchParams.get("redirect"));

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
