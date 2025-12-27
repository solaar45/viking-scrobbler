import { useState } from 'react'
import { cn } from '@/lib/design-tokens'

interface StatsCoverProps {
  coverUrl?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
}

export function StatsCover({ coverUrl, name, size = 'md' }: StatsCoverProps) {
  const [imgError, setImgError] = useState(false)

  const initial = name[0]?.toUpperCase() || '?'

  const gradients = [
    'from-purple-500 to-purple-700',
    'from-blue-500 to-blue-700',
    'from-green-500 to-green-700',
    'from-amber-500 to-amber-700',
    'from-red-500 to-red-700',
    'from-pink-500 to-pink-700',
  ]
  const gradientIndex = initial.charCodeAt(0) % gradients.length

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  }

  return (
    <div className="flex items-center justify-center">
      {coverUrl && !imgError ? (
        <img
          src={coverUrl}
          alt={name}
          className={cn(
            sizeClasses[size],
            "rounded-full border border-viking-border-default shadow-sm object-cover"
          )}
          onError={() => setImgError(true)}
        />
      ) : (
        <div 
          className={cn(
            sizeClasses[size],
            "rounded-full flex items-center justify-center",
            "font-bold text-white",
            "bg-gradient-to-br",
            gradients[gradientIndex],
            "border border-viking-border-default shadow-sm"
          )}
        >
          {initial}
        </div>
      )}
    </div>
  )
}
