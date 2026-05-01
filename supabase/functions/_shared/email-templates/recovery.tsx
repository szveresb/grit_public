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

interface RecoveryEmailProps {
  siteName: string
  siteUrl?: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: RecoveryEmailProps) => {
  const hu = isHungarian(siteUrl)
  return (
    <Html lang={hu ? 'hu' : 'en'} dir="ltr">
      <Head />
      <Preview>
        {hu
          ? `Jelszó visszaállítása — ${siteName}`
          : `Reset your password — ${siteName}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brandMark}>🌿 grit.hu</Text>
          <Heading style={h1}>
            {hu ? 'Új jelszó beállítása' : 'Reset your password'}
          </Heading>
          <Text style={text}>
            {hu
              ? `Kérelmet kaptunk a jelszavad visszaállítására a ${siteName} oldalon. Kattints a gombra, és válassz új jelszót.`
              : `We received a request to reset your password for ${siteName}. Click below to choose a new one.`}
          </Text>
          <Button style={button} href={confirmationUrl}>
            {hu ? 'Jelszó visszaállítása' : 'Reset password'}
          </Button>
          <Text style={footer}>
            {hu
              ? 'Ha nem te kérted, hagyd figyelmen kívül — a jelszavad változatlan marad.'
              : "If you didn't request this, you can ignore this email — your password won't change."}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default RecoveryEmail
