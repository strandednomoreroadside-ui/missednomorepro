# Missed No More Form Bridge

Companion WordPress plugin for the live Stranded No More service-request form.

It does not replace or edit the existing `snm-service-request-form` plugin. It hooks the same form POST at priority `9`, verifies the same nonce and honeypot, sends the structured request to Missed No More Pro, then lets the existing plugin continue sending the dispatch email and redirecting the visitor.

## Configure

Set these constants server-side, preferably in `wp-config.php` or host-managed WordPress constants:

```php
define('MNM_SERVICE_REQUEST_ENDPOINT', 'https://missednomorepro.com/api/forms/service-request');
define('MNM_SERVICE_REQUEST_TOKEN', 'paste-private-token-here');
```

The token must match a SHA-256 digest stored in `public.form_integrations` for the correct Missed No More tenant/business. Do not expose it in public JavaScript.

## Deploy

1. Deploy the Missed No More app route and database migration first.
2. Provision a private token for Stranded No More and insert only its SHA-256 digest into `form_integrations`.
3. Back up the current WordPress plugin directory.
4. Upload and activate this companion plugin.
5. Submit one live test only after approving real email/SMS delivery.

Webhook failures do not block the current dispatch email. Failed webhook attempts are queued in a bounded WordPress option and retried with WP-Cron.
