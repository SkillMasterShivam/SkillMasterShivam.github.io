import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { User, Clock, MoreHorizontal } from 'lucide-react'

export default function ArticleCard({ article }) {
  const author = article.authorId || {}
  
  return (
    <article className="article-card group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Author */}
          <div className="flex items-center gap-2 mb-3">
            <Link 
              to={`/@${author.username}`}
              className="flex items-center gap-2 hover:opacity-80"
            >
              {author.avatar ? (
                <img
                  src={author.avatar}
                  alt={author.displayName}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-3 h-3 text-gray-500" />
                </div>
              )}
              <span className="text-sm font-medium text-gray-900">
                {author.displayName || author.username}
              </span>
            </Link>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
            </span>
          </div>

          {/* Title */}
          <Link to={`/article/${article.slug}`}>
            <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-gray-600 transition-colors line-clamp-2">
              {article.title}
            </h2>
          </Link>

          {/* Subtitle */}
          {article.subtitle && (
            <p className="text-gray-600 mb-3 line-clamp-2">
              {article.subtitle}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{article.readTime || 3} min read</span>
            </div>
            {article.tags?.length > 0 && (
              <>
                <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs">
                  {article.tags[0]}
                </span>
                {article.tags.length > 1 && (
                  <span className="text-xs">+{article.tags.length - 1}</span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Cover Image */}
        {article.coverImage && (
          <Link to={`/article/${article.slug}`} className="shrink-0">
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-32 h-24 object-cover rounded-lg"
            />
          </Link>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>{article.stats?.claps || 0} claps</span>
          <span>{article.stats?.comments || 0} comments</span>
        </div>
        <button className="p-2 text-gray-400 hover:text-gray-600">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
    </article>
  )
}
