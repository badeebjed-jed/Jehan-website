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

// ── Send a generated quote to the client by email ────────────
// POST api.php?action=sendquote  body = { to, client, ref, quantity,
// rate, total, delivery, notes, project }
// Sends a branded HTML quote from the company mailbox.
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
  $e = function ($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); };
  $to       = $b['to'];
  $client   = isset($b['client'])   ? $b['client']   : 'Valued Customer';
  $ref      = isset($b['ref'])      ? $b['ref']      : '';
  $qty      = isset($b['quantity']) ? $b['quantity'] : '';
  $rate     = isset($b['rate'])     ? $b['rate']     : '';
  $total    = isset($b['total'])    ? $b['total']    : '';
  $delivery = isset($b['delivery']) ? $b['delivery'] : '';
  $notes    = isset($b['notes'])    ? $b['notes']    : '';
  $project  = isset($b['project'])  ? $b['project']  : '';

  $rows = '';
  $row = function ($label, $val) use (&$rows, $e) {
    if ($val === '' || $val === null) return;
    $rows .= '<tr><td style="padding:10px 14px;color:#888;font-size:13px;border-bottom:1px solid #eee;">' . $e($label)
           . '</td><td style="padding:10px 14px;color:#1E1E1E;font-size:14px;font-weight:600;border-bottom:1px solid #eee;">' . $e($val) . '</td></tr>';
  };
  $row('Reference', $ref);
  $row('Project', $project);
  $row('Quantity', $qty !== '' ? ($qty . ' m³') : '');
  $row('Price per m³', $rate !== '' ? ($rate . ' SAR') : '');
  $row('Total', $total !== '' ? ($total . ' SAR') : '');
  $row('Delivery Date', $delivery);

  $notesHtml = $notes !== '' ? '<p style="margin:18px 0 0;color:#444;font-size:14px;line-height:1.6;"><strong>Notes:</strong><br>' . nl2br($e($notes)) . '</p>' : '';

  $html =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4e3df;border-radius:6px;overflow:hidden;">'
    . '<div style="background:#3D5A34;padding:22px 24px;text-align:center;">'
    .   '<img src="https://jehanreadymix.com/assets/images/logo.png" alt="Jehan Holding Group" style="height:44px;">'
    . '</div>'
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

  $subject = 'Your Quote from Jehan Holding Group' . ($ref ? ' - ' . $ref : '');
  $headers  = "MIME-Version: 1.0\r\n";
  $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
  $headers .= "From: Jehan Holding Group <Info@Jehanreadymix.com>\r\n";
  $headers .= "Reply-To: Info@Jehanreadymix.com\r\n";

  $sent = @mail($to, $subject, $html, $headers);
  echo json_encode(array('ok' => (bool)$sent, 'sent' => (bool)$sent, 'to' => $to));
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
