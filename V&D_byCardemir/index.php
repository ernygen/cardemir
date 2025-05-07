<?php
session_start();

if(isset($_GET['page'])){
    $page = $_GET['page'];
} else {
    $page = 'home';
}

if (! isset($_SESSION['cart'])) {
    $_SESSION['cart'] = [];
}
$cartCount = isset($_SESSION['cart']) ? count($_SESSION['cart']) : 0;
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>V&D Cardemir</title>
    <link rel="icon" href="css/logo.svg" type="image/x-icon">
    <link rel="stylesheet" href="css/style.css">
</head>

<body>

<div class="auth-buttons">
    <?php
    if (isset($_GET['logout'])) {
        session_destroy();
        header('location: index.php?page=home');
        exit();
    } elseif (isset($_SESSION['user_id'])) {
if ($_SESSION['Role'] == 'admin') {
    echo "
    <div class='dropdown'>
        <a class='button' >Admin</a>
        <div class='dropdown-content'>
            <a href='index.php?page=profile'>Profile</a>
            <a href='index.php?page=product_overview'>Producten Overzicht</a>
            <a href='index.php?page=add_product'>Product Toevoegen</a>
            <a href='index.php?page=manage_categories'>Categorieën Beheren</a>
            <a href='index.php?page=orders'>Bestellingen</a>
        </div> 
        </div>
         <div class='dropdown'>
                <a href='?logout=true' class='button'>Uitloggen</a>
         </div>";
}
else {
            echo "
        <a href='index.php?page=cart' class='button'>Cart($cartCount)</a>
            <a href='index.php?page=profile' class='button'>Profile</a>
            <a href='?logout=true' class='button'>Uitloggen</a>
            ";
        }
    } else {
        echo "
        <a href='index.php?page=cart' class='button'>Cart($cartCount)</a>
        <a href='index.php?page=login' class='button'>Inloggen</a>
        <a href='index.php?page=register' class='button'>Registreren</a>
        ";
    } ?>
</div>

<div class="content">
    <?php
    include "inc/navbar.inc.php";
    include 'inc/' . htmlspecialchars($page) . '.inc.php';
    ?>
    <footer style="text-align: center">
        <p>&copy; 2025 <a href="https://ernygen.github.io/cardemir/">Cardemir Design - Eren Aygen</a></p>
    </footer>
</div>

</body>
</html>
