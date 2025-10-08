'use client'

import { useState, useEffect } from 'react'

interface SectionEditorProps {
  section: {
    id: string
    title: string
    content: string | null
    aiDraft: string | null
    userEdits: string | null
    isComplete: boolean
  }
  grantInfo: {
    title: string
    agency: string | null
    rfpContent: string | null
    proposalIdea: string | null
    applicantInfo: any
    teamMembers: any
    keywords: string | null
  }
}

export default function SectionEditor({ section, grantInfo }: SectionEditorProps) {
  const [content, setContent] = useState(section.content || section.aiDraft || '')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    const hasChanges = content !== (section.content || section.aiDraft || '')
    setHasUnsavedChanges(hasChanges)
  }, [content, section.content, section.aiDraft])

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/grants/sections/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId: section.id,
          sectionTitle: section.title,
          grantInfo
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setContent(data.content)
        setIsEditing(true)
      }
    } catch (error) {
      console.error('Failed to generate section:', error)
    }
    setIsGenerating(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/grants/sections/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId: section.id,
          content,
          userEdits: content !== section.aiDraft ? content : null
        })
      })
      
      if (response.ok) {
        setHasUnsavedChanges(false)
        setIsEditing(false)
        // Reload page to reflect changes
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to save section:', error)
    }
    setIsSaving(false)
  }

  const handleMarkComplete = async () => {
    try {
      const response = await fetch('/api/grants/sections/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId: section.id,
          isComplete: !section.isComplete
        })
      })
      
      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to update section status:', error)
    }
  }

  const isEmpty = !content.trim()
  const hasAiDraft = Boolean(section.aiDraft)

  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '0.75rem',
      backgroundColor: 'white',
      overflow: 'hidden'
    }}>
      {/* Section Header */}
      <div style={{
        padding: '1.5rem',
        backgroundColor: section.isComplete ? '#f0fdf4' : '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h3 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600',
            margin: 0,
            color: section.isComplete ? '#166534' : '#374151'
          }}>
            {section.title}
          </h3>
          
          {section.isComplete && (
            <span style={{
              padding: '0.25rem 0.75rem',
              backgroundColor: '#10b981',
              color: 'white',
              fontSize: '0.75rem',
              borderRadius: '9999px',
              fontWeight: '600'
            }}>
              Complete
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {hasUnsavedChanges && (
            <span style={{ fontSize: '0.875rem', color: '#f59e0b', fontStyle: 'italic' }}>
              Unsaved changes
            </span>
          )}
          
          <button
            onClick={handleMarkComplete}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: section.isComplete ? '#6b7280' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {section.isComplete ? 'Mark Incomplete' : 'Mark Complete'}
          </button>
        </div>
      </div>

      {/* Section Content */}
      <div style={{ padding: '1.5rem' }}>
        {isEmpty ? (
          /* Empty State */
          <div style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.5rem',
            border: '1px dashed #d1d5db'
          }}>
            <h4 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
              Ready to start &quot;{section.title}&quot;?
            </h4>
            <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '0.875rem' }}>
              Our AI will help you draft this section based on your grant information.
            </p>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: isGenerating ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                margin: '0 auto'
              }}
            >
              {isGenerating ? (
                <>
                  <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                  Generating...
                </>
              ) : (
                '✨ Generate with AI'
              )}
            </button>
          </div>
        ) : (
          /* Content Editor */
          <div>
            {hasAiDraft && !isEditing && (
              <div style={{
                marginBottom: '1rem',
                padding: '1rem',
                backgroundColor: '#eff6ff',
                border: '1px solid #dbeafe',
                borderRadius: '0.5rem',
                fontSize: '0.875rem'
              }}>
                <span style={{ fontWeight: '600', color: '#1d4ed8' }}>💡 AI Generated</span>
                <span style={{ color: '#1e40af', marginLeft: '0.5rem' }}>
                  This content was generated by AI. You can edit it to match your needs.
                </span>
              </div>
            )}

            <div style={{ position: 'relative' }}>
              <textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value)
                  if (!isEditing) setIsEditing(true)
                }}
                style={{
                  width: '100%',
                  minHeight: '400px',
                  padding: '1rem',
                  border: isEditing ? '2px solid #3b82f6' : '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  lineHeight: '1.6',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
                placeholder={`Write your ${section.title.toLowerCase()} here...`}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {hasAiDraft && (
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: isGenerating ? '#9ca3af' : '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: isGenerating ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isGenerating ? 'Regenerating...' : '🔄 Regenerate'}
                  </button>
                )}
                
                <button
                  onClick={() => setContent('')}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {hasUnsavedChanges && (
                  <button
                    onClick={() => {
                      setContent(section.content || section.aiDraft || '')
                      setIsEditing(false)
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                )}
                
                <button
                  onClick={handleSave}
                  disabled={isSaving || !hasUnsavedChanges}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: isSaving ? '#9ca3af' : hasUnsavedChanges ? '#10b981' : '#d1d5db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: isSaving || !hasUnsavedChanges ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
