-- Bell controls whether chat push notifications are sent for a subscription.

ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT false;

UPDATE push_subscriptions
SET notifications_enabled = true
WHERE notifications_enabled = false;
