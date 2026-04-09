import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { usersAPI } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import ArticleCard from '../components/article/ArticleCard'
import { User, Users, FileText, Plus } from 'lucide-react'

export default function Profile() {
  const { username } = useParams()
  const { user: currentUser } = useAuthStore()
  const [profile, setProfile] = useState(null)
  const [articles, setArticles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const isOwnProfile = currentUser?.username === username

  useEffect(() => {
    loadProfile()
  }, [username])

  const loadProfile = async () => {
    setIsLoading(true)
    try {
      const response = await usersAPI.getProfile(username)
      setProfile(response.data.data.profile)
      setArticles(response.data.data.articles)
      if (!isOwnProfile && currentUser) {
        const followRes = await usersAPI.getFollowing(currentUser._id)
        const followingIds = followRes.data.data.map(u => u._id)
        setIsFollowing(followingIds.includes(response.data.data.profile._id))
      }
    } catch (error) {
      console.error('Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await usersAPI.unfollow(profile._id)
        setIsFollowing(false)
        setProfile(prev => ({...prev, stats: {...prev.stats, followersCount: prev.stats.followersCount - 1}}))
      } else {
        await usersAPI.follow(profile._id)
        setIsFollowing(true)
        setProfile(prev => ({...prev, stats: {...prev.stats, followersCount: prev.stats.followersCount + 1}}))
      }
    } catch (error) {
      console.error('Follow error:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-24 w-24 bg-gray-200 rounded-full" />
          <div className="h-8 bg-gray-200 rounded w-1/3" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">User not found</h1>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.displayName} className="w-24 h-24 rounded-full object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="w-12 h-12 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">{profile.displayName}</h1>
              <p className="text-gray-500 mb-3">@{profile.username}</p>
              {profile.bio && <p className="text-gray-700 max-w-xl">{profile.bio}</p>}
              <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {profile.stats.followersCount} followers</span>
                <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> {profile.stats.articlesCount} articles</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isOwnProfile ? (
                <a href="/write" className="btn-primary"><Plus className="w-4 h-4" /> New Article</a>
              ) : currentUser && (
                <button onClick={handleFollow} className={`px-6 py-2 rounded-full font-medium transition-colors ${isFollowing ? 'border border-gray-300 text-gray-700 hover:border-gray-400' : 'bg-brand-800 text-white hover:bg-brand-700'}`}>
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Articles</h2>
        {articles.length > 0 ? (
          <div className="space-y-0">
            {articles.map(article => (
              <ArticleCard key={article._id} article={article} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>No published articles yet.</p>
            {isOwnProfile && <a href="/write" className="text-brand-800 hover:underline mt-2 inline-block">Write your first article</a>}
          </div>
        )}
      </div>
    </div>
  )
}
