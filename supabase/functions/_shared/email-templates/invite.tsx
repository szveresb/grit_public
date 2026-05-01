/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
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
  link,
  isHungarian,
} from './_styles.ts'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => {
  const hu = isHungarian(siteUrl)
  return (
    <Html lang={hu ? 'hu' : 'en'} dir="ltr">
      <Head />
      <Preview>
        {hu
          ? `Meghívót kaptál a ${siteName} oldalra`
          : `You've been invited to ${siteName}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brandMark}>🌿 grit.hu</Text>
          <Heading style={h1}>
            {hu ? 'Meghívót kaptál 🌱' : "You've been invited 🌱"}
          </Heading>
          <Text style={text}>
            {hu ? (
              <>
                Csatlakozz a{' '}
                <Link href={siteUrl} style={link}>
                  <strong>{siteName}</strong>
                </Link>{' '}
                közösségéhez. Kattints a gombra a meghívó elfogadásához és a fiókod létrehozásához.
              </>
            ) : (
              <>
                You've been invited to join{' '}
                <Link href={siteUrl} style={link}>
                  <strong>{siteName}</strong>
                </Link>
                . Click the button to accept and create your account.
              </>
            )}
          </Text>
          <Button style={button} href={confirmationUrl}>
            {hu ? 'Meghívó elfogadása' : 'Accept invitation'}
          </Button>
          <Text style={footer}>
            {hu
              ? 'Ha nem vártál meghívót, nyugodtan hagyd figyelmen kívül ezt az üzenetet.'
              : "If you weren't expecting this, you can safely ignore this email."}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default InviteEmail
