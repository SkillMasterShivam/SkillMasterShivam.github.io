import { useState, useEffect } from 'react'
import { feedAPI, articlesAPI } from '../lib/api'
import ArticleCard from '../components/article/ArticleCard'
import { TrendingUp, Users, Sparkles, Clock } from 'lucide-react'

const TABS = [
  { id: 'for-you', label: 'For You', icon: Sparkles },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'following', label: 'Following', icon: Users },
]

const TOPICS = [
  'Technology', 'Programming', 'Design', 'Business', 
  'Science', 'Health', 'Writing', 'Productivity'
]

export default function Home() {
  const [activeTab, setActiveTab] = useState('for-you')
  const [articles, setArticles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    setArticles([])
    setPage(1)
    setHasMore(true)
    loadArticles(1, true)
  }, [activeTab])

  const loadArticles = async (pageNum, reset = false) => {
    setIsLoading(true)
    setError(null)
    try {
      let response
      if (activeTab === 'for-you') {
        response = await feedAPI.forYou({ page: pageNum, limit: 10 })
      } else if (activeTab === 'trending') {
        response = await feedAPI.trending({ page: pageNum, limit: 10 })
      } else {
        response = await feedAPI.following({ page: pageNum, limit: 10 })
      }

      const newArticles = response.data.data
      setArticles(prev => reset ? newArticles : [...prev, ...newArticles])
      setHasMore(response.data.meta?.hasMore || false)
    } catch (err) {
      setError('Failed to load articles')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMore = () => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      loadArticles(nextPage)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-8">
          {/* Tab Navigation */}
          <div className="flex items-center gap-6 border-b border-gray-200 mb-6">
            {TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 pb-4 text-sm font-medium transition-colors relative ${
                    activeTab === tab.id 
                      ? 'text-gray-900' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Articles */}
          <div>
            {error && (
              <div className="text-center py-12 text-red-600">{error}</div>
            )}

            {!error && articles.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">
                  {activeTab === 'following' 
                    ? 'Follow some writers to see their articles here'
                    : 'No articles found'}
                </p>
                {activeTab === 'following' && (
                  <a href="/" className="text-brand-800 hover:underline">
                    Discover writers
                  </a>
                )}
              </div>
            )}

            {articles.map((article) => (
              <ArticleCard key={article._id} article={article} />
            ))}

            {isLoading && (
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-3" />
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                  </div>
                ))}
              </div>
            )}

            {hasMore && !isLoading && articles.length > 0 && (
              <div className="text-center py-8">
                <button
                  onClick={loadMore}
                  className="px-6 py-2 border border-gray-300 rounded-full text-sm font-medium text-gray-600 hover:border-gray-400"
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="hidden lg:block lg:col-span-4">
          {/* Topics */}
          <div className="sticky top-24">
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                Discover Topics
              </h3>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((topic) => (
                  <a
                    key={topic}
                    href={`/?tag=${topic.toLowerCase()}`}
                    className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-full hover:bg-gray-200 transition-colors"
                  >
                    {topic}
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                Quick Links
              </h3>
              <ul className="space-y-3">
                <li>
                  <a href="/write" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                    <Clock className="w-4 h-4" />
                    <span>Start Writing</span>
                  </a>
                </li>
                <li>
                  <a href="/bookmarks" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                    <TrendingUp className="w-4 h-4" />
                    <span>Your Bookmarks</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-400">
                © 2024 IdeaPress. "Write better. Think deeper. Share smarter."
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
