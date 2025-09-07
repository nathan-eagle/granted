import { loadScraped, toParagraphs } from '@/lib/scraped'

export default async function FeaturesPage() {
  const scraped = await loadScraped('features')
  const paras = scraped ? toParagraphs(scraped) : []
  return (
    <section className="mx-auto max-w-7xl px-6 md:px-8 py-12">
      <div className="grid gap-10 md:grid-cols-2 items-start">
        <div>
          <h1 className="text-3xl font-bold mb-6">{scraped?.title ?? 'Features'}</h1>
          <div className="prose prose-slate max-w-none">
            {paras.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
        <div>
          <img src="/images/img1-1.jpg" alt="Features preview" className="rounded-lg border w-full h-auto" />
        </div>
      </div>
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <img src="/images/img1-2.jpg" alt="Feature detail 1" className="rounded-lg border w-full h-auto" />
        <img src="/images/img2-1.jpg" alt="Feature detail 2" className="rounded-lg border w-full h-auto" />
      </div>
    </section>
  )
}
