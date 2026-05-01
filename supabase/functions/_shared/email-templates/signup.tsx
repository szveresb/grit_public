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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => {
  const hu = isHungarian(siteUrl)
  return (
    <Html lang={hu ? 'hu' : 'en'} dir="ltr">
      <Head />
      <Preview>
        {hu
          ? `Erősítsd meg az e-mail-címed a ${siteName} oldalon`
          : `Confirm your email for ${siteName}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brandMark}>🌿 grit.hu</Text>
          <Heading style={h1}>
            {hu ? 'Üdv nálunk 🌱' : 'Welcome 🌱'}
          </Heading>
          <Text style={text}>
            {hu
              ? `Köszönjük, hogy csatlakoztál a ${siteName} közösségéhez. Erősítsd meg az e-mail-címed (${recipient}), hogy biztonságban tartsuk a fiókod.`
              : `Thanks for joining ${siteName}. Please confirm your email (${recipient}) so we can keep your account safe.`}
          </Text>
          <Button style={button} href={confirmationUrl}>
            {hu ? 'E-mail megerősítése' : 'Confirm email'}
          </Button>
          <Text style={footer}>
            {hu
              ? 'Ha nem te regisztráltál, nyugodtan hagyd figyelmen kívül ezt az üzenetet.'
              : "If you didn't sign up, you can safely ignore this email."}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default SignupEmail
