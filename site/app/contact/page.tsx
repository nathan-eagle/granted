import ContactForm from '@/components/ContactForm'
import { loadScraped, toParagraphs } from '@/lib/scraped'

export default async function ContactPage() {
  const scraped = await loadScraped('contact')
  const paras = scraped ? toParagraphs(scraped) : []
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">{scraped?.title ?? 'Contact'}</h1>
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
  )
}
