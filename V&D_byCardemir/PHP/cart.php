<?php
include 'connection.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user_email = $_POST['email'];
    $straat_en_huisnummer = $_POST['straat_en_huisnummer'];
    $postcode = $_POST['postcode'];
    $provincie = $_POST['provincie'];
    $gemeente = $_POST['gemeente'];
    $billing_methode = $_POST['paymentMethod'];
    $kaartnummer = $_POST['kaartnummer'];
    $exp_date = $_POST['exp_date'];
    $cvv = $_POST['cvv'];

    $total_amount = 1; //
    $shipping_address = "$straat_en_huisnummer, $postcode, $gemeente, $provincie";

    $order_sql = "INSERT INTO orders (user_email, total_amount, shipping_address, billing_methode, status)
                  VALUES (?, ?, ?, ?, 'new')";
    $stmt = $conn->prepare($order_sql);
    $stmt->bind_param("sdss", $user_email, $total_amount, $shipping_address, $billing_methode);

    if ($stmt->execute()) {
        $order_id = $stmt->insert_id;

        $product_id = 1;
        $unit_price = 49.99;
        $quantity = 1;
        $line_total = $unit_price * $quantity;

        $item_sql = "INSERT INTO order_items (order_id, product_id, unit_price, quantity, line_total)
                     VALUES (?, ?, ?, ?, ?)";
        $stmt2 = $conn->prepare($item_sql);
        $stmt2->bind_param("iidid", $order_id, $product_id, $unit_price, $quantity, $line_total);
        $stmt2->execute();

        echo "Gelukkkkkt! Order ID: $order_id";
        header('Location: ../index.php');
        exit();
    } else {
        echo "Daar is een fout gebeurt succes :) " . $stmt->error;
    }

    $stmt->close();
    $conn->close();
}
?>
