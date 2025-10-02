export function getBaseUrl(headers: Headers): string {
  const host = headers.get("x-forwarded-host") || headers.get("host") || "localhost:3000"
  const proto = headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https")
  return `${proto}://${host}`
}
