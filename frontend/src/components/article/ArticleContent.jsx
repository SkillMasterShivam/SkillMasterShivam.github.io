import Prism from 'prismjs'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-json'
import { useEffect } from 'react'

export default function ArticleContent({ content = [] }) {
  useEffect(() => {
    Prism.highlightAll()
  }, [content])

  const renderBlock = (block) => {
    switch (block.type) {
      case 'heading':
      case 'heading-1':
        return <h1 key={block.id}>{block.content}</h1>
      
      case 'heading-2':
        return <h2 key={block.id}>{block.content}</h2>
      
      case 'heading-3':
        return <h3 key={block.id}>{block.content}</h3>
      
      case 'paragraph':
        return <p key={block.id}>{block.content}</p>
      
      case 'quote':
        return (
          <blockquote key={block.id}>
            {block.content}
          </blockquote>
        )
      
      case 'code':
        const language = block.metadata?.language || 'javascript'
        return (
          <pre key={block.id}>
            <code className={`language-${language}`}>
              {block.content}
            </code>
          </pre>
        )
      
      case 'image':
        return (
          <figure key={block.id} className="my-8">
            <img 
              src={block.metadata?.src || block.content} 
              alt={block.metadata?.alt || ''}
              className="w-full rounded-lg"
            />
            {block.metadata?.caption && (
              <figcaption className="text-center text-sm text-gray-500 mt-2">
                {block.metadata.caption}
              </figcaption>
            )}
          </figure>
        )
      
      case 'divider':
        return <hr key={block.id} />
      
      case 'list':
        const items = block.metadata?.items || block.content.split('\n').filter(Boolean)
        return (
          <ul key={block.id}>
            {items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        )
      
      default:
        return <p key={block.id}>{block.content}</p>
    }
  }

  return (
    <div className="article-content">
      {content.map(renderBlock)}
    </div>
  )
}
