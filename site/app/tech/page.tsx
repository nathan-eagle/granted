import { loadScraped, toParagraphs } from '@/lib/scraped'

export default async function TechPage() {
  const scraped = await loadScraped('tech')
  const paras = scraped ? toParagraphs(scraped) : []
  return (
    <section className="mx-auto max-w-7xl px-6 md:px-8 py-12">
      <div className="grid gap-10 md:grid-cols-2 items-start">
        <div>
          <h1 className="text-3xl font-bold mb-6">{scraped?.title ?? 'Technology'}</h1>
          <div className="prose prose-slate max-w-none">
            {paras.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
        <div>
          <img src="/images/tech3.jpg" alt="Technology" className="rounded-lg border w-full h-auto" />
        </div>
      </div>
    </section>
  )
}
