import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://open-world-baltimore.vercel.app'
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    { url: `${base}/play`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
  ]
}
