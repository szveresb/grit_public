import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Grit.hu'
const ADMIN_EMAIL = 'szveresb@gmail.com'

interface Props {
  failedTargets?: Array<{ target: string; error: string; httpStatus?: number | null }>
  consecutiveFailures?: number
  detectedAt?: string
}

const Email = ({ failedTargets, consecutiveFailures, detectedAt }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>🚨 {SITE_NAME} health check failed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>🌿 {SITE_NAME} — Uptime alert</Text>
        <Heading style={h1}>🚨 Site appears to be down</Heading>
        <Text style={text}>
          The automated health monitor detected a failure at{' '}
          <strong>{detectedAt ?? new Date().toISOString()}</strong>
          {consecutiveFailures && consecutiveFailures > 1
            ? ` (${consecutiveFailures} consecutive failures).`
            : '.'}
        </Text>
        <Section style={box}>
          {(failedTargets ?? []).map((t, i) => (
            <Text key={i} style={rowText}>
              <strong style={{ color: '#8b2e2e' }}>{t.target}</strong>
              {t.httpStatus ? ` — HTTP ${t.httpStatus}` : ''}
              <br />
              <span style={{ color: '#666' }}>{t.error}</span>
            </Text>
          ))}
        </Section>
        <Text style={text}>
          You will receive a follow-up email when the site recovers.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: '🚨 Grit.hu uptime alert — site appears down',
  to: ADMIN_EMAIL,
  displayName: 'Uptime alert (admin)',
  previewData: {
    failedTargets: [
      { target: 'https://grit.hu', error: 'fetch timeout after 10s', httpStatus: null },
      { target: 'https://www.grit.hu', error: 'HTTP 503', httpStatus: 503 },
    ],
    consecutiveFailures: 1,
    detectedAt: new Date().toISOString(),
  },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '32px 28px' }
const brand: React.CSSProperties = { fontSize: '13px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7a8b6f', margin: '0 0 24px' }
const h1: React.CSSProperties = { fontSize: '22px', fontWeight: 700, color: '#8b2e2e', margin: '0 0 16px' }
const text: React.CSSProperties = { fontSize: '14px', color: '#3d3d3d', lineHeight: 1.6, margin: '12px 0' }
const box: React.CSSProperties = { backgroundColor: '#fbf1f1', border: '1px solid #e8c5c5', borderRadius: '16px', padding: '20px 24px', margin: '12px 0' }
const rowText: React.CSSProperties = { fontSize: '14px', color: '#3d3d3d', margin: '8px 0', lineHeight: 1.5 }