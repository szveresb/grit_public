import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Grit.hu'
const ADMIN_EMAIL = 'szveresb@gmail.com'

interface Props {
  downtimeMinutes?: number
  downSince?: string
  recoveredAt?: string
}

const Email = ({ downtimeMinutes, downSince, recoveredAt }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>✅ {SITE_NAME} is back online</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>🌿 {SITE_NAME} — Uptime alert</Text>
        <Heading style={h1}>✅ Site is back online</Heading>
        <Text style={text}>
          The automated health monitor confirms <strong>{SITE_NAME}</strong> is responding normally again.
        </Text>
        <Text style={text}>
          <strong>Down since:</strong> {downSince ?? '—'}<br />
          <strong>Recovered at:</strong> {recoveredAt ?? new Date().toISOString()}<br />
          <strong>Total downtime:</strong> ~{downtimeMinutes ?? 0} minute(s)
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: '✅ Grit.hu is back online',
  to: ADMIN_EMAIL,
  displayName: 'Uptime recovered (admin)',
  previewData: {
    downtimeMinutes: 12,
    downSince: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    recoveredAt: new Date().toISOString(),
  },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '32px 28px' }
const brand: React.CSSProperties = { fontSize: '13px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7a8b6f', margin: '0 0 24px' }
const h1: React.CSSProperties = { fontSize: '22px', fontWeight: 700, color: '#3d6b3d', margin: '0 0 16px' }
const text: React.CSSProperties = { fontSize: '14px', color: '#3d3d3d', lineHeight: 1.6, margin: '12px 0' }
