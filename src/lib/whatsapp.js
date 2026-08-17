export function getWhatsAppUrl(text) {
  const configuredUrl = import.meta.env.VITE_WHATSAPP_URL?.trim()
  if (!configuredUrl) return null

  try {
    const url = new URL(configuredUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    url.searchParams.set('text', text)
    return url.toString()
  } catch {
    return null
  }
}
