<?php
include '../PHP/connection.php';
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $Email = $_POST['email'] ?? '';
    $Password = $_POST['pword'] ?? '';

    if (empty($Email) || empty($Password)) {
        $_SESSION['Notification'] = 'Gebruikersnaam en wachtwoord zijn vereist.';
        header('location: ../index.php?page=login');
        exit();
    }

    $sql = "SELECT role, voornaam, wachtwoord, user_id FROM users WHERE email = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $Email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        if ($Password === $user['wachtwoord']) {
            $_SESSION['Role'] = $user['role'];
            $_SESSION['Username'] = $user['username'];
            $_SESSION['user_id'] = $user['user_id'];

            if ($user['role'] === 'admin') {
                header('location: ../index.php?page=product_overview');
            } elseif ($user['role'] === 'klant') {
                header('location: ../index.php?page=home');
            }
            exit();
        } else {
            $_SESSION['Notification'] = 'Onjuiste wachtwoord.';
        }
    } else {
        $_SESSION['Notification'] = 'Gebruiker niet gevonden.';
    }
    header('location: ../inc/login.inc.php');
    exit();
} else {
    $_SESSION['Notification'] = 'Ongeldig verzoek.';
    header('location: inc/login.inc.php');
    exit();
}
?>
