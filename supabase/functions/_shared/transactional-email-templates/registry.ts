/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as betaInviteCode } from './beta-invite-code.tsx'
import { template as betaApplicationConfirmation } from './beta-application-confirmation.tsx'
import { template as betaApplicationAdminNotice } from './beta-application-admin-notice.tsx'
import { template as uptimeAlert } from './uptime-alert.tsx'
import { template as uptimeRecovered } from './uptime-recovered.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'beta-invite-code': betaInviteCode,
  'beta-application-confirmation': betaApplicationConfirmation,
  'beta-application-admin-notice': betaApplicationAdminNotice,
  'uptime-alert': uptimeAlert,
  'uptime-recovered': uptimeRecovered,
}
