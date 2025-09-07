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
        <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-24 md:py-32 text-center">
          <h1 className="font-extrabold leading-[1.04] text-[48px] md:text-[76px] lg:text-[90px] tracking-tight">{headline}</h1>
          <div className="mt-6 text-[24px] md:text-[30px] font-semibold">{subhead}</div>
          <div className="mt-5 text-gray-300 max-w-3xl mx-auto space-y-2 text-[16px] md:text-[18px]">
            <p>{p1}</p>
            <p>{p2}</p>
          </div>
          <div className="mt-12">
            <a href="https://app.grantedai.com" className="px-6 py-3 rounded-md bg-yellow-400 text-black font-semibold hover:bg-yellow-300 border border-yellow-500 shadow">Start Writing</a>
          </div>
        </div>
      </section>

      {/* Section: quality of ideas */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-20 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-[34px] md:text-[44px] font-extrabold leading-tight">{h2}</h2>
            <p className="mt-5 text-gray-700 max-w-xl text-[16px] md:text-[18px]">
              Instantly generate high-quality drafts for a wide range of grant proposals, appeals, letters of support, articles, and more, just by entering simple information about your project.
            </p>
            <div className="mt-6">
              <a href="/features" className="inline-flex items-center gap-2 px-4 py-2 rounded-md border font-medium hover:bg-white">Discover more features <span aria-hidden>→</span></a>
            </div>
          </div>
          <div className="text-center">
            <img src="/images/imgi_7_img1.jpg" alt="Granted" width="520" height="560" className="mx-auto rounded-xl" />
          </div>
        </div>
      </section>

      {/* Section: donor appeal to NIH R01 */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-16 grid md:grid-cols-2 gap-16 items-start">
          <div className="order-2 md:order-1 text-center">
            <img src="/images/imgi_9_img3.jpg" alt="Use cases" width="460" height="540" className="mx-auto rounded-xl" />
          </div>
          <div className="order-1 md:order-2">
            <h3 className="text-[30px] md:text-[36px] font-extrabold leading-tight">{h3}</h3>
            <ul className="mt-6 text-gray-700 space-y-2 list-disc pl-5 text-[16px] md:text-[18px]">
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

      {/* Section: 3 Steps */}
      <section className="bg-black text-white">
        <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-24">
          <h2 className="text-[36px] md:text-[56px] font-extrabold text-center">3 Steps To Your Fastest Funding Ever</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="rounded-[28px] bg-white/95 text-black p-8 shadow border border-gray-200">
              <div className="text-4xl font-extrabold text-yellow-400">1</div>
              <div className="mt-4 font-semibold">Create a new project.</div>
              <p className="mt-2 text-gray-600">Enter your mission statement and describe your work.</p>
            </div>
            <div className="rounded-[28px] bg-white/95 text-black p-8 shadow border border-gray-200">
              <div className="text-4xl font-extrabold text-yellow-400">2</div>
              <div className="mt-4 font-semibold">Select a model and complete the prompt.</div>
              <p className="mt-2 text-gray-600">Each of the 50+ models require some essential information, such as key personnel, values, funding request amount, and project description.</p>
            </div>
            <div className="rounded-[28px] bg-white/95 text-black p-8 shadow border border-gray-200">
              <div className="text-4xl font-extrabold text-yellow-400">3</div>
              <div className="mt-4 font-semibold">Watch as Granted creates a quality draft in seconds.</div>
              <p className="mt-2 text-gray-600">Pick your favorite draft and go. Or copy it into a larger document in the editor to assemble your full proposal.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Level the playing field */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-24 grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1 text-center">
            <img src="/images/imgi_8_img2.jpg" alt="Equity" width="520" height="520" className="mx-auto rounded-xl" />
          </div>
          <div className="order-1 md:order-2">
            <h2 className="text-[34px] md:text-[54px] font-extrabold leading-tight">Level the fundraising playing field.</h2>
            <p className="mt-6 text-gray-700 max-w-xl">The fundraising game isn't fair. The submission and selection process has well-known equity issues that disproportionately affect the careers of women, minorities, and non-native English speakers.</p>
            <p className="mt-4 text-gray-700 max-w-xl">Granted's mission is to make fundraising less tedious, more accessible, and more successful for everyone &mdash; while freeing up millions of additional hours of productivity.</p>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-black">
        <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-28">
          <div className="mx-auto max-w-5xl rounded-[24px] p-10 md:p-16 shadow-lg brand-cta-gradient">
            <h3 className="text-[34px] md:text-[54px] font-extrabold text-black text-center">Ready to Get Granted?</h3>
            <p className="mt-4 text-black/80 text-center text-lg">Save time. Stop frustration. Get inspired. Start your free trial today.</p>
            <div className="mt-10 flex justify-center">
              <a href="https://app.grantedai.com" className="px-6 py-3 rounded-md bg-black text-white font-semibold hover:opacity-90 border border-black">Start Writing</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
