import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'

async function getJob(jobId: string, userId: string) {
  return prisma.job.findFirst({ where: { id: jobId, userId } })
}

async function getPoll(jobId: string) {
  const res = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/jobs/${jobId}`, { cache: 'no-store' })
  return res.json()
}

export default async function JobPage({ params }: { params: { jobId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) notFound()
  // @ts-ignore
  const userId = session.user.id as string
  const job = await getJob(params.jobId, userId)
  if (!job) notFound()

  const poll = await getPoll(params.jobId)

  return (
    <div>
      <h1>Generating…</h1>
      {poll.status !== 'succeeded' ? (
        <Polling jobId={params.jobId} />
      ) : (
        <ResponseView responseId={poll.responseId} />
      )}
    </div>
  )
}

function Polling({ jobId }: { jobId: string }) {
  return (
    <div>
      <p>Working… this can take several minutes. You can leave this tab open.</p>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            const jobId = ${JSON.stringify(jobId)};
            async function poll(){
              try{ const res = await fetch('/api/jobs/' + jobId, {cache:'no-store'}); const data = await res.json();
                if(data.status === 'succeeded'){ location.reload(); }
                else if(data.status === 'failed'){ document.getElementById('poll-status').textContent = 'Failed: ' + (data.error || 'Unknown error'); }
                else { setTimeout(poll, 2500); }
              }catch(e){ setTimeout(poll, 4000); }
            }
            setTimeout(poll, 1500);
          `
        }}
      />
      <div id="poll-status">Queued / Running…</div>
    </div>
  )
}

async function ResponseView({ responseId }: { responseId: string }) {
  const response = await prisma.response.findUnique({ where: { id: responseId } })
  if (!response) return <div>Done, but no response found.</div>
  return (
    <div>
      <h2>Result</h2>
      <textarea defaultValue={response.output ?? ''} rows={24} style={{width:'100%'}} />
      <div style={{marginTop:12}}>
        <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(response.output || '')}`} download="granted.txt">Download .txt</a>
        {' | '}
        <a href={`data:text/markdown;charset=utf-8,${encodeURIComponent(response.output || '')}`} download="granted.md">Download .md</a>
      </div>
    </div>
  )
}

