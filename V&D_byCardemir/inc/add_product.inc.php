<?php
include('PHP/connection.php');
if ($_SESSION['Role'] !== 'admin') {
    header('Location: index.php');
    exit;
}
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $product_name = mysqli_real_escape_string($conn, $_POST['product_name']);
    $price = mysqli_real_escape_string($conn, $_POST['price']);
    $categorie_id = mysqli_real_escape_string($conn, $_POST['categorie']);
    $gender_id = mysqli_real_escape_string($conn, $_POST['gender']);
    $brand_id = mysqli_real_escape_string($conn, $_POST['brand']);
    $new_brand = mysqli_real_escape_string($conn, $_POST['new_brand']);

    if (!empty($new_brand)) {
        $query = "INSERT INTO brand (brand) VALUES (?)";
        $stmt = mysqli_prepare($conn, $query);
        mysqli_stmt_bind_param($stmt, "s", $new_brand);
        mysqli_stmt_execute($stmt);
        $brand_id = mysqli_insert_id($conn);
        mysqli_stmt_close($stmt);
    }

    $target_dir = "css/";
    $target_file = basename($_FILES["image"]["name"]);
    move_uploaded_file($_FILES["image"]["tmp_name"], $target_dir.$target_file);

    $query = "INSERT INTO products (brand_id, product_name, price, categorie_id, gender_id, image) 
              VALUES (?, ?, ?, ?, ?, ?)";

    $stmt = mysqli_prepare($conn, $query);
    mysqli_stmt_bind_param($stmt, "isdiis", $brand_id, $product_name, $price, $categorie_id, $gender_id, $target_file);

    if (mysqli_stmt_execute($stmt)) {
        echo "Geluktt";
    } else {
        echo "Error: " . mysqli_error($conn);
    }

    mysqli_stmt_close($stmt);
}
?>

<h2>Product Toevoegen</h2>
<form action="" method="POST" enctype="multipart/form-data">
    <label for="brand">Brand:</label>
    <select name="brand">
        <option value="">Kies een Brand</option>
        <?php
        $brands = mysqli_query($conn, "SELECT brand_id, brand FROM brand");
        while ($row = mysqli_fetch_assoc($brands)) {
            echo "<option value='{$row['brand_id']}'>{$row['brand']}</option>";
        }
        ?>
    </select>
    <input type="text" name="new_brand" placeholder="Of schrijf nieuwe brand-naam"><br><br>

    <label for="product_name">Product Naam:</label>
    <input type="text" name="product_name" required><br><br>

    <label for="price">Prijs:</label>
    <input type="number" name="price" step="0.01" required><br><br>

    <label for="categorie">Categorie:</label>
    <select name="categorie" required>
        <?php
        $categories = mysqli_query($conn, "SELECT category_id, category FROM categorie");
        while ($row = mysqli_fetch_assoc($categories)) {
            echo "<option value='{$row['category_id']}'>{$row['category']}</option>";
        }
        ?>
    </select><br><br>

    <label for="gender">Gender:</label>
    <select name="gender" required>
        <?php
        $genders = mysqli_query($conn, "SELECT gender_id, gender FROM gender");
        while ($row = mysqli_fetch_assoc($genders)) {
            echo "<option value='{$row['gender_id']}'>{$row['gender']}</option>";
        }
        ?>
    </select><br><br>

    <label for="image">Beeld:</label>
    <input type="file" name="image" accept="image/*" required><br><br>

    <input type="submit" value="Add Product">
</form>
