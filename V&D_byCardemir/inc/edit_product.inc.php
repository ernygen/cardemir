<?php
include 'PHP/connection.php';
if ($_SESSION['Role'] !== 'admin') {
    header('Location: index.php');
    exit;
}
$product_id = intval($_GET['id']);
$sql = "SELECT p.product_id, p.product_name, p.price, p.image, 
               b.brand_id, b.brand, 
               c.category_id, c.category, 
               g.gender_id, g.gender 
        FROM products p
        LEFT JOIN brand b ON p.brand_id = b.brand_id
        LEFT JOIN categorie c ON p.categorie_id = c.category_id
        LEFT JOIN gender g ON p.gender_id = g.gender_id
        WHERE p.product_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $product_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    die("Product not found.");
}

$product = $result->fetch_assoc();
$brands = $conn->query("SELECT brand_id, brand FROM brand");
$categories = $conn->query("SELECT category_id, category FROM categorie");
$genders = $conn->query("SELECT gender_id, gender FROM gender");

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $name = $_POST['product_name'];
    $brand_id = $_POST['brand_id'];
    $category_id = $_POST['categorie_id'];
    $gender_id = $_POST['gender_id'];
    $price = $_POST['price'];

    if (!is_numeric($price) || $price < 0) {
        die("Invalid price value.");
    }

    $update_sql = "UPDATE products SET product_name = ?, brand_id = ?, categorie_id = ?, gender_id = ?, price = ? WHERE product_id = ?";
    $update_stmt = $conn->prepare($update_sql);
    $update_stmt->bind_param("siiidi", $name, $brand_id, $category_id, $gender_id, $price, $product_id);

    if ($update_stmt->execute()) {
        echo "Product updated successfully!";
        header("Location: index.php?page=product_overview");
    } else {
        echo "Error updating product.";
    }
}

$conn->close();
?>

<h2>Edit Product</h2>
<form method="POST">
    <label>Product Naam:</label>
    <input type="text" name="product_name" value="<?= htmlspecialchars($product['product_name']) ?>" required><br>

    <label>Merk:</label>
    <select name="brand_id" required>
        <?php while ($brand = $brands->fetch_assoc()): ?>
            <option value="<?= $brand['brand_id'] ?>" <?= $brand['brand_id'] == $product['brand_id'] ? 'selected' : '' ?>>
                <?= htmlspecialchars($brand['brand']) ?>
            </option>
        <?php endwhile; ?>
    </select><br>

    <label>Categorie:</label>
    <select name="categorie_id" required>
        <?php while ($category = $categories->fetch_assoc()): ?>
            <option value="<?= $category['category_id'] ?>" <?= $category['category_id'] == $product['category_id'] ? 'selected' : '' ?>>
                <?= htmlspecialchars($category['category']) ?>
            </option>
        <?php endwhile; ?>
    </select><br>

    <label>Gender:</label>
    <select name="gender_id" required>
        <?php while ($gender = $genders->fetch_assoc()): ?>
            <option value="<?= $gender['gender_id'] ?>" <?= $gender['gender_id'] == $product['gender_id'] ? 'selected' : '' ?>>
                <?= htmlspecialchars($gender['gender']) ?>
            </option>
        <?php endwhile; ?>
    </select><br>

    <label>Prijs (€):</label>
    <input type="number" step="0.01" name="price" value="<?= $product['price'] ?>" required><br>

    <button type="submit">Save Changes</button>
</form>