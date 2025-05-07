<?php
include 'PHP/connection.php';
if ($_SESSION['Role'] !== 'admin') {
    header('Location: index.php');
    exit;
}

$sql = "SELECT 
            p.product_id,
            p.product_name, 
            b.brand AS brand, 
            c.category AS category, 
            g.gender AS gender, 
            p.price, 
            p.image 
        FROM products p
        LEFT JOIN brand b ON p.brand_id = b.brand_id
        LEFT JOIN categorie c ON p.categorie_id = c.category_id
        LEFT JOIN gender g ON p.gender_id = g.gender_id";

$result = mysqli_query($conn, $sql);
?>

<h2>Producten Overzicht</h2>
<table style="color: #0f1111">
    <thead>
    <tr style="color: #e60000">
        <th>Merk</th>
        <th>Product Naam</th>
        <th>Categorie</th>
        <th>Gender</th>
        <th>Prijs</th>
    </tr>
    </thead>
    <tbody>
    <?php while ($product = mysqli_fetch_assoc($result)): ?>
        <tr>
            <td><?= htmlspecialchars($product['brand']) ?></td>
            <td><?= htmlspecialchars($product['product_name']) ?></td>
            <td><?= htmlspecialchars($product['category']) ?></td>
            <td><?= htmlspecialchars($product['gender']) ?></td>
            <td>€<?= number_format($product['price'], 2, ',', '.') ?></td>
            <td>
                <a href="?page=edit_product&id=<?= $product['product_id']; ?>">Edit</a> |
                <a href="PHP/product.php?delete_id=<?= $product['product_id']; ?>" onclick="return confirm('Wil je echt verwijderen ?')">Verwijderen</a>
            </td>
        </tr>
    <?php endwhile; ?>
    </tbody>
</table>
