import { useState, useEffect } from 'react'
import { ThumbsUp } from 'lucide-react'
import { engagementAPI } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

export default function ClapButton({ 
  articleId, 
  initialCount = 0, 
  userClapCount = 0,
  isClapped = false 
}) {
  const { isAuthenticated } = useAuthStore()
  const [count, setCount] = useState(userClapCount || 0)
  const [total, setTotal] = useState(initialCount)
  const [hasClapped, setHasClapped] = useState(isClapped)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    setTotal(initialCount)
    setCount(userClapCount)
    setHasClapped(isClapped)
  }, [initialCount, userClapCount, isClapped])

  const handleClap = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to clap')
      return
    }

    const newCount = count >= 50 ? 0 : count + 1
    setIsAnimating(true)
    setCount(newCount)
    setTotal(prev => prev + (newCount === 0 ? -count : 1))
    setHasClapped(newCount > 0)

    try {
      if (newCount === 0) {
        await engagementAPI.unclap(articleId)
      } else {
        await engagementAPI.clap(articleId, newCount)
      }
    } catch (error) {
      // Revert on error
      setCount(count)
      setTotal(prev => prev - (newCount === 0 ? -count : 1))
      toast.error('Failed to update clap')
    }

    setTimeout(() => setIsAnimating(false), 200)
  }

  return (
    <button
      onClick={handleClap}
      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
        hasClapped 
          ? 'bg-green-50 text-green-600 hover:bg-green-100' 
          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
      }`}
    >
      <ThumbsUp 
        className={`w-5 h-5 ${isAnimating ? 'clap-animate' : ''}`} 
      />
      <span className="font-medium">{total.toLocaleString()}</span>
      {count > 0 && (
        <span className="text-xs text-gray-400">({count})</span>
      )}
    </button>
  )
}
