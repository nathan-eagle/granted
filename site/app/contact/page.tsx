import ContactForm from '@/components/ContactForm'
import { loadScraped, toParagraphs } from '@/lib/scraped'

export default async function ContactPage() {
  const scraped = await loadScraped('contact')
  const paras = scraped ? toParagraphs(scraped) : []
  return (
    <div>
      <section className="bg-black text-white">
        <div className="mx-auto max-w-7xl px-6 md:px-8 py-20 text-center">
          <h1 className="text-[34px] md:text-[54px] font-extrabold">{scraped?.title ?? 'Contact'}</h1>
          {scraped?.description && <p className="mt-4 text-gray-300 max-w-3xl mx-auto">{scraped.description}</p>}
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-6 md:px-8 py-16">
        {paras.length > 0 && (
          <div className="prose prose-slate max-w-none mb-8">
            {paras.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}
        <ContactForm />
        <p className="text-sm text-gray-500 mt-4">We’ll route messages to info@grantedai.com.</p>
      </section>
    </div>
  )
}
