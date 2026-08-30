import { Link } from "@tanstack/react-router";
import appIcon from "@/assets/app-icon.png";

/**
 * Responsive SpeakUpp logo — uses the same icon as the favicon.
 */
export function Logo({
  withText = true,
  to = "/",
  className = "",
}: {
  withText?: boolean;
  to?: string;
  className?: string;
}) {
  return (
    <Link
      to={to}
      aria-label="SpeakUpp — home"
      className={`flex items-center gap-2 sm:gap-3 shrink-0 ${className}`}
    >
      <img
        src={appIcon}
        alt="SpeakUpp logo"
        width={40}
        height={40}
        className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-xl shadow-soft"
      />
      {withText && (
        <span
          className="
            font-display font-medium tracking-tight
            text-foreground
            text-base sm:text-xl md:text-2xl
            hidden sm:inline
          "
        >
          SpeakUpp.
        </span>
      )}
    </Link>
  );
}
