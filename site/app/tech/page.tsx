import { loadScraped, toParagraphs } from '@/lib/scraped'
import Image from 'next/image'

export default async function TechPage() {
  const scraped = await loadScraped('tech')
  const paras = scraped ? toParagraphs(scraped) : []
  return (
    <div>
      <section className="bg-black text-white">
        <div className="mx-auto max-w-7xl px-6 md:px-8 py-20 text-center">
          <h1 className="text-[34px] md:text-[54px] font-extrabold">{scraped?.title ?? 'Technology'}</h1>
          {scraped?.description && <p className="mt-4 text-gray-300 max-w-3xl mx-auto">{scraped.description}</p>}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 md:px-8 py-16">
        <div className="grid gap-12 md:grid-cols-2 items-start">
          <div className="prose prose-slate max-w-none">
            {paras.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div>
            <Image src="/images/tech3.jpg" alt="Technology" width={900} height={600} className="rounded-xl w-full h-auto" sizes="(min-width: 1024px) 900px, 90vw" />
          </div>
        </div>
      </section>
    </div>
  )
}
