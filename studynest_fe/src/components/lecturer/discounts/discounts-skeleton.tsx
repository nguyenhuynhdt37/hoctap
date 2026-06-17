"use client";

export function DiscountsSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-green-50 to-emerald-50">
            <tr>
              {Array.from({ length: 8 }).map((_, index) => (
                <th key={index} className="px-6 py-4 text-left">
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50/50">
                {Array.from({ length: 8 }).map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

