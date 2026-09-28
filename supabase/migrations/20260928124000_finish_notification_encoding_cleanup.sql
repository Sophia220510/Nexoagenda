update public.notification_events
set
  title = replace(title, 'serviÃ§o', 'serviço'),
  message = replace(message, 'serviÃ§o', 'serviço')
where title like '%serviÃ§o%'
   or message like '%serviÃ§o%';
