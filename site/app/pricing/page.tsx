import { loadScraped, toParagraphs } from '@/lib/scraped'

export default async function PricingPage() {
  const scraped = await loadScraped('pricing')
  const paras = scraped ? toParagraphs(scraped) : []
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">{scraped?.title ?? 'Pricing'}</h1>
      <div className="prose prose-slate max-w-none">
        {paras.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </section>
  )
}
