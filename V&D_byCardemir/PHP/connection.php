<?php
$servername = "127.0.0.1";
$username = "root";
$password = "";
$database = "v&d";
$conn = new mysqli($servername, $username, $password, $database);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>  <!-- Connection -->
