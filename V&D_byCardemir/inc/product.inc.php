<?php
include 'PHP/connection.php';
if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    die("Invalid product ID.");
}

$product_id = intval($_GET['id']);
$sql = "SELECT 
            p.product_id, 
            p.product_name, 
            p.image, 
            b.brand AS brand, 
            c.category AS category, 
            g.gender AS gender, 
            p.price 
        FROM products p
        LEFT JOIN brand b ON p.brand_id = b.brand_id
        LEFT JOIN categorie c ON p.categorie_id = c.category_id
        LEFT JOIN gender g ON p.gender_id = g.gender_id
        WHERE p.product_id = ? LIMIT 1";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $product_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    die("Product not found.");
}

$product = $result->fetch_assoc();
$image_path = "css/" . htmlspecialchars($product["image"]);
$img_src = file_exists($image_path) ? $image_path : 'css/default-image.jpg';
?>

<div class="product-container">
    <a href="index.php">
        <button type="button"><</button>
    </a>
    <div class="product-details">
        <h2><?= htmlspecialchars($product['product_name']) ?></h2>
        <p><strong>Gender:</strong> <?= htmlspecialchars($product['gender']) ?></p>
        <p><strong>Brand:</strong> <?= htmlspecialchars($product['brand']) ?></p>
        <p><strong>Category:</strong> <?= htmlspecialchars($product['category']) ?></p>
        <p class="price"><strong>Price:</strong> €<?= number_format($product['price'], 2, ',', '.') ?></p>
        <a href="?page=cart&product_id=<?= $product['product_id'] ?>&product_name=<?= urlencode($product['product_name']) ?>&price=<?= $product['price'] ?>&image=<?= urlencode($product['image']) ?>" class="add-to-cart">
            Toevoegen aan Winkelwagen
        </a>
    </div>

    <div class="product-image">
        <img src="<?= $img_src ?>" alt="<?= htmlspecialchars($product['product_name']) ?>">
    </div>
</div>

<?php
$stmt->close();
$conn->close();
?>
