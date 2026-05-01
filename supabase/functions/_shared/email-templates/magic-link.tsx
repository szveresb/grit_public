/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

import {
  main,
  container,
  brandMark,
  h1,
  text,
  button,
  footer,
  isHungarian,
} from './_styles.ts'

interface MagicLinkEmailProps {
  siteName: string
  siteUrl?: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: MagicLinkEmailProps) => {
  const hu = isHungarian(siteUrl)
  return (
    <Html lang={hu ? 'hu' : 'en'} dir="ltr">
      <Head />
      <Preview>
        {hu
          ? `Belépési linked a ${siteName} oldalra`
          : `Your login link for ${siteName}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brandMark}>🌿 grit.hu</Text>
          <Heading style={h1}>
            {hu ? 'Belépési linked' : 'Your login link'}
          </Heading>
          <Text style={text}>
            {hu
              ? `Kattints a gombra a ${siteName} oldalra való belépéshez. A link rövid időn belül lejár.`
              : `Click the button to sign in to ${siteName}. This link will expire shortly.`}
          </Text>
          <Button style={button} href={confirmationUrl}>
            {hu ? 'Belépés' : 'Sign in'}
          </Button>
          <Text style={footer}>
            {hu
              ? 'Ha nem te kérted, hagyd figyelmen kívül.'
              : "If you didn't request this, you can safely ignore this email."}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default MagicLinkEmail
