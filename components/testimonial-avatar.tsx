"use client"

interface TestimonialAvatarProps {
  src: string
  alt: string
  initials: string
}

export function TestimonialAvatar({ src, alt, initials }: TestimonialAvatarProps) {
  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-primary/10">
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        onError={(e) => {
          ;(e.currentTarget as HTMLImageElement).style.display = "none"
        }}
      />
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-primary">
        {initials}
      </span>
    </div>
  )
}