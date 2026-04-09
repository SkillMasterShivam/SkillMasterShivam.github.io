import { useState, useEffect } from 'react'
import { MessageCircle, Send, Trash2, CornerDownRight } from 'lucide-react'
import { engagementAPI } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

export default function CommentSection({ articleId }) {
  const { user, isAuthenticated } = useAuthStore()
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadComments()
  }, [articleId])

  const loadComments = async () => {
    try {
      const response = await engagementAPI.getComments(articleId)
      setComments(response.data.data)
    } catch (error) {
      console.error('Failed to load comments')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    if (!isAuthenticated) {
      toast.error('Please sign in to comment')
      return
    }

    setIsLoading(true)
    try {
      await engagementAPI.addComment(articleId, {
        content: newComment,
        parentId: replyTo
      })
      setNewComment('')
      setReplyTo(null)
      loadComments()
      toast.success('Comment added')
    } catch (error) {
      toast.error('Failed to add comment')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (commentId) => {
    try {
      await engagementAPI.deleteComment(commentId)
      loadComments()
      toast.success('Comment deleted')
    } catch (error) {
      toast.error('Failed to delete comment')
    }
  }

  return (
    <section className="mt-12 pt-12 border-t border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Comments ({comments.length})
      </h3>

      {/* Comment input */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="mb-8">
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
              <CornerDownRight className="w-4 h-4" />
              <span>Replying to comment</span>
              <button 
                onClick={() => setReplyTo(null)}
                className="text-red-500 hover:underline"
              >
                Cancel
              </button>
            </div>
          )}
          <div className="flex gap-3">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.displayName} className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-gray-500" />
              </div>
            )}
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="What are your thoughts?"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800 resize-none"
                rows={3}
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={!newComment.trim() || isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-800 text-white rounded-full text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {isLoading ? 'Posting...' : 'Comment'}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-gray-50 rounded-lg p-6 text-center mb-8">
          <p className="text-gray-600 mb-3">Sign in to join the conversation</p>
          <a href="/login" className="px-4 py-2 bg-brand-800 text-white rounded-full text-sm font-medium">
            Sign In
          </a>
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-6">
        {comments.map((comment) => (
          <div key={comment._id} className="flex gap-3">
            {comment.authorId?.avatar ? (
              <img 
                src={comment.authorId.avatar} 
                alt={comment.authorId.displayName}
                className="w-10 h-10 rounded-full shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-gray-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900">
                  {comment.authorId?.displayName || 'Anonymous'}
                </span>
                <span className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-gray-700">{comment.content}</p>
              
              <div className="flex items-center gap-4 mt-2">
                <button 
                  onClick={() => setReplyTo(comment._id)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Reply
                </button>
                {user?._id === comment.authorId?._id && (
                  <button
                    onClick={() => handleDelete(comment._id)}
                    className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                )}
              </div>

              {/* Replies */}
              {comment.replies?.length > 0 && (
                <div className="mt-4 space-y-4 border-l-2 border-gray-200 pl-4">
                  {comment.replies.map((reply) => (
                    <div key={reply._id} className="flex gap-3">
                      {reply.authorId?.avatar ? (
                        <img 
                          src={reply.authorId.avatar} 
                          alt={reply.authorId.displayName}
                          className="w-8 h-8 rounded-full shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                          <MessageCircle className="w-4 h-4 text-gray-500" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-900">
                            {reply.authorId?.displayName || 'Anonymous'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{reply.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
