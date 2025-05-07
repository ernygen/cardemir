<?php
include 'PHP/connection.php';

$category = isset($_GET['cat']) ? $_GET['cat'] : '';
$gender = isset($_GET['gen']) ? $_GET['gen'] : '';

$sql = "SELECT 
            p.product_name, 
            p.product_id,
            b.brand AS brand, 
            c.category AS category, 
            g.gender AS gender, 
            p.price, 
            p.image 
        FROM products p
        LEFT JOIN brand b ON p.brand_id = b.brand_id
        LEFT JOIN categorie c ON p.categorie_id = c.category_id
        LEFT JOIN gender g ON p.gender_id = g.gender_id
        WHERE 1";

$params = [];
$types = "";

if ($gender !== '') {
    $sql .= " AND g.gender = ?";
    $params[] = $gender;
    $types .= "s";
}
if ($category !== '') {
    $sql .= " AND c.category = ?";
    $params[] = $category;
    $types .= "s";
}

$stmt = $conn->prepare($sql);
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$result = $stmt->get_result();
?>

<div class="product-section">
   <h2> <?= htmlspecialchars($gender) ?> <?= htmlspecialchars($category) ?> </h2>
    <div class="product-grid">
        <?php
        if ($result->num_rows > 0) {
            while($row = $result->fetch_assoc()) {
                $image_path = "css/" . htmlspecialchars($row["image"]);
                ?>
                <div class="product-card">
                    <a href="?page=product&id=<?php echo $row['product_id'] ?>">
                        <div class="image-container">
                            <img src="<?= file_exists($image_path) ? $image_path : 'css/default-image.jpg' ?>" alt="<?= htmlspecialchars($row["product_name"]) ?>">
                        </div>
                        <div class="product-info">
                            <h3><?= htmlspecialchars($row["product_name"]) ?></h3>
                            <p class="brand"><?= htmlspecialchars($row["brand"]) ?></p>
                            <p class="gender"><?= htmlspecialchars($row["gender"]) ?> <?= htmlspecialchars($row["category"]) ?></p>
                            <p class="price">€<?= number_format($row["price"], 2, ',', '.') ?></p>
                        </div>
                    </a>

                    <a href="?page=cart&product_id=<?= $row['product_id'] ?>&product_name=<?= urlencode($row['product_name']) ?>&price=<?= $row['price'] ?>&image=<?= urlencode($row['image']) ?>" class="add-to-cart">
                        Toevoegen aan Winkelwagen
                    </a>
                </div>
                <?php
            }
        } else {
            echo "<p>Geen producten beschikbaar.</p>";
        }
        ?>
    </div>
</div>