import Link from 'next/link'
import { listPosts } from '@/lib/blog'

export const dynamic = 'force-static'

export default async function BlogIndex() {
  const posts = await listPosts().catch(() => [])
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Blog</h1>
      <div className="space-y-4">
        {posts.map(p => (
          <article key={p.slug} className="border rounded-md p-4">
            <Link href={`/blog/${p.slug}`} className="text-lg font-semibold">
              {p.frontmatter.title || p.slug}
            </Link>
            {p.frontmatter.description && (
              <p className="text-sm text-gray-600 mt-1">{p.frontmatter.description}</p>
            )}
            {p.frontmatter.date && (
              <div className="text-xs text-gray-500 mt-2">{new Date(p.frontmatter.date).toLocaleDateString()}</div>
            )}
          </article>
        ))}
        {posts.length === 0 && <div className="text-gray-600">No posts yet.</div>}
      </div>
    </section>
  )}

