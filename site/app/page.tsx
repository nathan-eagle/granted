export default function Home() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">Get Funded Faster</h1>
          <p className="mt-4 text-lg text-gray-600">Granted gives you more time for the real work with 10x grant writing.</p>
          <div className="mt-8 flex gap-4">
            <a href="https://app.grantedai.com" className="px-5 py-3 rounded-md bg-sky-500 text-white font-medium">Sign up</a>
            <a href="/features" className="px-5 py-3 rounded-md border font-medium">See features</a>
          </div>
        </div>
        <div className="rounded-lg border bg-white/50 p-6">
          <div className="aspect-video bg-gray-100 rounded-md" />
        </div>
      </div>
    </section>
  )
}

