<?php
include 'PHP/connection.php';
if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    die("Invalid category ID.");
}
if ($_SESSION['Role'] !== 'admin') {
    header('Location: index.php');
    exit;
}
$category_id = intval($_GET['id']);
$query = "SELECT * FROM categorie WHERE category_id = $category_id LIMIT 1";
$result = mysqli_query($conn, $query);

if (!$result || mysqli_num_rows($result) == 0) {
    die("Category not found.");
}

$category = mysqli_fetch_assoc($result);
if (isset($_POST['update_category'])) {
    $new_category_name = mysqli_real_escape_string($conn, $_POST['category_name']);

    $update_query = "UPDATE categorie SET category = '$new_category_name' WHERE category_id = $category_id";

    if (mysqli_query($conn, $update_query)) {
        header("Location: index.php?page=manage_categories");
        exit();
    } else {
        echo "Error updating category: " . mysqli_error($conn);
    }
}
?>

<h2>Edit Categorie</h2>
<form action="" method="POST">
    <label for="category_name">Naam:</label>
    <input type="text" id="category_name" name="category_name" value="<?php echo htmlspecialchars($category['category']); ?>" required>
    <button type="submit" name="update_category">Update</button>
</form>