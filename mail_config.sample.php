<?php
/* ============================================================
   Jehan Holding Group — Email (SMTP) configuration
   ============================================================
   HOW TO USE (one time):
   1. Copy this file and name the copy  mail_config.php
   2. Put mail_config.php in the folder named  jehan_data
      that sits NEXT TO public_html (one level above it):
        /home/uXXXXXXXXX/domains/jehanreadymix.com/jehan_data/mail_config.php
      (That folder already exists — it's where quote data is stored.)
   3. Replace REPLACE_WITH_MAILBOX_PASSWORD below with the real
      password of the Info@Jehanreadymix.com mailbox.
   4. Save. Done — the website will now send email via SMTP.

   NOTE: Never commit the real mail_config.php to GitHub. It is
   ignored by .gitignore and lives outside public_html so it is
   never web-accessible and never wiped by a deploy.
   ============================================================ */

return array(
  'host'       => 'smtp.hostinger.com',
  'port'       => 465,                 // 465 = SSL (recommended). Use 587 for TLS.
  'secure'     => 'ssl',               // 'ssl' for 465, or 'tls' for 587
  'user'       => 'Info@Jehanreadymix.com',
  'pass'       => 'REPLACE_WITH_MAILBOX_PASSWORD',
  'from_email' => 'Info@Jehanreadymix.com',
  'from_name'  => 'Jehan Holding Group',
);
