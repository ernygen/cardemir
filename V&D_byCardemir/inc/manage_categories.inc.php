<?php
include 'PHP/connection.php';
if ($_SESSION['Role'] !== 'admin') {
    header('Location: index.php');
    exit;
}
$query = "SELECT c1.category_id, c1.category, COUNT(p1.categorie_id) AS counter 
FROM `categorie` AS c1
LEFT JOIN `products` AS p1 ON p1.categorie_id = c1.category_id
GROUP BY c1.category_id, c1.category;
;";
$result = mysqli_query($conn, $query);
if (!$result) {
    die("Database error: " . mysqli_error($conn));
}
?>

<h2>Categorieën Beheren</h2>

<?php
if (isset($_SESSION['error_message'])) {
echo '<p style="color: red;">' . $_SESSION['error_message'] . '</p>';
unset($_SESSION['error_message']);
}
?>

<form action=PHP/categories.php method="POST">
    <label for="category_name">Categorie Toevoegen:</label>
    <input type="text" id="category_name" name="category_name" required>
    <button type="submit" name="add_category">Toevoegen</button>
</form>

<h3 style="color: #0f1111">Categorieën</h3>

<table style="color:black">
    <thead>

    </thead>
    <tbody>
    <?php while ($category = mysqli_fetch_assoc($result)): ?>
        <tr>
            <td><?php echo htmlspecialchars($category['category']); ?></td>
            <td>
                <a  href="?page=edit_category&id=<?php echo $category['category_id']; ?>">Edit</a> |
                <?php
                if($category['counter'] == 0){
                    echo '<a href="PHP/categories.php?delete_id='.$category['category_id'].'" > Verwijderen</a>';
                }
                else{
                    echo '<a href="PHP/categories.php?delete_id='.$category['category_id'].'" onclick="return confirm(\'In deze categorie staan '.$category['counter'].' producten. Wil je het echt verwijderen?\')">Verwijderen</a>';
                }
                ?>

            </td>
        </tr>
    <?php endwhile; ?>
    </tbody>
</table>
