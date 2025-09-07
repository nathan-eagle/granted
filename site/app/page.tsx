import { loadScraped } from '@/lib/scraped'

export default async function Home() {
  const scraped = await loadScraped('home')
  const headline = 'You have better things to do with your time'
  const subhead = 'Get your projects funded faster with AI'
  const p1 = 'Studies show grant applicants spend 40% of their time fundraising. It\'s time to get back to the real work.'
  const p2 = "Granted's specialized AI is trained on over half a million successful grant proposals. Say hello to your fundraising copilot."
  const h2 = "Granted ensures it's the quality of your ideas that counts, not your English."
  const h3 = 'From a $100 donor appeal to a $1 million NIH R01 grant.'

  return (
    <div>
      {/* Hero (black) */}
      <section className="bg-black text-white">
        <div className="mx-auto max-w-7xl px-6 md:px-8 py-16 md:py-24 text-center">
          <h1 className="font-bold leading-tight text-4xl md:text-7xl">{headline}</h1>
          <div className="mt-6 text-2xl md:text-3xl font-semibold">{subhead}</div>
          <div className="mt-4 text-gray-300 max-w-3xl mx-auto space-y-2">
            <p>{p1}</p>
            <p>{p2}</p>
          </div>
          <div className="mt-10">
            <a href="https://app.grantedai.com" className="px-6 py-3 rounded-md bg-yellow-400 text-black font-semibold shadow hover:bg-yellow-300">Start Writing</a>
          </div>
        </div>
      </section>

      {/* Section: quality of ideas */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 md:px-8 py-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold leading-tight">{h2}</h2>
            <p className="mt-4 text-gray-700 max-w-xl">
              Instantly generate high-quality drafts for a wide range of grant proposals, appeals, letters of support, articles, and more, just by entering simple information about your project.
            </p>
            <div className="mt-6">
              <a href="/features" className="inline-flex items-center gap-2 px-4 py-2 rounded-md border font-medium">Discover more features <span aria-hidden>→</span></a>
            </div>
          </div>
          <div className="text-center">
            <img src="/images/img4-1.jpg" alt="Granted" className="mx-auto rounded-xl border w-full max-w-md" />
          </div>
        </div>
      </section>

      {/* Section: donor appeal to NIH R01 */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 md:px-8 py-10 grid md:grid-cols-2 gap-10 items-start">
          <div className="order-2 md:order-1 text-center">
            <img src="/images/img3.jpg" alt="Use cases" className="mx-auto rounded-xl border w-full max-w-md" />
          </div>
          <div className="order-1 md:order-2">
            <h3 className="text-3xl font-extrabold leading-tight">{h3}</h3>
            <ul className="mt-6 text-gray-700 space-y-2 list-disc pl-5">
              <li>Quickly assemble full fundraising proposals.</li>
              <li>Granted's AI is specifically trained for grant proposal writing and produces superior outcomes compared to general-purpose AI writing tools.</li>
              <li>50+ writing models to help draft highly personalized fundraising proposals.</li>
              <li>Specialized models for federal grants.</li>
              <li>Custom engineered for nearly every section of many NIH and NSF grants.</li>
              <li>Improve how you explain your work with specialized AI feedback.</li>
              <li>Keep donors in the loop with well-written project updates.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
