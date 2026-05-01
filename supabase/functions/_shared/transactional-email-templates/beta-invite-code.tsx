import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Grit.hu'
const REDEEM_BASE_URL = 'https://grit.hu/beta-gate'

interface BetaInviteCodeProps {
  name?: string
  code?: string
  locale?: 'hu' | 'en'
}

const copy = {
  hu: {
    preview: (code: string) => `A te Grit.hu beta meghívókódod: ${code}`,
    greeting: (name?: string) =>
      name ? `Szia ${name}!` : 'Szia!',
    intro:
      'Köszönjük, hogy jelentkeztél a Grit.hu zárt béta tesztjére. Itt a személyes meghívókódod:',
    cta: 'Belépés a platformra',
    note:
      'A kód egyszer használható és a fiókodhoz lesz társítva, amikor beváltod. Bejelentkezés vagy regisztráció után kérjük, illeszd be a kódot a beléptető oldalon.',
    footer: `Üdvözlettel, a ${SITE_NAME} csapata`,
    subject: 'A Grit.hu béta meghívókódod',
  },
  en: {
    preview: (code: string) => `Your Grit.hu beta invite code: ${code}`,
    greeting: (name?: string) =>
      name ? `Hi ${name},` : 'Hi there,',
    intro:
      "Thanks for signing up for the Grit.hu closed beta. Here's your personal invite code:",
    cta: 'Enter the platform',
    note:
      'This code can be used once and will be tied to your account when you redeem it. After signing up or signing in, paste the code on the access page.',
    footer: `Warmly, the ${SITE_NAME} team`,
    subject: 'Your Grit.hu beta invite code',
  },
} as const

const BetaInviteCodeEmail = ({
  name,
  code = 'BETA-XXXXXX',
  locale = 'hu',
}: BetaInviteCodeProps) => {
  const t = copy[locale === 'en' ? 'en' : 'hu']
  const redeemUrl = `${REDEEM_BASE_URL}?code=${encodeURIComponent(code)}`

  return (
    <Html lang={locale === 'en' ? 'en' : 'hu'} dir="ltr">
      <Head />
      <Preview>{t.preview(code)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>🌿 {SITE_NAME}</Text>
          <Heading style={h1}>{t.greeting(name)}</Heading>
          <Text style={text}>{t.intro}</Text>

          <Section style={codeBox}>
            <Text style={codeText}>{code}</Text>
          </Section>

          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button style={button} href={redeemUrl}>
              {t.cta}
            </Button>
          </Section>

          <Text style={note}>{t.note}</Text>
          <Text style={footer}>{t.footer}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: BetaInviteCodeEmail,
  subject: (data: Record<string, any>) =>
    (data?.locale === 'en' ? copy.en : copy.hu).subject,
  displayName: 'Beta invite code',
  previewData: { name: 'Anna', code: 'BETA-A1B2C3', locale: 'hu' },
} satisfies TemplateEntry

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}
const container: React.CSSProperties = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 28px',
}
const brand: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#7a8b6f',
  margin: '0 0 24px',
}
const h1: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#1a1a1a',
  margin: '0 0 16px',
  lineHeight: 1.3,
}
const text: React.CSSProperties = {
  fontSize: '15px',
  color: '#3d3d3d',
  lineHeight: 1.6,
  margin: '0 0 20px',
}
const codeBox: React.CSSProperties = {
  backgroundColor: '#f4f6f1',
  border: '1px solid #d8dfd0',
  borderRadius: '20px',
  padding: '24px',
  textAlign: 'center',
  margin: '24px 0',
}
const codeText: React.CSSProperties = {
  fontFamily:
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: '22px',
  fontWeight: 700,
  letterSpacing: '0.18em',
  color: '#1a1a1a',
  margin: 0,
}
const button: React.CSSProperties = {
  backgroundColor: '#5a7050',
  color: '#ffffff',
  padding: '13px 28px',
  borderRadius: '999px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 600,
  display: 'inline-block',
}
const note: React.CSSProperties = {
  fontSize: '13px',
  color: '#6b6b6b',
  lineHeight: 1.55,
  margin: '24px 0 16px',
}
const footer: React.CSSProperties = {
  fontSize: '13px',
  color: '#9a9a9a',
  margin: '32px 0 0',
}
