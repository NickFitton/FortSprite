import * as Sentry from '@sentry/tanstackstart-react'
import { sentryOptions } from './sentry-options'

if (!Sentry.getClient()) {
  Sentry.init(sentryOptions)
}
