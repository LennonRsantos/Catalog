import { Star } from "lucide-react";

interface StarRatingProps {
  // Points on a 0-10 scale. Rendered as at most 5 stars — each star is worth
  // 2 points, each half-star worth 1 (e.g. 9 -> 4 full stars + 1 half).
  value: number;
  onChange?: (value: number) => void;
  size?: number;
}

const STAR_SLOTS = [0, 1, 2, 3, 4];

export function StarRating({ value, onChange, size = 18 }: StarRatingProps) {
  const interactive = Boolean(onChange);

  function pick(points: number) {
    onChange?.(points === value ? 0 : points);
  }

  return (
    <div className="flex items-center gap-0.5">
      {STAR_SLOTS.map((i) => {
        const halfPoints = i * 2 + 1;
        const fullPoints = i * 2 + 2;
        const fillFraction = Math.max(0, Math.min(1, (value - i * 2) / 2));

        return (
          <div key={i} className="relative shrink-0" style={{ width: size, height: size }}>
            <Star size={size} className="text-stone-700" strokeWidth={1.5} />

            {fillFraction > 0 && (
              <div
                className="pointer-events-none absolute inset-0 overflow-hidden"
                style={{ width: `${fillFraction * 100}%` }}
              >
                <Star size={size} className="fill-[#d9a441] text-[#d9a441]" strokeWidth={1.5} />
              </div>
            )}

            {interactive && (
              <>
                <button
                  type="button"
                  onClick={() => pick(halfPoints)}
                  className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
                  aria-label={`${halfPoints} de 10`}
                />
                <button
                  type="button"
                  onClick={() => pick(fullPoints)}
                  className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
                  aria-label={`${fullPoints} de 10`}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
