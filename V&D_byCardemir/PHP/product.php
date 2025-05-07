<?php
include 'connection.php';

if (isset($_GET['delete_id']) && is_numeric($_GET['delete_id'])) {
    $delete_id = intval($_GET['delete_id']);

    $sql = "DELETE FROM products WHERE product_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $delete_id);

    if ($stmt->execute()) {
        echo "Product deleted successfully.";
        header("Location: ../index.php?page=product_overview");
    } else {
        echo "Error deleting product.";
    }
}
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $name = $_POST['product_name'];
    $brand_id = $_POST['brand_id'];
    $category_id = $_POST['categorie_id'];
    $gender_id = $_POST['gender_id'];
    $price = $_POST['price'];
    $image = $_POST['image'];
    if (!is_numeric($price) || $price < 0) {
        die("Invalid price value.");
    }
    $sql = "INSERT INTO products (product_name, brand_id, categorie_id, gender_id, price, image) 
            VALUES (?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("siiids", $name, $brand_id, $category_id, $gender_id, $price, $image);

    if ($stmt->execute()) {
        echo "Product added successfully!";
    } else {
        echo "Error adding product.";
    }
}

$conn->close();
?>