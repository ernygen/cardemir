<?php
include('PHP/connection.php');

if ($_SESSION['Role'] !== 'admin') {
    header('Location: index.php');
    exit;
}

$query = "SELECT * FROM orders";
$result = mysqli_query($conn, $query);
?>

<h2>Bestellingen</h2>
<table style="color: #0f1111">
    <thead>
    <tr>
        <th>Order ID</th>
        <th>Klant</th>
        <th>Totaal Priis</th>
        <th>Status</th>
    </tr>
    </thead>
    <tbody>
    <?php while ($order = mysqli_fetch_assoc($result)): ?>
        <tr>
            <td><?php echo $order['order_id']; ?></td>
            <td><?php echo $order['customer_name']; ?></td>
            <td><?php echo $order['total_price']; ?></td>
            <td><?php echo $order['status']; ?></td>
        </tr>
    <?php endwhile; ?>
    </tbody>
</table>
