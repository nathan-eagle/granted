'use client'

import { useState } from 'react'

interface GrantWizardProps {
  projectId: string
  onComplete: (grantId: string) => void
}

interface FormData {
  // Step 1: Grant Information
  title: string
  agency: string
  rfpUrl: string
  deadline: string
  amount: string
  rfpContent: string
  
  // Step 2: Applicant Information
  applicantInfo: {
    primaryInvestigator: string
    organization: string
    cv: string
    linkedin: string
    pastGrants: string
  }
  teamMembers: Array<{
    name: string
    role: string
    bio: string
  }>
  
  // Step 3: Proposal Information
  proposalIdea: string
  keywords: string
  significance: string
}

const initialFormData: FormData = {
  title: '',
  agency: '',
  rfpUrl: '',
  deadline: '',
  amount: '',
  rfpContent: '',
  applicantInfo: {
    primaryInvestigator: '',
    organization: '',
    cv: '',
    linkedin: '',
    pastGrants: ''
  },
  teamMembers: [],
  proposalIdea: '',
  keywords: '',
  significance: ''
}

export default function GrantWizard({ projectId, onComplete }: GrantWizardProps) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const updateNestedData = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...(prev[parent as keyof FormData] as any), [field]: value }
    }))
  }

  const addTeamMember = () => {
    setFormData(prev => ({
      ...prev,
      teamMembers: [...prev.teamMembers, { name: '', role: '', bio: '' }]
    }))
  }

  const updateTeamMember = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.map((member, i) => 
        i === index ? { ...member, [field]: value } : member
      )
    }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, ...formData })
      })
      const data = await response.json()
      if (data.success) {
        onComplete(data.grantId)
      }
    } catch (error) {
      console.error('Failed to create grant:', error)
    }
    setIsSubmitting(false)
  }

  const nextStep = () => {
    if (step < 4) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      {/* Progress Bar */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          {['Grant Info', 'Team', 'Proposal', 'Review'].map((label, index) => (
            <div
              key={label}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: step > index + 1 ? '#10b981' : step === index + 1 ? '#3b82f6' : '#e5e7eb',
                color: step >= index + 1 ? 'white' : '#6b7280',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600'
              }}
            >
              {label}
            </div>
          ))}
        </div>
        <div style={{ 
          width: '100%', 
          backgroundColor: '#e5e7eb', 
          height: '0.5rem', 
          borderRadius: '0.25rem' 
        }}>
          <div style={{
            width: `${(step / 4) * 100}%`,
            backgroundColor: '#3b82f6',
            height: '100%',
            borderRadius: '0.25rem',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* Step Content */}
      {step === 1 && (
        <GrantInfoStep 
          formData={formData} 
          updateFormData={updateFormData}
        />
      )}
      
      {step === 2 && (
        <TeamInfoStep 
          formData={formData} 
          updateFormData={updateFormData}
          updateNestedData={updateNestedData}
          addTeamMember={addTeamMember}
          updateTeamMember={updateTeamMember}
        />
      )}
      
      {step === 3 && (
        <ProposalInfoStep 
          formData={formData} 
          updateFormData={updateFormData}
        />
      )}
      
      {step === 4 && (
        <ReviewStep 
          formData={formData} 
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Navigation */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginTop: '3rem',
        paddingTop: '2rem',
        borderTop: '1px solid #e5e7eb'
      }}>
        <button
          onClick={prevStep}
          disabled={step === 1}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: step === 1 ? '#e5e7eb' : '#6b7280',
            color: step === 1 ? '#9ca3af' : 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: '600',
            cursor: step === 1 ? 'not-allowed' : 'pointer'
          }}
        >
          Previous
        </button>
        
        {step < 4 ? (
          <button
            onClick={nextStep}
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
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: isSubmitting ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: '600',
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? 'Creating...' : 'Create Grant'}
          </button>
        )}
      </div>
    </div>
  )
}

// Step Components
function GrantInfoStep({ formData, updateFormData }: any) {
  return (
    <div style={{ space: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
        Grant Information
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Let's start with the basics about the grant opportunity.
      </p>
      
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <FormField
          label="Grant Title"
          value={formData.title}
          onChange={(value) => updateFormData('title', value)}
          placeholder="Enter the grant title"
          required
        />
        
        <FormField
          label="Funding Agency"
          value={formData.agency}
          onChange={(value) => updateFormData('agency', value)}
          placeholder="NSF, NIH, DOE, etc."
        />
        
        <FormField
          label="RFP URL"
          value={formData.rfpUrl}
          onChange={(value) => updateFormData('rfpUrl', value)}
          placeholder="Link to the grant solicitation"
          type="url"
        />
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormField
            label="Deadline"
            value={formData.deadline}
            onChange={(value) => updateFormData('deadline', value)}
            type="date"
          />
          
          <FormField
            label="Grant Amount"
            value={formData.amount}
            onChange={(value) => updateFormData('amount', value)}
            placeholder="$500,000"
          />
        </div>
        
        <FormField
          label="RFP Content"
          value={formData.rfpContent}
          onChange={(value) => updateFormData('rfpContent', value)}
          placeholder="Paste the full RFP text here for AI analysis..."
          type="textarea"
          rows={8}
        />
      </div>
    </div>
  )
}

function TeamInfoStep({ formData, updateFormData, updateNestedData, addTeamMember, updateTeamMember }: any) {
  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
        Team Information
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Tell us about the principal investigator and team members.
      </p>
      
      <div style={{ display: 'grid', gap: '2rem' }}>
        <section>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
            Principal Investigator
          </h3>
          
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <FormField
              label="Name"
              value={formData.applicantInfo.primaryInvestigator}
              onChange={(value) => updateNestedData('applicantInfo', 'primaryInvestigator', value)}
              placeholder="Full name"
              required
            />
            
            <FormField
              label="Organization"
              value={formData.applicantInfo.organization}
              onChange={(value) => updateNestedData('applicantInfo', 'organization', value)}
              placeholder="University or company name"
            />
            
            <FormField
              label="CV/Resume"
              value={formData.applicantInfo.cv}
              onChange={(value) => updateNestedData('applicantInfo', 'cv', value)}
              placeholder="Paste CV content or key accomplishments..."
              type="textarea"
              rows={4}
            />
            
            <FormField
              label="LinkedIn Profile"
              value={formData.applicantInfo.linkedin}
              onChange={(value) => updateNestedData('applicantInfo', 'linkedin', value)}
              placeholder="LinkedIn URL or profile summary"
            />
            
            <FormField
              label="Previous Grants"
              value={formData.applicantInfo.pastGrants}
              onChange={(value) => updateNestedData('applicantInfo', 'pastGrants', value)}
              placeholder="List previous grants and funding history..."
              type="textarea"
              rows={3}
            />
          </div>
        </section>
        
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Team Members</h3>
            <button
              onClick={addTeamMember}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Add Member
            </button>
          </div>
          
          {formData.teamMembers.map((member: any, index: number) => (
            <div key={index} style={{ 
              padding: '1.5rem', 
              border: '1px solid #e5e7eb', 
              borderRadius: '0.5rem',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <FormField
                  label="Name"
                  value={member.name}
                  onChange={(value) => updateTeamMember(index, 'name', value)}
                  placeholder="Team member name"
                />
                <FormField
                  label="Role"
                  value={member.role}
                  onChange={(value) => updateTeamMember(index, 'role', value)}
                  placeholder="Co-PI, Research Scientist, etc."
                />
                <FormField
                  label="Bio/Expertise"
                  value={member.bio}
                  onChange={(value) => updateTeamMember(index, 'bio', value)}
                  placeholder="Brief bio and relevant expertise..."
                  type="textarea"
                  rows={3}
                />
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}

function ProposalInfoStep({ formData, updateFormData }: any) {
  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
        Proposal Information
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Describe your proposed research or project idea.
      </p>
      
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <FormField
          label="Project Title/Idea"
          value={formData.proposalIdea}
          onChange={(value) => updateFormData('proposalIdea', value)}
          placeholder="Describe your research idea, innovation, or project..."
          type="textarea"
          rows={6}
          required
        />
        
        <FormField
          label="Keywords"
          value={formData.keywords}
          onChange={(value) => updateFormData('keywords', value)}
          placeholder="machine learning, renewable energy, biomarkers, etc."
        />
        
        <FormField
          label="Significance & Impact"
          value={formData.significance}
          onChange={(value) => updateFormData('significance', value)}
          placeholder="Why is this important? What problems does it solve? What's the potential impact?"
          type="textarea"
          rows={5}
        />
      </div>
    </div>
  )
}

function ReviewStep({ formData, onSubmit, isSubmitting }: any) {
  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
        Review & Create
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Review your information before creating the grant.
      </p>
      
      <div style={{ display: 'grid', gap: '2rem' }}>
        <section style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
          <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>Grant Information</h3>
          <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div><strong>Title:</strong> {formData.title}</div>
            <div><strong>Agency:</strong> {formData.agency}</div>
            <div><strong>Deadline:</strong> {formData.deadline}</div>
            <div><strong>Amount:</strong> {formData.amount}</div>
          </div>
        </section>
        
        <section style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
          <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>Principal Investigator</h3>
          <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div><strong>Name:</strong> {formData.applicantInfo.primaryInvestigator}</div>
            <div><strong>Organization:</strong> {formData.applicantInfo.organization}</div>
            <div><strong>Team Members:</strong> {formData.teamMembers.length}</div>
          </div>
        </section>
        
        <section style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
          <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>Proposal</h3>
          <div style={{ fontSize: '0.875rem' }}>
            <div style={{ marginBottom: '0.5rem' }}><strong>Keywords:</strong> {formData.keywords}</div>
            <div><strong>Idea:</strong> {formData.proposalIdea.substring(0, 200)}...</div>
          </div>
        </section>
      </div>
    </div>
  )
}

function FormField({ label, value, onChange, placeholder, type = 'text', rows, required = false }: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  rows?: number
  required?: boolean
}) {
  const baseStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '1rem'
  }

  return (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      <label style={{ fontWeight: '600', fontSize: '0.875rem' }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows || 4}
          style={baseStyle}
          required={required}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={baseStyle}
          required={required}
        />
      )}
    </div>
  )
}