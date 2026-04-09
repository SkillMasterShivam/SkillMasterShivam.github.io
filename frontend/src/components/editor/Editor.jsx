import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GripVertical, Image, Code, Quote, List, Heading1, Heading2, Type, Trash2, Plus } from 'lucide-react'
import { articlesAPI } from '../../lib/api'
import toast from 'react-hot-toast'

const BLOCK_TYPES = [
  { id: 'paragraph', label: 'Paragraph', icon: Type, description: 'Just start writing' },
  { id: 'heading-1', label: 'Heading 1', icon: Heading1, description: 'Big section heading' },
  { id: 'heading-2', label: 'Heading 2', icon: Heading2, description: 'Medium section heading' },
  { id: 'quote', label: 'Quote', icon: Quote, description: 'Capture a quote' },
  { id: 'code', label: 'Code', icon: Code, description: 'Code snippet' },
  { id: 'list', label: 'List', icon: List, description: 'Bullet list' },
  { id: 'image', label: 'Image', icon: Image, description: 'Upload an image' },
]

function generateId() {
  return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function createBlock(type = 'paragraph', content = '') {
  return {
    id: generateId(),
    type,
    content,
    metadata: {},
  }
}

export default function Editor({ initialArticle = null }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState(initialArticle?.title || '')
  const [subtitle, setSubtitle] = useState(initialArticle?.subtitle || '')
  const [blocks, setBlocks] = useState(initialArticle?.content?.length > 0 
    ? initialArticle.content 
    : [createBlock('paragraph')]
  )
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [slashMenuOpen, setSlashMenuOpen] = useState(false)
  const [slashMenuIndex, setSlashMenuIndex] = useState(null)
  const [selectedType, setSelectedType] = useState(0)
  
  const titleRef = useRef(null)
  const blockRefs = useRef({})

  // Auto-resize textarea
  const autoResize = (el) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  // Save article
  const saveArticle = useCallback(async (status = 'draft') => {
    setIsSaving(true)
    try {
      const content = blocks.map((block, index) => ({
        ...block,
        order: index,
      }))

      let response
      if (initialArticle?._id) {
        response = await articlesAPI.update(initialArticle._id, {
          title: title || 'Untitled',
          subtitle,
          content,
        })
      } else {
        response = await articlesAPI.create({
          title: title || 'Untitled',
          subtitle,
          content,
        })
      }

      setLastSaved(new Date())
      return response.data.data
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save')
      throw error
    } finally {
      setIsSaving(false)
    }
  }, [blocks, title, subtitle, initialArticle])

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (title || blocks.some(b => b.content.trim())) {
        saveArticle('draft')
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [saveArticle, title, blocks])

  // Handle publish
  const handlePublish = async () => {
    if (!title.trim()) {
      toast.error('Please add a title')
      titleRef.current?.focus()
      return
    }

    try {
      const article = await saveArticle('draft')
      const targetId = article._id || article.id || initialArticle?._id;
      await articlesAPI.publish(targetId)
      toast.success('Published!')
      navigate(`/article/${article.slug || initialArticle?.slug}`)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to publish')
    }
  }

  // Block operations
  const updateBlock = (index, updates) => {
    setBlocks(prev => prev.map((b, i) => i === index ? { ...b, ...updates } : b))
  }

  const addBlock = (index, type = 'paragraph') => {
    const newBlock = createBlock(type)
    setBlocks(prev => {
      const newBlocks = [...prev]
      newBlocks.splice(index + 1, 0, newBlock)
      return newBlocks
    })
    // Focus new block
    setTimeout(() => {
      blockRefs.current[newBlock.id]?.focus()
    }, 0)
  }

  const removeBlock = (index) => {
    if (blocks.length <= 1) return
    setBlocks(prev => prev.filter((_, i) => i !== index))
    // Focus previous block
    const prevBlock = blocks[index - 1]
    if (prevBlock) {
      setTimeout(() => {
        blockRefs.current[prevBlock.id]?.focus()
      }, 0)
    }
  }

  // Handle key events in blocks
  const handleBlockKeyDown = (e, index) => {
    if (e.key === '/' && !blocks[index].content) {
      e.preventDefault()
      setSlashMenuOpen(true)
      setSlashMenuIndex(index)
      setSelectedType(0)
      return
    }

    if (e.key === 'Enter') {
      if (slashMenuOpen) {
        e.preventDefault()
        const type = BLOCK_TYPES[selectedType].id
        convertBlock(index, type)
        setSlashMenuOpen(false)
        return
      }
      
      if (!e.shiftKey) {
        e.preventDefault()
        addBlock(index)
      }
    }

    if (e.key === 'Backspace' && !blocks[index].content && blocks.length > 1) {
      e.preventDefault()
      removeBlock(index)
    }

    if (slashMenuOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedType(prev => (prev + 1) % BLOCK_TYPES.length)
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedType(prev => (prev - 1 + BLOCK_TYPES.length) % BLOCK_TYPES.length)
      }
      if (e.key === 'Escape') {
        setSlashMenuOpen(false)
      }
    }
  }

  const convertBlock = (index, type) => {
    updateBlock(index, { type, content: '' })
    setSlashMenuOpen(false)
  }

  // Image upload
  const handleImageUpload = async (index, file) => {
    // In production, upload to Cloudinary
    // For now, use FileReader for demo
    const reader = new FileReader()
    reader.onload = (e) => {
      updateBlock(index, {
        type: 'image',
        content: '',
        metadata: { src: e.target.result, alt: '' }
      })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {isSaving ? 'Saving...' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Unsaved'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => saveArticle()}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Save Draft
            </button>
            <button
              onClick={handlePublish}
              className="px-6 py-2 bg-brand-800 text-white text-sm font-medium rounded-full hover:bg-brand-700"
            >
              Publish
            </button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Title */}
        <textarea
          ref={titleRef}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            autoResize(e.target)
          }}
          placeholder="Title"
          className="w-full text-4xl font-serif font-bold placeholder-gray-300 border-none outline-none resize-none overflow-hidden"
          rows={1}
        />

        {/* Subtitle */}
        <textarea
          value={subtitle}
          onChange={(e) => {
            setSubtitle(e.target.value)
            autoResize(e.target)
          }}
          placeholder="Add a subtitle..."
          className="w-full text-xl text-gray-500 placeholder-gray-300 border-none outline-none resize-none overflow-hidden mt-4"
          rows={1}
        />

        {/* Blocks */}
        <div className="mt-8 space-y-1">
          {blocks.map((block, index) => (
            <div key={block.id} className="editor-block group">
              {/* Block handle */}
              <div className="block-handle">
                <GripVertical className="w-5 h-5" />
              </div>

              {/* Block content */}
              <div className="relative">
                {block.type === 'heading-1' && (
                  <input
                    ref={el => blockRefs.current[block.id] = el}
                    type="text"
                    value={block.content}
                    onChange={(e) => updateBlock(index, { content: e.target.value })}
                    onKeyDown={(e) => handleBlockKeyDown(e, index)}
                    placeholder="Heading 1"
                    className="editor-heading-1 w-full"
                  />
                )}

                {block.type === 'heading-2' && (
                  <input
                    ref={el => blockRefs.current[block.id] = el}
                    type="text"
                    value={block.content}
                    onChange={(e) => updateBlock(index, { content: e.target.value })}
                    onKeyDown={(e) => handleBlockKeyDown(e, index)}
                    placeholder="Heading 2"
                    className="editor-heading-2 w-full"
                  />
                )}

                {block.type === 'quote' && (
                  <textarea
                    ref={el => blockRefs.current[block.id] = el}
                    value={block.content}
                    onChange={(e) => {
                      updateBlock(index, { content: e.target.value })
                      autoResize(e.target)
                    }}
                    onKeyDown={(e) => handleBlockKeyDown(e, index)}
                    placeholder="Type a quote..."
                    className="editor-quote w-full resize-none overflow-hidden"
                    rows={1}
                  />
                )}

                {block.type === 'code' && (
                  <textarea
                    ref={el => blockRefs.current[block.id] = el}
                    value={block.content}
                    onChange={(e) => {
                      updateBlock(index, { content: e.target.value })
                      autoResize(e.target)
                    }}
                    onKeyDown={(e) => handleBlockKeyDown(e, index)}
                    placeholder="Code block"
                    className="editor-code w-full resize-none"
                    rows={3}
                    spellCheck={false}
                  />
                )}

                {block.type === 'image' && (
                  <div className="py-4">
                    {block.metadata?.src ? (
                      <div className="relative">
                        <img 
                          src={block.metadata.src} 
                          alt={block.metadata.alt || ''}
                          className="w-full rounded-lg"
                        />
                        <button
                          onClick={() => updateBlock(index, { type: 'paragraph', content: '', metadata: {} })}
                          className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 cursor-pointer">
                        <div className="flex flex-col items-center">
                          <Image className="w-8 h-8 text-gray-400" />
                          <span className="mt-2 text-sm text-gray-500">Upload an image</span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleImageUpload(index, e.target.files[0])}
                        />
                      </label>
                    )}
                  </div>
                )}

                {(block.type === 'paragraph' || block.type === 'list') && (
                  <textarea
                    ref={el => blockRefs.current[block.id] = el}
                    value={block.content}
                    onChange={(e) => {
                      updateBlock(index, { content: e.target.value })
                      autoResize(e.target)
                    }}
                    onKeyDown={(e) => handleBlockKeyDown(e, index)}
                    placeholder="Type / for commands"
                    className="editor-paragraph w-full resize-none overflow-hidden"
                    rows={1}
                  />
                )}

                {/* Slash command menu */}
                {slashMenuOpen && slashMenuIndex === index && (
                  <div className="slash-menu -left-12 top-full mt-2">
                    <div className="px-3 py-2 text-xs font-medium text-gray-400 uppercase">
                      Basic Blocks
                    </div>
                    {BLOCK_TYPES.map((type, i) => {
                      const Icon = type.icon
                      return (
                        <div
                          key={type.id}
                          className={`slash-menu-item ${i === selectedType ? 'active' : ''}`}
                          onClick={() => convertBlock(index, type.id)}
                        >
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{type.label}</div>
                            <div className="text-xs text-gray-500">{type.description}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Hover actions */}
              <div className="absolute right-0 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <button
                  onClick={() => addBlock(index)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  title="Add block below"
                >
                  <Plus className="w-4 h-4" />
                </button>
                {blocks.length > 1 && (
                  <button
                    onClick={() => removeBlock(index)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete block"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
