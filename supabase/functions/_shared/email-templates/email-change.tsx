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

interface EmailChangeEmailProps {
  siteName: string
  siteUrl?: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  siteUrl,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => {
  const hu = isHungarian(siteUrl)
  return (
    <Html lang={hu ? 'hu' : 'en'} dir="ltr">
      <Head />
      <Preview>
        {hu
          ? `Erősítsd meg az e-mail-cím változtatást — ${siteName}`
          : `Confirm your email change — ${siteName}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brandMark}>🌿 grit.hu</Text>
          <Heading style={h1}>
            {hu ? 'E-mail-cím változtatás' : 'Confirm your email change'}
          </Heading>
          <Text style={text}>
            {hu ? (
              <>
                E-mail-cím változtatást kértél a {siteName} oldalon:{' '}
                <Link href={`mailto:${oldEmail}`} style={link}>
                  {oldEmail}
                </Link>{' '}
                →{' '}
                <Link href={`mailto:${newEmail}`} style={link}>
                  {newEmail}
                </Link>
                .
              </>
            ) : (
              <>
                You requested to change your email for {siteName} from{' '}
                <Link href={`mailto:${oldEmail}`} style={link}>
                  {oldEmail}
                </Link>{' '}
                to{' '}
                <Link href={`mailto:${newEmail}`} style={link}>
                  {newEmail}
                </Link>
                .
              </>
            )}
          </Text>
          <Button style={button} href={confirmationUrl}>
            {hu ? 'Változtatás megerősítése' : 'Confirm email change'}
          </Button>
          <Text style={footer}>
            {hu
              ? 'Ha nem te kérted, kérjük, azonnal biztonsítsd a fiókod.'
              : "If you didn't request this, please secure your account immediately."}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default EmailChangeEmail
