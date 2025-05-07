<?php

include '../PHP/connection.php';
session_start();
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email = $_POST['email'];
    $pword = $_POST['pword'];
    $role = "klant";
    $sql = "INSERT INTO users (email, wachtwoord, role) VALUES (?, ?, ?)";
    $stmt = $conn->prepare($sql);

    if ($stmt) {
        $stmt->bind_param("sss", $email, $pword, $role);

        if ($stmt->execute()) {
            echo "Registratie succesvol! :)";
            $_SESSION['Role'] = $role;
            header('Location: ../index.php');
            exit;
        } else {
            echo "Er is een fout opgetreden: " . $stmt->error;
        }
        $stmt->close();
    } else {
        echo "Error: " . $conn->error;
    }

    $conn->close();
}
?>
