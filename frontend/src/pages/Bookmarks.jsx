import { useEffect, useState } from 'react'
import { usersAPI } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import ArticleCard from '../components/article/ArticleCard'
import { Bookmark, ArrowRight } from 'lucide-react'
import { Navigate } from 'react-router-dom'

export default function Bookmarks() {
  const { isAuthenticated } = useAuthStore()
  const [bookmarks, setBookmarks] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated) {
      loadBookmarks()
    }
  }, [isAuthenticated])

  const loadBookmarks = async () => {
    try {
      const response = await usersAPI.getMyBookmarks()
      setBookmarks(response.data.data)
    } catch (error) {
      console.error('Failed to load bookmarks')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-8">
        <Bookmark className="w-8 h-8 text-brand-800" />
        <h1 className="text-3xl font-bold text-gray-900">Your Bookmarks</h1>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-3" />
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-full" />
            </div>
          ))}
        </div>
      ) : bookmarks.length > 0 ? (
        <div className="space-y-0">
          {bookmarks.map((article) => (
            <ArticleCard key={article._id} article={article} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Bookmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No bookmarks yet</h3>
          <p className="text-gray-600 mb-6">Save articles you want to read later</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-800 text-white rounded-full font-medium hover:bg-brand-700"
          >
            Discover Articles
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  )
}
