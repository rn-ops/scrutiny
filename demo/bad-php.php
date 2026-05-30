<?php
// Demo: Common PHP security mistakes

// ❌ Hardcoded database credentials
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASSWORD', 'mysql_password_123');
define('DB_NAME', 'myapp');

$api_secret = 'sk_live_aBcDeFgHiJkLmNoPqRsT';
$stripe_key = 'sk_test_123456789abcdefghijklmnop';

// ❌ SQL injection via unsanitized user input
function getUserProfile($userId) {
    global $db;
    $query = "SELECT * FROM users WHERE id = '" . $_GET['id'] . "'";
    // $result = mysqli_query($db, $query);
    return $query;
}

// ❌ Command injection
function resizeImage($filename) {
    $cmd = "convert " . $_FILES['upload']['name'] . " -resize 200x200 output.jpg";
    exec($cmd);
}

// ❌ Direct eval of user input
function executeTemplate($template) {
    eval('$output = "' . $template . '";');
    return $output;
}

// ❌ Remote file inclusion vulnerability
function loadModule($module) {
    include($_GET['module'] . '.php');
}

// ❌ Weak session handling
function login($username, $password) {
    $_SESSION['user'] = $username;
    $_SESSION['logged_in'] = true;
}

// ❌ Unvalidated redirect
function redirectUser() {
    header('Location: ' . $_GET['redirect_url']);
}

// ❌ Password stored in plain text (or weak hashing)
function storeUserPassword($user, $pass) {
    // In database: password = md5($pass); // MD5 is NOT secure!
    return md5($pass);
}

// ❌ No CSRF protection
echo '<form method="POST" action="/delete-account">';
echo '<button>Delete Account</button>';
echo '</form>';

?>
