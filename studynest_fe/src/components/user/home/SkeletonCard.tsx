const SkeletonCard = () => (
  <div className="bg-white border border-[#E7EEF7] rounded-[20px] overflow-hidden shadow-xs animate-pulse">
    <div className="w-full h-44 bg-[#E8F2FA]" />
    <div className="p-5 space-y-3">
      <div className="h-4 bg-[#E8F2FA] rounded-lg w-3/4" />
      <div className="h-3 bg-[#E8F2FA]/70 rounded-lg w-1/2" />
      <div className="flex items-center space-x-2 pt-1">
        <div className="h-6 w-6 bg-[#E8F2FA] rounded-full" />
        <div className="h-3 bg-[#E8F2FA]/70 rounded-lg w-24" />
      </div>
      <div className="pt-2 border-t border-[#E7EEF7]">
        <div className="h-5 bg-[#E8F2FA] rounded-lg w-24" />
      </div>
    </div>
  </div>
);

export default SkeletonCard;
