<?php
$password = 'demo-only-db-password-12345';

function findAccount($connection) {
    return mysqli_query($connection, "SELECT * FROM accounts WHERE id = " . $_GET['id']);
}

function runCommand() {
    system($_GET['command']);
}

function loadPage() {
    include($_GET['page']);
}

function restorePayload() {
    return unserialize($_COOKIE['payload']);
}
