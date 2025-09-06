import type { MetadataRoute } from 'next'
import { listPosts } from '@/lib/blog'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://grantedai.com'
  const staticPaths: MetadataRoute.Sitemap = [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/features` },
    { url: `${base}/pricing` },
    { url: `${base}/faq` },
    { url: `${base}/tech` },
    { url: `${base}/contact` },
    { url: `${base}/blog` },
  ]
  const posts = await listPosts().catch(() => [])
  const blogPaths: MetadataRoute.Sitemap = posts.map(p => ({ url: `${base}/blog/${p.slug}` }))
  return [...staticPaths, ...blogPaths]
}

