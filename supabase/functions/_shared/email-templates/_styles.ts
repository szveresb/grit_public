// Shared brand styles for Grit.hu auth email templates.
// Tokens mirror src/index.css (sage primary, soft cream surfaces, Quicksand).

export const brand = {
  primary: 'hsl(143, 28%, 44%)',
  primaryForeground: 'hsl(48, 20%, 97%)',
  foreground: 'hsl(146, 15%, 24%)',
  muted: 'hsl(140, 8%, 48%)',
  surface: 'hsl(48, 24%, 95%)',
  border: 'hsl(120, 17%, 84%)',
  radius: '20px',
  fontStack:
    "'Quicksand', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
}

export const main = {
  backgroundColor: '#ffffff',
  fontFamily: brand.fontStack,
  margin: 0,
  padding: '32px 0',
}

export const container = {
  maxWidth: '520px',
  margin: '0 auto',
  padding: '32px 28px',
  backgroundColor: brand.surface,
  borderRadius: brand.radius,
  border: `1px solid ${brand.border}`,
}

export const brandMark = {
  fontSize: '14px',
  fontWeight: 600 as const,
  color: brand.primary,
  letterSpacing: '0.02em',
  margin: '0 0 24px',
}

export const h1 = {
  fontSize: '22px',
  fontWeight: 700 as const,
  color: brand.foreground,
  margin: '0 0 16px',
  lineHeight: '1.3',
}

export const text = {
  fontSize: '15px',
  color: brand.foreground,
  lineHeight: '1.6',
  margin: '0 0 20px',
}

export const button = {
  backgroundColor: brand.primary,
  color: brand.primaryForeground,
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '999px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}

export const link = { color: brand.primary, textDecoration: 'underline' }

export const codeBox = {
  display: 'inline-block',
  fontSize: '24px',
  fontWeight: 700 as const,
  letterSpacing: '0.3em',
  color: brand.foreground,
  backgroundColor: '#ffffff',
  border: `1px solid ${brand.border}`,
  borderRadius: '12px',
  padding: '14px 22px',
  margin: '8px 0 24px',
}

export const footer = {
  fontSize: '12px',
  color: brand.muted,
  lineHeight: '1.5',
  margin: '28px 0 0',
}

export const divider = {
  borderTop: `1px solid ${brand.border}`,
  margin: '24px 0',
}

// Detect Hungarian-speaking recipients from siteName/siteUrl.
// Default to Hungarian — grit.hu is a Hungarian-first project.
export const isHungarian = (siteUrl?: string) => {
  if (!siteUrl) return true
  return !siteUrl.includes('/en') && !siteUrl.endsWith('.com')
}
