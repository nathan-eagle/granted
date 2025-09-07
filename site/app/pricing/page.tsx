import { loadScraped, toParagraphs } from '@/lib/scraped'

export default async function PricingPage() {
  const scraped = await loadScraped('pricing')
  const paras = scraped ? toParagraphs(scraped) : []
  return (
    <div>
      <section className="bg-black text-white">
        <div className="mx-auto max-w-7xl px-6 md:px-8 py-20 text-center">
          <h1 className="text-[34px] md:text-[54px] font-extrabold">{scraped?.title ?? 'Pricing'}</h1>
          {scraped?.description && <p className="mt-4 text-gray-300 max-w-3xl mx-auto">{scraped.description}</p>}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 md:px-8 py-16">
        <img src="/images/img3.jpg" alt="Pricing" className="rounded-xl w-full h-auto mb-10" />
        <div className="prose prose-slate max-w-none mx-auto">
          {paras.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>
    </div>
  )
}
