'use client'

import { useState } from 'react'

interface MockReviewSystemProps {
  grant: {
    id: string
    title: string
    agency: string | null
    sections: Array<{
      id: string
      title: string
      content: string | null
    }>
    mockReviews: Array<{
      id: string
      reviewerName: string
      reviewerRole: string
      score: number | null
      strengths: string | null
      weaknesses: string | null
      suggestions: string | null
      createdAt: Date
    }>
  }
}

export default function MockReviewSystem({ grant }: MockReviewSystemProps) {
  const [isGeneratingReviews, setIsGeneratingReviews] = useState(false)
  const [activeTab, setActiveTab] = useState<'generate' | 'reviews'>('generate')

  const handleGenerateReviews = async () => {
    setIsGeneratingReviews(true)
    try {
      const response = await fetch('/api/grants/mock-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantId: grant.id })
      })
      
      if (response.ok) {
        // Reload page to show new reviews
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to generate reviews:', error)
    }
    setIsGeneratingReviews(false)
  }

  const hasReviews = grant.mockReviews.length > 0
  const averageScore = hasReviews 
    ? grant.mockReviews
        .filter(r => r.score !== null)
        .reduce((sum, r) => sum + (r.score || 0), 0) / 
      grant.mockReviews.filter(r => r.score !== null).length
    : 0

  return (
    <div>
      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '2rem'
      }}>
        <button
          onClick={() => setActiveTab('generate')}
          style={{
            padding: '1rem 1.5rem',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'generate' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'generate' ? '#3b82f6' : '#6b7280',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Generate Reviews
        </button>
        
        <button
          onClick={() => setActiveTab('reviews')}
          style={{
            padding: '1rem 1.5rem',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'reviews' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'reviews' ? '#3b82f6' : '#6b7280',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Reviews ({grant.mockReviews.length})
        </button>
      </div>

      {/* Generate Tab */}
      {activeTab === 'generate' && (
        <div>
          <div style={{ 
            backgroundColor: '#f9fafb',
            padding: '2rem',
            borderRadius: '0.75rem',
            border: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Mock Review Panel
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
              Get feedback from multiple AI reviewers representing different perspectives: 
              technical experts, program officers, and industry professionals. This helps identify 
              strengths and weaknesses before submission.
            </p>

            {hasReviews && (
              <div style={{ 
                marginBottom: '2rem',
                padding: '1.5rem',
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb'
              }}>
                <h4 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                  Current Reviews Summary
                </h4>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', fontSize: '0.875rem' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 'bold', color: getScoreColor(averageScore) }}>
                      {averageScore.toFixed(1)}/5.0
                    </span>
                    <span style={{ color: '#6b7280' }}>Average Score</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 'bold' }}>
                      {grant.mockReviews.length}
                    </span>
                    <span style={{ color: '#6b7280' }}>Reviews</span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleGenerateReviews}
              disabled={isGeneratingReviews}
              style={{
                padding: '1rem 2rem',
                backgroundColor: isGeneratingReviews ? '#9ca3af' : '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: isGeneratingReviews ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                margin: '0 auto'
              }}
            >
              {isGeneratingReviews ? (
                <>
                  <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                  Generating Reviews...
                </>
              ) : (
                <>
                  🔍 {hasReviews ? 'Generate New Reviews' : 'Start Mock Review'}
                </>
              )}
            </button>

            {isGeneratingReviews && (
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '1rem' }}>
                This may take 1-2 minutes as we analyze your grant from multiple perspectives...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div>
          {!hasReviews ? (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              backgroundColor: '#f9fafb',
              borderRadius: '0.75rem',
              border: '1px dashed #d1d5db'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                No reviews generated yet
              </h3>
              <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
                Switch to the &quot;Generate Reviews&quot; tab to create your first mock review.
              </p>
              <button
                onClick={() => setActiveTab('generate')}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Generate Reviews
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '2rem' }}>
              {/* Summary */}
              <div style={{
                padding: '2rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.75rem',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                  Review Summary
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: '2.5rem', 
                      fontWeight: 'bold',
                      color: getScoreColor(averageScore),
                      marginBottom: '0.5rem'
                    }}>
                      {averageScore.toFixed(1)}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      Average Score (out of 5)
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: '2.5rem', 
                      fontWeight: 'bold',
                      color: '#3b82f6',
                      marginBottom: '0.5rem'
                    }}>
                      {grant.mockReviews.length}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      Total Reviews
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: '2.5rem', 
                      fontWeight: 'bold',
                      color: '#10b981',
                      marginBottom: '0.5rem'
                    }}>
                      {grant.mockReviews.filter(r => (r.score || 0) >= 4).length}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      High Scores (4+)
                    </div>
                  </div>
                </div>
              </div>

              {/* Individual Reviews */}
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {grant.mockReviews.map((review, index) => (
                  <ReviewCard key={review.id} review={review} index={index} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ReviewCard({ review, index }: { review: any; index: number }) {
  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '0.75rem',
      padding: '2rem',
      backgroundColor: 'white'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '1.5rem'
      }}>
        <div>
          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            Reviewer #{index + 1}: {review.reviewerName}
          </h4>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            {review.reviewerRole}
          </p>
        </div>
        
        {review.score && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold',
              color: getScoreColor(review.score)
            }}>
              {review.score}/5
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              Score
            </div>
          </div>
        )}
      </div>

      {/* Review Content */}
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {review.strengths && (
          <div>
            <h5 style={{ 
              fontSize: '1rem', 
              fontWeight: '600', 
              color: '#10b981',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              ✅ Strengths
            </h5>
            <p style={{ 
              fontSize: '0.875rem', 
              lineHeight: '1.6',
              color: '#374151',
              whiteSpace: 'pre-line'
            }}>
              {review.strengths}
            </p>
          </div>
        )}

        {review.weaknesses && (
          <div>
            <h5 style={{ 
              fontSize: '1rem', 
              fontWeight: '600', 
              color: '#ef4444',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              ⚠️ Weaknesses
            </h5>
            <p style={{ 
              fontSize: '0.875rem', 
              lineHeight: '1.6',
              color: '#374151',
              whiteSpace: 'pre-line'
            }}>
              {review.weaknesses}
            </p>
          </div>
        )}

        {review.suggestions && (
          <div>
            <h5 style={{ 
              fontSize: '1rem', 
              fontWeight: '600', 
              color: '#3b82f6',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              💡 Suggestions for Improvement
            </h5>
            <p style={{ 
              fontSize: '0.875rem', 
              lineHeight: '1.6',
              color: '#374151',
              whiteSpace: 'pre-line'
            }}>
              {review.suggestions}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function getScoreColor(score: number): string {
  if (score >= 4.5) return '#10b981' // green
  if (score >= 3.5) return '#f59e0b' // yellow
  return '#ef4444' // red
}
