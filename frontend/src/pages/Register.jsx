import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    displayName: ''
  })
  const { register, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    const result = await register(formData)
    if (result.success) {
      toast.success('Welcome to IdeaPress!')
      navigate('/')
    } else {
      toast.error(result.error || 'Registration failed')
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">Join IdeaPress</h1>
          <p className="text-gray-600">Start writing and sharing your ideas</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            name="email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <Input
            name="username"
            label="Username"
            placeholder="johndoe"
            value={formData.username}
            onChange={handleChange}
            helperText="Letters, numbers, and underscores only"
            required
          />

          <Input
            name="displayName"
            label="Display Name (optional)"
            placeholder="John Doe"
            value={formData.displayName}
            onChange={handleChange}
          />

          <Input
            name="password"
            type="password"
            label="Password"
            placeholder="Create a strong password"
            value={formData.password}
            onChange={handleChange}
            helperText="At least 8 characters"
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full"
          >
            Create Account
          </Button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-800 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
