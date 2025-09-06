import ContactForm from '@/components/ContactForm'

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Contact</h1>
      <ContactForm />
      <p className="text-sm text-gray-500 mt-4">We’ll route messages to info@grantedai.com.</p>
    </section>
  )
}
