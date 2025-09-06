import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import { getPost, hasPost, listPosts } from '@/lib/blog'

type Params = { params: { slug: string } }

export async function generateStaticParams() {
  const posts = await listPosts().catch(() => [])
  return posts.map(p => ({ slug: p.slug }))
}

export default async function BlogPost({ params }: Params) {
  const exists = await hasPost(params.slug)
  if (!exists) return notFound()
  const { frontmatter, content } = await getPost(params.slug)
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h1>{frontmatter.title || params.slug}</h1>
      <MDXRemote source={content} options={{ mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug] } }} />
    </section>
  )
}
