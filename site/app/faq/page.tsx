import { loadScraped, toParagraphs } from '@/lib/scraped'
import { renderTextBlocks } from '@/lib/format'
import Image from 'next/image'

export default async function FAQPage() {
  const scraped = await loadScraped('faq')
  const paras = scraped ? toParagraphs(scraped) : []
  return (
    <div>
      <section className="bg-black text-white">
        <div className="mx-auto max-w-7xl px-6 md:px-8 py-20 text-center">
          <h1 className="text-[34px] md:text-[54px] font-extrabold">{scraped?.title ?? 'FAQ'}</h1>
          {scraped?.description && <p className="mt-4 text-gray-300 max-w-3xl mx-auto">{scraped.description}</p>}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 md:px-8 py-16">
        <div className="grid gap-10 md:grid-cols-2 items-start">
          <div className="prose prose-slate max-w-none">{renderTextBlocks(paras)}</div>
          <div>
            <Image src="/images/img2-2.jpg" alt="FAQ" width={600} height={500} className="rounded-xl w-full h-auto" sizes="(min-width: 1024px) 600px, 90vw" />
          </div>
        </div>
      </section>
    </div>
  )
}
