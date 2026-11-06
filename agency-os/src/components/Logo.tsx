export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className="pixel" aria-hidden>
      <polygon points="8,1 15,15 11,15 8,8 5,15 1,15" fill="#f97316" />
      <rect x="7" y="11" width="2" height="1" fill="#fb923c" />
    </svg>
  );
}
