'use client'

import { useRouter } from 'next/navigation'
import GrantWizard from '@/components/GrantWizard'

export default function NewGrantPage({ params }: { params: { id: string } }) {
  const router = useRouter()

  const handleComplete = (grantId: string) => {
    router.push(`/projects/${params.id}/grants/${grantId}`)
  }

  return (
    <div>
      <GrantWizard projectId={params.id} onComplete={handleComplete} />
    </div>
  )
}