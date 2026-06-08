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
$DIR = __DIR__ . '/storage';
if (!is_dir($DIR)) { @mkdir($DIR, 0775, true); }
// Block direct browser access to the raw JSON files.
$ht = $DIR . '/.htaccess';
if (!file_exists($ht)) { @file_put_contents($ht, "Require all denied\nDeny from all\n"); }

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
