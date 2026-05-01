/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
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
  footer,
  codeBox,
  isHungarian,
} from './_styles.ts'

interface ReauthenticationEmailProps {
  token: string
  siteUrl?: string
}

export const ReauthenticationEmail = ({
  token,
  siteUrl,
}: ReauthenticationEmailProps) => {
  const hu = isHungarian(siteUrl)
  return (
    <Html lang={hu ? 'hu' : 'en'} dir="ltr">
      <Head />
      <Preview>
        {hu ? 'Megerősítő kódod' : 'Your verification code'}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brandMark}>🌿 grit.hu</Text>
          <Heading style={h1}>
            {hu ? 'Megerősítő kód' : 'Confirm reauthentication'}
          </Heading>
          <Text style={text}>
            {hu
              ? 'Add meg az alábbi kódot a személyazonosságod megerősítéséhez:'
              : 'Use the code below to confirm your identity:'}
          </Text>
          <Text style={codeBox}>{token}</Text>
          <Text style={footer}>
            {hu
              ? 'A kód rövid időn belül lejár. Ha nem te kérted, hagyd figyelmen kívül ezt az üzenetet.'
              : "This code will expire shortly. If you didn't request this, you can safely ignore this email."}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default ReauthenticationEmail
