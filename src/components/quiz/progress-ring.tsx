export function ProgressRing({ value }: { value: number }) {
  const degrees = Math.round((value / 100) * 360);

  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-sm shadow-[#0f766e]/16 transition-all duration-700"
      style={{
        background: `conic-gradient(#0f766e ${degrees}deg, rgba(15,118,110,0.12) 0deg)`,
      }}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5fbf8] text-[11px] font-bold text-[#12312c]">
        {value}%
      </div>
    </div>
  );
}
