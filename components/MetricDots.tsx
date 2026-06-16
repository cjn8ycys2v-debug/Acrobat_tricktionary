import { ratingDots } from "@/lib/utils";

export function MetricDots({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-semibold text-graphite/70">{label}</span>
      <span className="flex gap-1" aria-label={`${label}: ${value}/5`}>
        {ratingDots(value).map((active, index) => (
          <span key={index} className={active ? "size-2 rounded-full bg-coral" : "size-2 rounded-full bg-ink/14"} />
        ))}
      </span>
    </div>
  );
}
