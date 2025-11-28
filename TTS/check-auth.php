<?php
/**
 * TTS Auth Check Endpoint
 * Returns authentication status for the frontend
 */

require_once __DIR__ . '/auth-check.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$auth = checkTTSAuth();

echo json_encode($auth);
