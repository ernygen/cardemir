<?php
include 'PHP/connection.php';

// Gender'ları çek
$genderQuery = "SELECT DISTINCT gender FROM gender";
$genderResult = $conn->query($genderQuery);

$categoriesByGender = [];

while ($genderRow = $genderResult->fetch_assoc()) {
    $gender = $genderRow['gender'];

    $categoryQuery = "SELECT DISTINCT category FROM categorie c 
                      JOIN products p ON c.category_id = p.categorie_id 
                      JOIN gender g ON p.gender_id = g.gender_id
                      WHERE g.gender = ?";

    $stmt = $conn->prepare($categoryQuery);
    $stmt->bind_param("s", $gender);
    $stmt->execute();
    $categoryResult = $stmt->get_result();

    $categories = [];
    while ($categoryRow = $categoryResult->fetch_assoc()) {
        $categories[] = $categoryRow['category'];
    }

    $categoriesByGender[$gender] = $categories;
    $stmt->close();
}

$conn->close();
?>

<div class="announcement-bar">
    <marquee behavior="scroll" direction="left">
        🎉 Grote openingskorting! | 🛍️ Seizoensuitverkoop: Kortingen tot 50%! | 🚚 Vandaag besteld, morgen in huis! | 🏷️ Exclusieve deals voor snelle beslissers! | 💳 Veilig betalen, 100% tevredenheidsgarantie! |
        🛒 Winkel met vertrouwen, wij staan altijd voor u klaar! | 📦 Meer dan 10.000 tevreden klanten! | 🌟 Beoordeeld met 4.9/5 sterren! |
        📉 Wacht, onze korting... wordt kleiner? | 🐌 Misschien niet morgen in huis... maar volgende week zeker! | 🔄 Retourbeleid? Hmm, daar moeten we nog over nadenken. |
        📞 Klantenservice? Ja, we hadden ooit iemand... | 🏚️ Ons magazijn? Daar willen we het niet over hebben. | 🏴‍☠️ Onze CEO is vermist, stuur hulp! | 🚑 Send Help | 🙋‍♂️ Hallo? | 😦 Is er iemand? | ❓Of zo, ik weet het ook niet meer...
    </marquee>
</div>

<a class="logo" href="index.php?page=home">
    <img src="css/logo.png" alt="Logo" style="height: auto" width="auto">
</a>

<div class="navbar" style="text-align: center">
    <?php
    foreach ($categoriesByGender as $gender => $categories) {
        echo "<div class='dropdown'>";
        echo "<a href='index.php?page=category&gen=" . urlencode($gender) . "' class='dropbtn'>" . htmlspecialchars($gender) . "</a>";
        echo "<div class='dropdown-content'>";

        foreach ($categories as $category) {
            echo "<a href='index.php?page=category&gen=" . urlencode($gender) . "&cat=" . urlencode($category) . "'>" . htmlspecialchars($category) . "</a>";
        }

        echo "</div></div>";

    }
    ?>
</div>
