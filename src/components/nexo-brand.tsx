import Image from "next/image";
import Link from "next/link";

export function NexoBrand({
  href = "/",
  compact = false,
  inverse = false,
}: {
  href?: string;
  compact?: boolean;
  inverse?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`nexo-brand ${compact ? "is-compact" : ""} ${inverse ? "is-inverse" : ""}`}
      aria-label="NEXO Book"
    >
      <span className="nexo-mark">
        <Image
          src="/brand/nexo-mark.png"
          alt=""
          width={42}
          height={42}
        />
      </span>
      {!compact && (
        <span className="nexo-wordmark">
          <strong>NEXO</strong>
          <small>BOOK</small>
        </span>
      )}
    </Link>
  );
}
