const SkeletonCard = () => (
  <div className="bg-white border border-green-100 rounded-xl overflow-hidden shadow-sm animate-pulse">
    <div className="w-full h-40 bg-gradient-to-r from-green-100 via-emerald-100 to-teal-100" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded w-3/4" />
      <div className="h-3 bg-gradient-to-r from-emerald-100 to-teal-100 rounded w-1/2" />
      <div className="flex items-center space-x-2">
        <div className="h-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded w-10" />
        <div className="h-3 bg-gradient-to-r from-emerald-100 to-teal-100 rounded w-16" />
      </div>
      <div className="h-5 bg-gradient-to-r from-green-100 via-emerald-100 to-teal-100 rounded w-24" />
    </div>
  </div>
);

export default SkeletonCard;
