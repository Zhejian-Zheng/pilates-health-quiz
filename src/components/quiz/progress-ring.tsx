export function ProgressRing({ value }: { value: number }) {
  const degrees = Math.round((value / 100) * 360);

  return (
    <div
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full shadow-sm shadow-black/10 transition-all duration-700"
      style={{
        background: `conic-gradient(#171717 ${degrees}deg, rgba(23,23,23,0.09) 0deg)`,
      }}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f7f4ef] text-xs font-bold">
        {value}%
      </div>
    </div>
  );
}
