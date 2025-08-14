interface YouTubeLogoProps {
  size?: number;
  className?: string;
}

export function YouTubeLogo({ size = 16, className = "" }: YouTubeLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M23.498 6.186a2.999 2.999 0 0 0-2.11-2.123C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.388.517A2.999 2.999 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a2.999 2.999 0 0 0 2.11 2.123c1.883.517 9.388.517 9.388.517s7.505 0 9.388-.517a2.999 2.999 0 0 0 2.11-2.123C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
} 