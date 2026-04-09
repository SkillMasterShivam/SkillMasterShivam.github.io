import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { articlesAPI } from '../lib/api'
import ArticleContent from '../components/article/ArticleContent'
import ClapButton from '../components/article/ClapButton'
import CommentSection from '../components/article/CommentSection'
import { formatDistanceToNow } from 'date-fns'
import { User, Clock, Share2, Bookmark, BookmarkCheck } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { engagementAPI } from '../lib/api'
import toast from 'react-hot-toast'

export default function Article() {
  const { slug } = useParams()
  const { isAuthenticated } = useAuthStore()
  const [article, setArticle] = useState(null)
  const [author, setAuthor] = useState(null)
  const [userInteractions, setUserInteractions] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isBookmarked, setIsBookmarked] = useState(false)

  useEffect(() => {
    loadArticle()
  }, [slug])

  const loadArticle = async () => {
    setIsLoading(true)
    try {
      const response = await articlesAPI.getBySlug(slug)
      setArticle(response.data.data.article)
      setAuthor(response.data.data.author)
      setUserInteractions(response.data.data.userInteractions || {})
      setIsBookmarked(response.data.data.userInteractions?.bookmarked || false)
    } catch (error) {
      console.error('Failed to load article')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBookmark = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to bookmark')
      return
    }

    try {
      if (isBookmarked) {
        await engagementAPI.unbookmark(article._id)
        setIsBookmarked(false)
        toast.success('Removed from bookmarks')
      } else {
        await engagementAPI.bookmark(article._id)
        setIsBookmarked(true)
        toast.success('Saved to bookmarks')
      }
    } catch (error) {
      toast.error('Failed to update bookmark')
    }
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-12 bg-gray-200 rounded w-3/4" />
          <div className="h-6 bg-gray-200 rounded w-1/2" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Article not found</h1>
        <p className="text-gray-600">The article you're looking for doesn't exist or has been removed.</p>
      </div>
    )
  }

  return (
    <article className="min-h-screen bg-white">
      {/* Header */}
      <div className="max-w-3xl mx-auto px-4 pt-12 pb-8">
        {/* Author */}
        <div className="flex items-center gap-3 mb-6">
          {author?.avatar ? (
            <img
              src={author.avatar}
              alt={author.displayName}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="w-6 h-6 text-gray-500" />
            </div>
          )}
          <div>
            <a
              href={`/@${author?.username}`}
              className="font-medium text-gray-900 hover:underline"
            >
              {author?.displayName || author?.username}
            </a>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {article.readTime} min read
              </span>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4 leading-tight">
          {article.title}
        </h1>

        {/* Subtitle */}
        {article.subtitle && (
          <p className="text-xl text-gray-600 mb-8">{article.subtitle}</p>
        )}

        {/* Cover Image */}
        {article.coverImage && (
          <img
            src={article.coverImage}
            alt={article.title}
            className="w-full rounded-lg mb-8"
          />
        )}
      </div>

      {/* Actions Bar */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-sm border-y border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ClapButton
              articleId={article._id}
              initialCount={article.stats?.claps || 0}
              userClapCount={userInteractions?.clapCount || 0}
              isClapped={userInteractions?.clapped || false}
            />
            <span className="text-sm text-gray-500">
              {article.stats?.views?.toLocaleString()} views
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBookmark}
              className={`p-2 rounded-full transition-colors ${
                isBookmarked 
                  ? 'text-brand-800 bg-brand-50' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-5 h-5" />
              ) : (
                <Bookmark className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={handleShare}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <ArticleContent content={article.content} />

        {/* Tags */}
        {article.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t border-gray-200">
            {article.tags.map((tag) => (
              <a
                key={tag}
                href={`/?tag=${tag}`}
                className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full hover:bg-gray-200"
              >
                {tag}
              </a>
            ))}
          </div>
        )}

        {/* Comments */}
        <CommentSection articleId={article._id} />
      </div>
    </article>
  )
}
