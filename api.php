<?php
/* ============================================================
   Jehan Holding Group — Shared Data API
   ============================================================
   A tiny JSON-file backend so the public website forms AND every
   dashboard account read/write the SAME data, on any device.

   Collections: requests | messages | customers
   Endpoints:
     GET  api.php?collection=requests
     POST api.php?collection=requests              (create; body = JSON object)
     POST api.php?collection=requests&op=update    (body = {id, ...patch})
     POST api.php?collection=requests&op=delete     (body = {id} or ?id=)
   Data is stored in ./storage/<collection>.json, protected from
   direct web access by an auto-generated .htaccess.
   ============================================================ */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── Storage setup ────────────────────────────────────────────
// IMPORTANT: data must live OUTSIDE public_html, otherwise a Git
// auto-deploy (which does a clean checkout of public_html) deletes it.
// We pick the first usable directory from this ordered list and keep
// all collections there. The preferred location is one level above the
// web root, which survives every deployment.
$OLD = __DIR__ . '/storage';                       // legacy location (inside web root)
$CANDIDATES = array(
  dirname(__DIR__) . '/jehan_data',                // ../jehan_data  → persists across deploys (preferred)
  $OLD,                                            // fallback: inside web root
  sys_get_temp_dir() . '/jehan_data',             // last resort
);
$DIR = null;
foreach ($CANDIDATES as $cand) {
  if (is_dir($cand) || @mkdir($cand, 0775, true)) { $DIR = $cand; break; }
}
if ($DIR === null) { $DIR = $OLD; @mkdir($DIR, 0775, true); }

// One-time migration: if we're using the persistent dir but old JSON
// files still exist in the legacy web-root location, move them over.
if ($DIR !== $OLD && is_dir($OLD)) {
  foreach (array('requests', 'messages', 'customers') as $c) {
    $src = $OLD . '/' . $c . '.json';
    $dst = $DIR . '/' . $c . '.json';
    if (file_exists($src) && !file_exists($dst)) { @copy($src, $dst); }
  }
}

// Block direct browser access to the raw JSON files (matters only if the
// chosen dir happens to be web-accessible; the preferred dir is not).
$ht = $DIR . '/.htaccess';
if (!file_exists($ht)) { @file_put_contents($ht, "Require all denied\nDeny from all\n"); }

// ── Email config + SMTP sender ───────────────────────────────
// Credentials live in a file OUTSIDE public_html that the owner fills
// in by hand (never in this repo). Searched in order:
function jehan_mail_config() {
  $paths = array(
    dirname(__DIR__) . '/jehan_data/mail_config.php',  // alongside the data store (preferred)
    dirname(__DIR__) . '/mail_config.php',             // domain root
  );
  foreach ($paths as $p) {
    if (is_file($p)) { $c = include $p; if (is_array($c)) return $c; }
  }
  return null;
}

// Minimal SMTP client (no external libraries). Returns true on success;
// writes a human-readable trace into $log.
function jehan_smtp_send($cfg, $to, $subject, $html, &$log) {
  $host   = isset($cfg['host']) ? $cfg['host'] : 'smtp.hostinger.com';
  $port   = isset($cfg['port']) ? (int)$cfg['port'] : 465;
  $secure = isset($cfg['secure']) ? $cfg['secure'] : ($port === 465 ? 'ssl' : 'tls');
  $user   = isset($cfg['user']) ? $cfg['user'] : '';
  $pass   = isset($cfg['pass']) ? $cfg['pass'] : '';
  $fromE  = isset($cfg['from_email']) ? $cfg['from_email'] : $user;
  $fromN  = isset($cfg['from_name'])  ? $cfg['from_name']  : 'Jehan Holding Group';

  $errno = 0; $errstr = '';
  $remote = ($secure === 'ssl' ? 'ssl://' : '') . $host . ':' . $port;
  $fp = @stream_socket_client($remote, $errno, $errstr, 20);
  if (!$fp) { $log = 'connect failed: ' . $errstr . ' (' . $errno . ')'; return false; }
  stream_set_timeout($fp, 20);

  $get = function () use ($fp) {
    $data = '';
    while (($line = fgets($fp, 515)) !== false) {
      $data .= $line;
      if (isset($line[3]) && $line[3] === ' ') break;
    }
    return $data;
  };
  $say = function ($c) use ($fp, $get) { fwrite($fp, $c . "\r\n"); return $get(); };
  $code = function ($r) { return (int)substr($r, 0, 3); };

  $r = $get();                       if ($code($r) !== 220) { $log = 'greeting: ' . $r; fclose($fp); return false; }
  $r = $say('EHLO jehanreadymix.com'); if ($code($r) !== 250) { $log = 'EHLO: ' . $r; fclose($fp); return false; }
  if ($secure === 'tls') {
    $r = $say('STARTTLS');           if ($code($r) !== 220) { $log = 'STARTTLS: ' . $r; fclose($fp); return false; }
    if (!@stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT)) { $log = 'TLS handshake failed'; fclose($fp); return false; }
    $r = $say('EHLO jehanreadymix.com'); if ($code($r) !== 250) { $log = 'EHLO2: ' . $r; fclose($fp); return false; }
  }
  $r = $say('AUTH LOGIN');           if ($code($r) !== 334) { $log = 'AUTH: ' . $r; fclose($fp); return false; }
  $r = $say(base64_encode($user));   if ($code($r) !== 334) { $log = 'username stage: ' . $r; fclose($fp); return false; }
  $r = $say(base64_encode($pass));   if ($code($r) !== 235) { $log = 'login failed (check mailbox password): ' . $r; fclose($fp); return false; }
  $r = $say('MAIL FROM:<' . $fromE . '>'); if ($code($r) !== 250) { $log = 'MAIL FROM: ' . $r; fclose($fp); return false; }
  $r = $say('RCPT TO:<' . $to . '>');      if ($code($r) !== 250 && $code($r) !== 251) { $log = 'RCPT TO: ' . $r; fclose($fp); return false; }
  $r = $say('DATA');                 if ($code($r) !== 354) { $log = 'DATA: ' . $r; fclose($fp); return false; }

  $headers  = 'From: "' . $fromN . '" <' . $fromE . ">\r\n";
  $headers .= 'To: <' . $to . ">\r\n";
  $headers .= 'Subject: ' . $subject . "\r\n";
  $headers .= 'Date: ' . date('r') . "\r\n";
  $headers .= "MIME-Version: 1.0\r\n";
  $headers .= 'Reply-To: <' . $fromE . ">\r\n";
  $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
  $body = preg_replace('/^\./m', '..', $html);          // dot-stuffing
  $r = $say($headers . "\r\n" . $body . "\r\n.");
  if ($code($r) !== 250) { $log = 'message rejected: ' . $r; fclose($fp); return false; }
  $say('QUIT'); fclose($fp);
  $log = 'sent';
  return true;
}

// Build the branded HTML quote email from a payload array.
function jehan_quote_html($b) {
  $e = function ($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); };
  $rows = '';
  $row = function ($label, $val) use (&$rows, $e) {
    if ($val === '' || $val === null) return;
    $rows .= '<tr><td style="padding:10px 14px;color:#888;font-size:13px;border-bottom:1px solid #eee;">' . $e($label)
           . '</td><td style="padding:10px 14px;color:#1E1E1E;font-size:14px;font-weight:600;border-bottom:1px solid #eee;">' . $e($val) . '</td></tr>';
  };
  $g = function ($k) use ($b) { return isset($b[$k]) ? $b[$k] : ''; };
  $row('Reference', $g('ref'));
  $row('Project', $g('project'));
  $row('Quantity', $g('quantity') !== '' ? ($g('quantity') . ' m³') : '');
  $row('Price per m³', $g('rate') !== '' ? ($g('rate') . ' SAR') : '');
  $row('Total', $g('total') !== '' ? ($g('total') . ' SAR') : '');
  $row('Delivery Date', $g('delivery'));
  $notes = $g('notes');
  $notesHtml = $notes !== '' ? '<p style="margin:18px 0 0;color:#444;font-size:14px;line-height:1.6;"><strong>Notes:</strong><br>' . nl2br($e($notes)) . '</p>' : '';
  $client = $g('client') !== '' ? $g('client') : 'Valued Customer';
  return '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4e3df;border-radius:6px;overflow:hidden;">'
    . '<div style="background:#3D5A34;padding:22px 24px;text-align:center;"><img src="https://jehanreadymix.com/assets/images/logo.png" alt="Jehan Holding Group" style="height:44px;"></div>'
    . '<div style="padding:26px 24px;">'
    .   '<h2 style="margin:0 0 6px;color:#3D5A34;font-size:20px;">Your Concrete Quotation</h2>'
    .   '<p style="margin:0 0 18px;color:#444;font-size:14px;line-height:1.6;">Dear ' . $e($client) . ',<br>Thank you for your request. Please find your quotation details below.</p>'
    .   '<table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:4px;">' . $rows . '</table>'
    .   $notesHtml
    .   '<p style="margin:22px 0 0;color:#444;font-size:14px;line-height:1.6;">To proceed or ask any questions, simply reply to this email or call us at +966 59 393 9882.</p>'
    .   '<p style="margin:18px 0 0;color:#444;font-size:14px;">Kind regards,<br><strong>Jehan Holding Group</strong></p>'
    . '</div>'
    . '<div style="background:#F2F1EE;padding:14px 24px;text-align:center;color:#888;font-size:12px;">Jehan Holding Group · Info@Jehanreadymix.com · +966 59 393 9882</div>'
    . '</div>';
}

// ── Send a generated quote to the client by email ────────────
if (isset($_GET['action']) && $_GET['action'] === 'sendquote') {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); echo json_encode(array('ok' => false, 'error' => 'POST required')); exit;
  }
  $b = json_decode(file_get_contents('php://input'), true);
  if (!is_array($b) || empty($b['to']) || !filter_var($b['to'], FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(array('ok' => false, 'error' => 'missing or invalid recipient email'));
    exit;
  }
  $to      = $b['to'];
  $ref     = isset($b['ref']) ? $b['ref'] : '';
  $subject = 'Your Quote from Jehan Holding Group' . ($ref ? ' - ' . $ref : '');
  $html    = jehan_quote_html($b);

  $cfg = jehan_mail_config();
  if ($cfg) {
    $log = '';
    $sent = jehan_smtp_send($cfg, $to, $subject, $html, $log);
    echo json_encode(array('ok' => $sent, 'sent' => $sent, 'method' => 'smtp', 'detail' => $sent ? '' : $log, 'to' => $to));
    exit;
  }
  // No SMTP config yet → try mail() (usually disabled on Hostinger).
  $headers = "MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\nFrom: Jehan Holding Group <Info@Jehanreadymix.com>\r\nReply-To: Info@Jehanreadymix.com\r\n";
  $sent = @mail($to, $subject, $html, $headers, '-fInfo@Jehanreadymix.com');
  echo json_encode(array('ok' => (bool)$sent, 'sent' => (bool)$sent, 'method' => 'mail', 'detail' => $sent ? '' : 'SMTP not configured and mail() is disabled', 'to' => $to));
  exit;
}


$ALLOWED = array('requests', 'messages', 'customers');
$col = isset($_GET['collection']) ? preg_replace('/[^a-z]/', '', $_GET['collection']) : '';
if (!in_array($col, $ALLOWED, true)) {
  http_response_code(400);
  echo json_encode(array('error' => 'invalid collection'));
  exit;
}
$FILE = $DIR . '/' . $col . '.json';

// ── Helpers ──────────────────────────────────────────────────
function read_all($file) {
  if (!file_exists($file)) return array();
  $fp = @fopen($file, 'r');
  if (!$fp) return array();
  @flock($fp, LOCK_SH);
  $raw = stream_get_contents($fp);
  @flock($fp, LOCK_UN);
  fclose($fp);
  $arr = json_decode($raw, true);
  return is_array($arr) ? $arr : array();
}

function write_all($file, $arr) {
  $fp = @fopen($file, 'c+');
  if (!$fp) return false;
  @flock($fp, LOCK_EX);
  ftruncate($fp, 0);
  rewind($fp);
  fwrite($fp, json_encode(array_values($arr), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
  fflush($fp);
  @flock($fp, LOCK_UN);
  fclose($fp);
  return true;
}

function body_json() {
  $raw = file_get_contents('php://input');
  $data = json_decode($raw, true);
  return is_array($data) ? $data : null;
}

// ── GET: return the whole collection ─────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  echo json_encode(read_all($FILE), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

// ── POST: create / update / delete ───────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $op = isset($_GET['op']) ? $_GET['op'] : 'create';
  $items = read_all($FILE);
  $body = body_json();

  if ($op === 'create') {
    if ($body === null) { http_response_code(400); echo json_encode(array('error' => 'invalid body')); exit; }
    // guard against runaway growth / abuse
    if (count($items) > 5000) { array_shift($items); }
    if (!isset($body['id'])) { $body['id'] = round(microtime(true) * 1000); }
    // de-dupe by id (idempotent create)
    $exists = false;
    foreach ($items as $it) { if (isset($it['id']) && $it['id'] == $body['id']) { $exists = true; break; } }
    if (!$exists) { $items[] = $body; write_all($FILE, $items); }
    echo json_encode(array('ok' => true, 'item' => $body));
    exit;
  }

  if ($op === 'update') {
    $id = isset($body['id']) ? $body['id'] : null;
    $found = false;
    for ($i = 0; $i < count($items); $i++) {
      if (isset($items[$i]['id']) && $items[$i]['id'] == $id) {
        $items[$i] = array_merge($items[$i], $body);
        $found = true;
      }
    }
    if ($found) write_all($FILE, $items);
    echo json_encode(array('ok' => $found));
    exit;
  }

  if ($op === 'delete') {
    $id = isset($body['id']) ? $body['id'] : (isset($_GET['id']) ? $_GET['id'] : null);
    $items = array_values(array_filter($items, function ($x) use ($id) {
      return !(isset($x['id']) && $x['id'] == $id);
    }));
    write_all($FILE, $items);
    echo json_encode(array('ok' => true));
    exit;
  }

  http_response_code(400);
  echo json_encode(array('error' => 'invalid op'));
  exit;
}

http_response_code(405);
echo json_encode(array('error' => 'method not allowed'));
