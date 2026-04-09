import { Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuthStore } from './store/authStore'
import Navbar from './components/layout/Navbar'
import Home from './pages/Home'
import Article from './pages/Article'
import Editor from './pages/Editor'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Register from './pages/Register'
import Bookmarks from './pages/Bookmarks'
import NotFound from './pages/NotFound'

function App() {
  const initAuth = useAuthStore((state) => state.initAuth)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        // Add timeout to prevent infinite loading
        await Promise.race([
          initAuth(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Auth timeout')), 2000)
          )
        ])
      } catch (err) {
        console.log('Auth init error:', err.message)
      }
      setIsInitializing(false)
    }
    init()
  }, [initAuth])

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-brand-800 rounded-lg flex items-center justify-center animate-pulse">
            <span className="text-white font-serif font-bold text-2xl">I</span>
          </div>
          <p className="text-gray-500 text-sm">Loading IdeaPress...</p>
          <button 
            onClick={() => setIsInitializing(false)}
            className="text-xs text-gray-400 underline mt-2"
          >
            Skip loading
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/article/:slug" element={<Article />} />
          <Route path="/write" element={<Editor />} />
          <Route path="/edit/:id" element={<Editor />} />
          <Route path="/@:username" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
