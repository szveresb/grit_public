import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Grit.hu'
const ADMIN_EMAIL = 'hello@grit.hu'
const ADMIN_URL = 'https://grit.hu/manage-users'

interface Props { applicantEmail?: string; applicantName?: string; locale?: string; createdAt?: string }

const Email = ({ applicantEmail, applicantName, locale, createdAt }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New beta application: {applicantEmail ?? 'unknown'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>🌿 {SITE_NAME} — Admin</Text>
        <Heading style={h1}>New beta application</Heading>
        <Section style={box}>
          <Row label="Email" value={applicantEmail ?? '—'} />
          <Row label="Name" value={applicantName ?? '—'} />
          <Row label="Locale" value={locale ?? '—'} />
          <Row label="Submitted" value={createdAt ?? new Date().toISOString()} />
        </Section>
        <Text style={text}>
          Open the admin panel to review and send an invite code:{' '}
          <a href={ADMIN_URL} style={{ color: '#5a7050' }}>{ADMIN_URL}</a>
        </Text>
      </Container>
    </Body>
  </Html>
)

const Row = ({ label, value }: { label: string; value: string }) => (
  <Text style={rowText}>
    <strong style={{ color: '#1a1a1a' }}>{label}:</strong> {value}
  </Text>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `New beta application — ${d?.applicantEmail ?? 'unknown'}`,
  to: ADMIN_EMAIL,
  displayName: 'Beta application — admin notice',
  previewData: { applicantEmail: 'someone@example.com', applicantName: 'Anna', locale: 'hu', createdAt: new Date().toISOString() },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '32px 28px' }
const brand: React.CSSProperties = { fontSize: '13px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7a8b6f', margin: '0 0 24px' }
const h1: React.CSSProperties = { fontSize: '22px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px' }
const text: React.CSSProperties = { fontSize: '14px', color: '#3d3d3d', lineHeight: 1.6, margin: '20px 0 0' }
const box: React.CSSProperties = { backgroundColor: '#f4f6f1', border: '1px solid #d8dfd0', borderRadius: '16px', padding: '20px 24px', margin: '8px 0 0' }
const rowText: React.CSSProperties = { fontSize: '14px', color: '#3d3d3d', margin: '4px 0', lineHeight: 1.5 }
