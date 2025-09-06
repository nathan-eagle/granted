import { loadScraped, toParagraphs } from '@/lib/scraped'

export default async function Home() {
  const scraped = await loadScraped('home')
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-sky-50">
        <div className="mx-auto max-w-7xl px-6 md:px-8 py-16 md:py-24">
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div>
              <h1 className="mt-2 text-4xl md:text-6xl font-bold leading-tight">{scraped?.title ?? 'Granted AI'}</h1>
              {scraped && (
                <div className="mt-5 text-gray-700 space-y-4">
                  {toParagraphs(scraped).slice(0,6).map((p, i) => (
                    <p key={i} className="text-base md:text-lg">{p}</p>
                  ))}
                </div>
              )}
              <div className="mt-8 flex flex-wrap gap-4">
                <a href="https://app.grantedai.com" className="px-6 py-3 rounded-md bg-sky-500 text-white font-medium shadow-sm hover:bg-sky-600">Start Writing</a>
                <a href="/features" className="px-6 py-3 rounded-md border font-medium hover:bg-white">Discover more features</a>
              </div>
            </div>
            <div className="relative">
              <div className="rounded-xl border bg-white shadow-sm p-4 md:p-6">
                <img src="/images/img4-1.jpg" alt="Granted preview" className="rounded-lg w-full h-auto" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
