-- Existing customers already had access to the complete product before
-- operation profiles were introduced. Keep that access intact; presets apply
-- to companies created or explicitly reconfigured from this point forward.
update public.businesses
set
  operation_profile = 'STRUCTURED_OPERATION',
  feature_flags = '{
    "team_management": true,
    "reception": true,
    "commissions": true,
    "waitlist": true,
    "cash_closing": true,
    "advanced_reports": true,
    "whatsapp_reminders": true
  }'::jsonb;
