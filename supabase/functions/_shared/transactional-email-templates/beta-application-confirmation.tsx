import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Grit.hu'

interface Props { name?: string; locale?: 'hu' | 'en' }

const copy = {
  hu: {
    preview: 'Megkaptuk a béta jelentkezésedet',
    greeting: (n?: string) => (n ? `Szia ${n}!` : 'Szia!'),
    intro: 'Köszönjük, hogy jelentkeztél a Grit.hu zárt béta tesztjére. Megkaptuk a jelentkezésedet és hamarosan jelentkezünk a meghívókóddal.',
    note: 'A meghívókat manuálisan küldjük ki, ezért egy kis türelmet kérünk.',
    footer: `Üdvözlettel, a ${SITE_NAME} csapata`,
    subject: 'Megkaptuk a béta jelentkezésedet',
  },
  en: {
    preview: 'We received your beta application',
    greeting: (n?: string) => (n ? `Hi ${n},` : 'Hi there,'),
    intro: "Thanks for applying to the Grit.hu closed beta. We've received your application and will follow up with your invite code shortly.",
    note: 'Invites are sent out manually, so please bear with us for a little while.',
    footer: `Warmly, the ${SITE_NAME} team`,
    subject: 'We received your beta application',
  },
} as const

const Email = ({ name, locale = 'hu' }: Props) => {
  const t = copy[locale === 'en' ? 'en' : 'hu']
  return (
    <Html lang={locale} dir="ltr">
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>🌿 {SITE_NAME}</Text>
          <Heading style={h1}>{t.greeting(name)}</Heading>
          <Text style={text}>{t.intro}</Text>
          <Text style={note}>{t.note}</Text>
          <Text style={footer}>{t.footer}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => (d?.locale === 'en' ? copy.en : copy.hu).subject,
  displayName: 'Beta application confirmation',
  previewData: { name: 'Anna', locale: 'hu' },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '32px 28px' }
const brand: React.CSSProperties = { fontSize: '13px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7a8b6f', margin: '0 0 24px' }
const h1: React.CSSProperties = { fontSize: '24px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px', lineHeight: 1.3 }
const text: React.CSSProperties = { fontSize: '15px', color: '#3d3d3d', lineHeight: 1.6, margin: '0 0 20px' }
const note: React.CSSProperties = { fontSize: '13px', color: '#6b6b6b', lineHeight: 1.55, margin: '24px 0 16px' }
const footer: React.CSSProperties = { fontSize: '13px', color: '#9a9a9a', margin: '32px 0 0' }
