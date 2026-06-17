export function RefundRequestsSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-green-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Thông tin
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Trạng thái
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Số tiền
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Ngày yêu cầu
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-green-100">
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="animate-pulse">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-14 bg-gray-200 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="h-6 bg-gray-200 rounded-full w-24" />
                </td>
                <td className="px-4 py-4">
                  <div className="h-5 bg-gray-200 rounded w-32" />
                </td>
                <td className="px-4 py-4">
                  <div className="h-4 bg-gray-200 rounded w-28" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

