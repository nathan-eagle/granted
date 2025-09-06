export default function PricingPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Pricing</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="border rounded-md p-6">
          <div className="font-semibold">Starter</div>
          <div className="text-3xl font-bold my-2">$0</div>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>Basic templates</li>
            <li>Limited AI generations</li>
          </ul>
        </div>
        <div className="border rounded-md p-6">
          <div className="font-semibold">Pro</div>
          <div className="text-3xl font-bold my-2">$29</div>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>Full templates</li>
            <li>Priority AI models</li>
          </ul>
        </div>
        <div className="border rounded-md p-6">
          <div className="font-semibold">Team</div>
          <div className="text-3xl font-bold my-2">$99</div>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>Collaboration</li>
            <li>Shared libraries</li>
          </ul>
        </div>
      </div>
    </section>
  )
}

