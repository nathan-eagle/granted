export default function Home() {
  return (
    <div className="">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-sky-50">
        <div className="mx-auto max-w-7xl px-6 md:px-8 py-16 md:py-24">
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div>
              <p className="font-bellota text-sky-600 text-sm tracking-wider uppercase">AI Proposal Writing</p>
              <h1 className="mt-2 text-4xl md:text-6xl font-bold leading-tight">Granted AI — Get Funded Faster.</h1>
              <p className="mt-5 text-lg md:text-xl text-gray-600 max-w-xl">Granted gives you more time for the real work with 10x grant writing. Templates for NIH, NSF, and SBIR with reviewer-aligned AI drafts.</p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a href="https://app.grantedai.com" className="px-6 py-3 rounded-md bg-sky-500 text-white font-medium shadow-sm hover:bg-sky-600">Start free</a>
                <a href="/features" className="px-6 py-3 rounded-md border font-medium hover:bg-white">See features</a>
              </div>
              <p className="mt-3 text-xs text-gray-500">No credit card required.</p>
            </div>
            <div className="relative">
              <div className="rounded-xl border bg-white shadow-sm p-4 md:p-6">
                <img src="/images/img4-1.jpg" alt="Granted preview" className="rounded-lg w-full h-auto" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto max-w-7xl px-6 md:px-8 py-12 md:py-16">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-lg border p-6">
            <div className="font-semibold">Reviewer-aligned drafts</div>
            <p className="mt-2 text-sm text-gray-600">Prompts tuned for NIH/NSF/SBIR criteria yield focused, scorable writing.</p>
          </div>
          <div className="rounded-lg border p-6">
            <div className="font-semibold">Templates that work</div>
            <p className="mt-2 text-sm text-gray-600">Battle-tested outlines for Specific Aims, Significance, Approach, and more.</p>
          </div>
          <div className="rounded-lg border p-6">
            <div className="font-semibold">Faster revisions</div>
            <p className="mt-2 text-sm text-gray-600">Iterate with guided edits and mock-review feedback to raise scores.</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 md:px-8 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold">How it works</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="rounded-lg border p-6">
              <div className="text-sm font-semibold text-sky-700">1. Pick a template</div>
              <p className="mt-2 text-sm text-gray-600">NIH, NSF, or SBIR. Choose Specific Aims, Significance, Approach, and more.</p>
            </div>
            <div className="rounded-lg border p-6">
              <div className="text-sm font-semibold text-sky-700">2. Add project details</div>
              <p className="mt-2 text-sm text-gray-600">Provide your aims, innovation, team, and impact. We structure it for reviewers.</p>
            </div>
            <div className="rounded-lg border p-6">
              <div className="text-sm font-semibold text-sky-700">3. Generate & refine</div>
              <p className="mt-2 text-sm text-gray-600">Produce a strong draft, then iterate with reviewer-style feedback.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-sky-50 border-t border-b">
        <div className="mx-auto max-w-7xl px-6 md:px-8 py-12 md:py-14 text-center">
          <h3 className="text-2xl font-bold">Write stronger grants in less time</h3>
          <p className="mt-2 text-gray-600">Join researchers and founders accelerating proposals with Granted.</p>
          <div className="mt-6 flex justify-center gap-4">
            <a href="https://app.grantedai.com" className="px-6 py-3 rounded-md bg-sky-500 text-white font-medium shadow-sm hover:bg-sky-600">Get started</a>
            <a href="/pricing" className="px-6 py-3 rounded-md border font-medium">See pricing</a>
          </div>
        </div>
      </section>
    </div>
  )
}
