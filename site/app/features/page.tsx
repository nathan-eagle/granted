export default function FeaturesPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Features</h1>
      <ul className="grid md:grid-cols-2 gap-6">
        <li className="border rounded-md p-4">AI-assisted section drafting</li>
        <li className="border rounded-md p-4">Templates for NIH/NSF/SBIR</li>
        <li className="border rounded-md p-4">Reviewer-style feedback</li>
        <li className="border rounded-md p-4">Collaboration & versioning</li>
      </ul>
    </section>
  )
}

