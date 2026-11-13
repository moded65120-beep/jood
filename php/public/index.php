<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/app/database.php';

ini_set('session.use_strict_mode', '1');
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_samesite', 'Lax');
session_set_cookie_params([
    'httponly' => true,
    'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
    'samesite' => 'Lax',
    'path' => '/',
]);
session_start();

function h(?string $value): string { return htmlspecialchars($value ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function csrf_token(): string { return $_SESSION['csrf'] ??= bin2hex(random_bytes(32)); }
function check_csrf(): void {
    $sent = $_POST['csrf'] ?? '';
    if (!is_string($sent) || !hash_equals(csrf_token(), $sent)) {
        http_response_code(419);
        exit('انتهت صلاحية النموذج. أعد تحميل الصفحة وحاول مجددًا.');
    }
}
function redirect(string $to): never { header('Location: ' . $to, true, 303); exit; }
function current_user(): ?array { return $_SESSION['user'] ?? null; }
function owned_children(PDO $pdo, int $userId): array {
    $q = $pdo->prepare('SELECT id, full_name, date_of_birth, sex FROM children WHERE parent_user_id = ? ORDER BY full_name');
    $q->execute([$userId]);
    return $q->fetchAll();
}

$error = '';
$notice = '';
$page = (string)($_GET['page'] ?? 'home');

try {
    $pdo = db();
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        check_csrf();
        $action = (string)($_POST['action'] ?? '');
        if ($action === 'register') {
            $name = trim((string)($_POST['name'] ?? ''));
            $email = filter_var(trim((string)($_POST['email'] ?? '')), FILTER_VALIDATE_EMAIL);
            $password = (string)($_POST['password'] ?? '');
            if ($name === '' || !$email || strlen($password) < 10) {
                $error = 'أدخل اسمًا وبريدًا صحيحًا وكلمة مرور من 10 أحرف على الأقل.';
                $page = 'register';
            } else {
                $q = $pdo->prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, \'mother\')');
                $q->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
                session_regenerate_id(true);
                $_SESSION['user'] = ['id' => (int)$pdo->lastInsertId(), 'name' => $name, 'email' => $email, 'role' => 'mother'];
                unset($_SESSION['csrf']);
                redirect('?page=home');
            }
        } elseif ($action === 'login') {
            $email = trim((string)($_POST['email'] ?? ''));
            $q = $pdo->prepare('SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1');
            $q->execute([$email]);
            $account = $q->fetch();
            if (!$account || !password_verify((string)($_POST['password'] ?? ''), $account['password_hash'])) {
                $error = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
                $page = 'login';
            } else {
                session_regenerate_id(true);
                $_SESSION['user'] = ['id' => (int)$account['id'], 'name' => $account['name'], 'email' => $account['email'], 'role' => $account['role']];
                unset($_SESSION['csrf']);
                redirect('?page=home');
            }
        } elseif ($action === 'logout') {
            $_SESSION = [];
            session_destroy();
            redirect('?page=login');
        } elseif ($action === 'add_child' && current_user()) {
            $name = trim((string)($_POST['full_name'] ?? ''));
            $dob = trim((string)($_POST['date_of_birth'] ?? ''));
            $sex = (string)($_POST['sex'] ?? '');
            if ($name === '' || !in_array($sex, ['male', 'female'], true) || ($dob !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dob))) {
                $error = 'تحقق من الاسم وتاريخ الميلاد والجنس.';
                $page = 'children';
            } else {
                $q = $pdo->prepare('INSERT INTO children (parent_user_id, full_name, date_of_birth, sex) VALUES (?, ?, ?, ?)');
                $q->execute([(int)current_user()['id'], $name, $dob ?: null, $sex]);
                redirect('?page=children');
            }
        }
    }
} catch (Throwable $e) {
    error_log((string)$e);
    $error = 'تعذر إكمال العملية. تحقق من إعداد قاعدة البيانات أو حاول لاحقًا.';
    if (!isset($pdo)) { $page = 'setup'; }
}

$user = current_user();
if (!in_array($page, ['login', 'register', 'setup'], true) && !$user) { $page = 'login'; }
$children = [];
if ($user && isset($pdo)) {
    try { $children = owned_children($pdo, (int)$user['id']); } catch (Throwable $e) { error_log((string)$e); }
}
$activeChild = isset($_GET['child']) ? (int)$_GET['child'] : (int)($children[0]['id'] ?? 0);
if ($activeChild && $user) {
    $owned = false;
    foreach ($children as $child) if ((int)$child['id'] === $activeChild) $owned = true;
    if (!$owned) { http_response_code(404); $activeChild = 0; }
}
$section = (string)($_GET['section'] ?? 'overview');
$sections = ['overview'=>'نظرة عامة', 'growth'=>'النمو', 'vaccines'=>'اللقاحات', 'milestones'=>'مراحل التطور', 'appointments'=>'المواعيد'];
if (!array_key_exists($section, $sections)) $section = 'overview';
$records = [];
if ($activeChild && isset($pdo) && in_array($section, ['growth','vaccines','milestones'], true)) {
    $table = ['growth'=>'growth_measurements', 'vaccines'=>'vaccinations', 'milestones'=>'milestones'][$section];
    $q = $pdo->prepare("SELECT * FROM {$table} WHERE child_id = ? ORDER BY id DESC LIMIT 50");
    $q->execute([$activeChild]);
    $records = $q->fetchAll();
}
?><!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>نمو | لوحة العائلة</title><link rel="stylesheet" href="assets/app.css">
</head>
<body>
<header class="topbar"><a class="brand" href="?page=home"><span class="brand-mark">ن</span><span>نمو <small>رعاية تنمو مع طفلك</small></span></a>
<?php if ($user): ?><div class="user-area"><span><?= h($user['name']) ?></span><form method="post"><input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>"><input type="hidden" name="action" value="logout"><button class="quiet" type="submit">تسجيل الخروج</button></form></div><?php else: ?><a class="quiet" href="?page=login">تسجيل الدخول</a><?php endif; ?></header>
<?php if ($error): ?><div class="alert" role="alert"><?= h($error) ?></div><?php endif; ?>
<?php if ($page === 'setup'): ?><main class="auth-card"><h1>إعداد قاعدة البيانات</h1><p>عرّف متغيرات DB_HOST وDB_NAME وDB_USER وDB_PASS في إعداد PHP على Plesk، ثم استورد <code>database/schema.sql</code>.</p></main>
<?php elseif (!$user): ?>
<main class="auth-wrap"><section class="auth-card"><div class="eyebrow">منصة صحة الطفل</div><h1><?= $page === 'register' ? 'إنشاء حساب عائلي' : 'مرحبًا بعودتك' ?></h1><p class="muted">واجهة تجريبية تعليمية — استخدم بيانات خيالية فقط.</p>
<form method="post" class="form"><input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>"><input type="hidden" name="action" value="<?= $page === 'register' ? 'register' : 'login' ?>">
<?php if ($page === 'register'): ?><label>الاسم<input name="name" required maxlength="120" autocomplete="name"></label><?php endif; ?>
<label>البريد الإلكتروني<input type="email" name="email" required maxlength="190" autocomplete="email"></label>
<label>كلمة المرور<input type="password" name="password" required minlength="<?= $page === 'register' ? '10' : '1' ?>" autocomplete="<?= $page === 'register' ? 'new-password' : 'current-password' ?>"></label>
<button class="primary" type="submit"><?= $page === 'register' ? 'إنشاء الحساب' : 'تسجيل الدخول' ?></button></form>
<p class="switch"><?php if ($page === 'register'): ?>لديك حساب؟ <a href="?page=login">سجل الدخول</a><?php else: ?>مستخدم جديد؟ <a href="?page=register">أنشئ حسابًا</a><?php endif; ?></p></section><aside class="auth-art"><span class="bubble">✿</span><h2>كل خطوة صغيرة<br>تصنع نموًا جميلًا</h2><p>تابع معلومات طفلك في مكان واحد.</p></aside></main>
<?php else: ?>
<div class="shell"><aside class="sidebar"><div class="side-title">لوحة الأم</div><nav><?php foreach ($sections as $key=>$label): ?><a class="nav-item <?= $section===$key?'active':'' ?>" href="?page=home&section=<?= h($key) ?><?= $activeChild ? '&child='.$activeChild : '' ?>"><span class="nav-icon"><?= ['overview'=>'⌂','growth'=>'↗','vaccines'=>'✚','milestones'=>'☆','appointments'=>'▦'][$key] ?></span><?= h($label) ?></a><?php endforeach; ?></nav><div class="side-note">نسخة تعليمية ببيانات تجريبية</div></aside>
<main class="content"><div class="welcome"><div><div class="eyebrow">مساحة العائلة</div><h1>أهلًا، <?= h($user['name']) ?> <span>🌱</span></h1><p class="muted">تابعي رحلة النمو خطوة بخطوة.</p></div><div class="avatar"><?= h(mb_substr($user['name'],0,1,'UTF-8')) ?></div></div>
<?php if ($children): ?><section class="child-picker"><label for="child-select">الطفل</label><select id="child-select" onchange="location.href='?page=home&section=<?= h($section) ?>&child='+this.value"><?php foreach ($children as $child): ?><option value="<?= (int)$child['id'] ?>" <?= (int)$child['id']===$activeChild?'selected':'' ?>><?= h($child['full_name']) ?></option><?php endforeach; ?></select></section><?php endif; ?>
<?php if ($section === 'children' || !$children): ?><section class="panel"><div class="panel-head"><div><h2>أطفالي</h2><p class="muted">أضيفي ملفًا تجريبيًا لطفلك.</p></div></div><form method="post" class="child-form"><input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>"><input type="hidden" name="action" value="add_child"><label>اسم الطفل<input name="full_name" maxlength="120" required></label><label>تاريخ الميلاد<input type="date" name="date_of_birth"></label><label>الجنس<select name="sex" required><option value="">اختاري</option><option value="female">أنثى</option><option value="male">ذكر</option></select></label><button class="primary" type="submit">إضافة طفل</button></form></section><?php endif; ?>
<?php if ($section === 'overview'): ?><div class="cards"><article class="stat-card blue"><span class="stat-icon">♡</span><p>ملفات الأطفال</p><strong><?= count($children) ?></strong><small>ملفات مرتبطة بحسابك</small></article><article class="stat-card pink"><span class="stat-icon">↗</span><p>متابعة النمو</p><strong><?= $activeChild ? '—' : 'ابدئي' ?></strong><small>تُعرض القياسات بعد إضافتها</small></article><article class="stat-card lilac"><span class="stat-icon">▦</span><p>المواعيد</p><strong>—</strong><small>لا توجد مواعيد معروضة بعد</small></article></div><section class="panel"><div class="panel-head"><div><h2>رحلة طفلك</h2><p class="muted">اختاري أحد الأقسام لمتابعة المعلومات.</p></div></div><div class="quick-links"><a href="?page=home&section=growth&child=<?= $activeChild ?>">مخطط النمو <b>←</b></a><a href="?page=home&section=vaccines&child=<?= $activeChild ?>">جدول اللقاحات <b>←</b></a><a href="?page=home&section=milestones&child=<?= $activeChild ?>">مراحل التطور <b>←</b></a><a href="?page=home&section=appointments&child=<?= $activeChild ?>">المواعيد <b>←</b></a></div></section><?php endif; ?>
<?php if (in_array($section,['growth','vaccines','milestones'],true)): ?><section class="panel"><div class="panel-head"><div><h2><?= h($sections[$section]) ?></h2><p class="muted">بيانات هذا القسم مرتبطة بملف الطفل المحدد.</p></div></div><?php if (!$activeChild): ?><p>أضيفي ملف طفل للبدء.</p><?php elseif (!$records): ?><div class="empty"><span>✿</span><h3>لا توجد سجلات بعد</h3><p>ستظهر السجلات هنا عند إضافة بيانات تجريبية.</p></div><?php else: ?><div class="table-wrap"><table><thead><tr><?php foreach (array_keys($records[0]) as $column): ?><th><?= h((string)$column) ?></th><?php endforeach; ?></tr></thead><tbody><?php foreach ($records as $record): ?><tr><?php foreach ($record as $value): ?><td><?= h((string)$value) ?></td><?php endforeach; ?></tr><?php endforeach; ?></tbody></table></div><?php endif; ?><p class="disclaimer">المعلومات لأغراض العرض التعليمي فقط، ولا تمثل تقييمًا أو توصية طبية.</p></section><?php endif; ?>
<?php if ($section === 'appointments'): ?><section class="panel"><div class="panel-head"><div><h2>المواعيد</h2><p class="muted">إدارة طلبات المواعيد ستضاف في المرحلة التالية.</p></div></div><div class="empty"><span>▦</span><h3>لا توجد مواعيد للعرض</h3><p>هذه النسخة الأولية لا تنشئ حجوزات بعد.</p></div></section><?php endif; ?>
<footer>نمو — مشروع جامعي تجريبي <span>•</span> لا تستخدم بيانات حقيقية</footer></main></div>
<?php endif; ?>
</body></html>
