export function ProgressRing({ value }: { value: number }) {
  const degrees = Math.round((value / 100) * 360);

  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-sm shadow-black/10 transition-all duration-700"
      style={{
        background: `conic-gradient(#171717 ${degrees}deg, rgba(23,23,23,0.09) 0deg)`,
      }}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7f4ef] text-[11px] font-bold">
        {value}%
      </div>
    </div>
  );
}
