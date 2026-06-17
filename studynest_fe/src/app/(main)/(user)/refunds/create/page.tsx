import CreateRefundPage from "@/components/user/refunds/create";
import { Suspense } from "react";

function CreateRefundPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-12 w-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600">Đang tải...</p>
          </div>
        </div>
      }
    >
      <CreateRefundPage />
    </Suspense>
  );
}

export default CreateRefundPageWrapper;

