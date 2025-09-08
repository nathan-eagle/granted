import { loadScraped, toParagraphs } from '@/lib/scraped'
import { renderTextBlocks } from '@/lib/format'
import Image from 'next/image'

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
        <Image src="/images/img3.jpg" alt="Pricing" width={1000} height={600} className="rounded-xl w-full h-auto mb-10" sizes="(min-width: 1024px) 1000px, 90vw" />
        <div className="prose prose-slate max-w-none mx-auto">{renderTextBlocks(paras)}</div>
      </section>
    </div>
  )
}
