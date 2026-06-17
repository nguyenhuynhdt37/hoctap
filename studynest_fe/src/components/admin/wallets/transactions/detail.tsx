import { formatDate } from "@/lib/utils/helpers/date";
import { getGoogleDriveImageUrl } from "@/lib/utils/helpers/image";
import type { PlatformWalletHistoryDetail } from "@/types/admin/platform-wallet";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export default function WalletTxnDetail({
  data,
}: {
  data: PlatformWalletHistoryDetail;
}) {
  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
              Chi tiết giao dịch ví nội bộ
            </h1>
            <p className="text-gray-600 mt-1">
              Mã log: <span className="font-mono">{data.log.id}</span>
            </p>
          </div>
          <a
            href="/admin/wallets/transactions"
            className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
          >
            Quay lại
          </a>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Số tiền</div>
          <div className="text-2xl font-bold text-gray-900">
            {currency.format(Math.round(data.log.amount))}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Loại: <span className="font-semibold">{data.log.type}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Trạng thái</div>
          <div
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
              data.transaction.status === "completed"
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {data.transaction.status}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Hướng:{" "}
            <span className="font-semibold">{data.transaction.direction}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Thời gian</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatDate(data.log.created_at)}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Xác nhận:{" "}
            <span className="font-semibold">
              {data.transaction.confirmed_at
                ? formatDate(data.transaction.confirmed_at)
                : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Transaction, User */}
        <div className="space-y-4 lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Giao dịch liên quan
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-600">Mã giao dịch</div>
                <div className="font-mono text-gray-900 break-all">
                  {data.transaction.id}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Số tiền</div>
                <div className="font-semibold text-gray-900">
                  {currency.format(Math.round(data.transaction.amount))}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Phương thức</div>
                <div className="text-gray-900">{data.transaction.method}</div>
              </div>
              <div>
                <div className="text-gray-600">Cổng</div>
                <div className="text-gray-900">{data.transaction.gateway}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-gray-600">Mô tả</div>
                <div className="text-gray-900">
                  {data.transaction.description || "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Người dùng
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="md:col-span-2">
                <div className="text-gray-600">Họ tên</div>
                <div className="text-gray-900">{data.user.fullname}</div>
                <div className="text-gray-600 mt-2">Email</div>
                <div className="text-gray-900 break-all">{data.user.email}</div>
              </div>
              <div>
                <div className="text-gray-600">Ngày tạo</div>
                <div className="text-gray-900">
                  {formatDate(data.user.created_at)}
                </div>
              </div>
            </div>
          </div>

          {data.courses.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Khóa học
              </h2>
              <div className="space-y-3">
                {data.courses.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="w-16 h-10 bg-gray-100 rounded overflow-hidden">
                      {c.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getGoogleDriveImageUrl(c.thumbnail_url)}
                          alt={c.title}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {c.title}
                      </div>
                      <div className="text-sm text-gray-600">
                        Giá gốc: {currency.format(Math.round(c.base_price))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.purchase_items.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Hạng mục mua
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left">Khóa học</th>
                      <th className="px-4 py-2 text-right">Giá gốc</th>
                      <th className="px-4 py-2 text-right">Giảm</th>
                      <th className="px-4 py-2 text-right">Thanh toán</th>
                      <th className="px-4 py-2 text-left">Mã giảm</th>
                      <th className="px-4 py-2 text-left">Trạng thái</th>
                      <th className="px-4 py-2 text-left">Ngày</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.purchase_items.map((p) => {
                      const course = data.courses.find(
                        (c) => c.id === p.course_id
                      );
                      const dh = (data.discount_history || []).find(
                        (d) => d.purchase_item_id === p.id
                      );
                      return (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <div className="text-gray-900">
                              {course?.title || p.course_id}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right">
                            {currency.format(Math.round(p.original_price))}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {currency.format(Math.round(p.discount_amount))}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {currency.format(Math.round(p.discounted_price))}
                          </td>
                          <td className="px-4 py-2">
                            {p.discount_id ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {data.discount?.discount_code || p.discount_id}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {formatDate(p.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {data.discount && (
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Mã giảm giá áp dụng
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-gray-600">Tên</div>
                  <div className="text-gray-900">{data.discount.name}</div>
                </div>
                <div>
                  <div className="text-gray-600">Mã</div>
                  <div className="font-mono text-gray-900">
                    {data.discount.discount_code}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Phạm vi</div>
                  <div className="text-gray-900">
                    {data.discount.applies_to}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Loại giảm</div>
                  <div className="text-gray-900">
                    {data.discount.discount_type}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">% giảm</div>
                  <div className="text-gray-900">
                    {data.discount.percent_value}%
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Giảm cố định</div>
                  <div className="text-gray-900">
                    {currency.format(
                      Math.round(data.discount.fixed_value || 0)
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Số lần dùng</div>
                  <div className="text-gray-900">
                    {data.discount.usage_count}
                    {data.discount.usage_limit
                      ? ` / ${data.discount.usage_limit}`
                      : ""}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Bắt đầu</div>
                  <div className="text-gray-900">
                    {formatDate(data.discount.start_at)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Kết thúc</div>
                  <div className="text-gray-900">
                    {formatDate(data.discount.end_at)}
                  </div>
                </div>
              </div>
            </div>
          )}
          {(data.discount_history?.length || 0) > 0 && (
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Lịch sử giảm giá
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left">Mục mua</th>
                      <th className="px-4 py-2 text-left">Mã giảm</th>
                      <th className="px-4 py-2 text-right">Số tiền giảm</th>
                      <th className="px-4 py-2 text-left">Ngày</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.discount_history!.map((h) => (
                      <tr key={h.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <span className="font-mono">
                            {h.purchase_item_id}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {data.discount?.discount_code || h.discount_id}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          {currency.format(Math.round(h.discounted_amount))}
                        </td>
                        <td className="px-4 py-2">
                          {formatDate(h.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right: Wallet + Earnings + Log */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Ví nền tảng
            </h2>
            <div className="text-sm grid grid-cols-2 gap-3">
              <div>
                <div className="text-gray-600">Số dư</div>
                <div className="font-semibold text-gray-900">
                  {currency.format(Math.round(data.wallet.balance))}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Đang giữ</div>
                <div className="font-semibold text-gray-900">
                  {currency.format(Math.round(data.wallet.holding_amount))}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Tổng vào</div>
                <div className="font-semibold text-gray-900">
                  {currency.format(Math.round(data.wallet.total_in))}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Tổng phí nền tảng</div>
                <div className="font-semibold text-gray-900">
                  {currency.format(Math.round(data.wallet.platform_fee_total))}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-gray-600">Cập nhật</div>
                <div className="text-gray-900">
                  {formatDate(data.wallet.updated_at)}
                </div>
              </div>
            </div>
          </div>

          {data.instructor_earnings.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Doanh thu giảng viên
              </h2>
              <div className="space-y-3">
                {data.instructor_earnings.map((e) => (
                  <div
                    key={e.id}
                    className="border border-gray-200 rounded-lg p-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-gray-600">Giảng viên</div>
                      <div className="font-mono text-gray-900">
                        {e.instructor_id}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div>
                        <div className="text-gray-600">Giảng viên nhận</div>
                        <div className="font-semibold text-gray-900">
                          {currency.format(Math.round(e.amount_instructor))}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Nền tảng nhận</div>
                        <div className="font-semibold text-gray-900">
                          {currency.format(Math.round(e.amount_platform))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      Trạng thái:{" "}
                      <span className="font-semibold text-gray-900">
                        {e.status}
                      </span>
                      {e.hold_until && (
                        <>
                          {" "}
                          • Giữ đến:{" "}
                          <span className="font-semibold text-gray-900">
                            {formatDate(e.hold_until)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Log ví</h2>
            <div className="text-sm grid grid-cols-1 gap-2">
              <div>
                <div className="text-gray-600">Ghi chú</div>
                <div className="text-gray-900">{data.log.note || "—"}</div>
              </div>
              <div>
                <div className="text-gray-600">Liên quan giao dịch</div>
                <div className="font-mono text-gray-900 break-all">
                  {data.log.related_transaction_id || "—"}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Tạo lúc</div>
                <div className="text-gray-900">
                  {formatDate(data.log.created_at)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
