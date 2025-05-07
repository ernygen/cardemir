<?php
include 'connection.php';
$query = "SELECT * FROM categorie";
$result = mysqli_query($conn, $query);

if (isset($_POST['add_category'])) {
    $category_name = mysqli_real_escape_string($conn, $_POST['category_name']);

    $check_query = "SELECT * FROM categorie WHERE category = '$category_name'";
    $check_result = mysqli_query($conn, $check_query);

    if (mysqli_num_rows($check_result) > 0) {
        $_SESSION['error_message'] = "Error: Category '$category_name' already exists!";
        header('Location: ../index.php?page=manage_categories');
        exit();
    } else {
        $insert_query = "INSERT INTO categorie (category) VALUES ('$category_name')";

        if (mysqli_query($conn, $insert_query)) {
            header('Location: ../index.php?page=manage_categories');
            exit();
        } else {
            $_SESSION['error_message'] = "Error adding category: " . mysqli_error($conn);
            header('Location: ../index.php?page=manage_categories');
            exit();
        }
    }
}

if (isset($_GET['delete_id'])) {
    $category_id = $_GET['delete_id'];
    $delete_query = "DELETE FROM categorie WHERE category_id = $category_id";

    if (mysqli_query($conn, $delete_query)) {
        header('Location: ../index.php?page=manage_categories');
        exit();
    } else {
        $_SESSION['error_message'] = "Error deleting category: " . mysqli_error($conn);
        header('Location: ../index.php?page=manage_categories');
        exit();
    }
}
?>
