import { useParams } from 'react-router-dom'
import Editor from '../components/editor/Editor'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function EditorPage() {
  const { id } = useParams()
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Editor articleId={id} />
}
