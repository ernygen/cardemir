<?php
if (isset($_GET['product_id'], $_GET['product_name'], $_GET['price'], $_GET['image'])) {
    $product_id = intval($_GET['product_id']);
    $product_name = htmlspecialchars(urldecode($_GET['product_name']));
    $price = floatval($_GET['price']);
    $image = htmlspecialchars(urldecode($_GET['image']));

    $product = [
        'id' => $product_id,
        'name' => $product_name,
        'price' => $price,
        'image' => $image,
        'quantity' => 1
    ];
    $found = false;
    foreach ($_SESSION['cart'] as $key => $item) {
        if ($item['id'] === $product_id) {
            $_SESSION['cart'][$key]['quantity']++;
            $found = true;
            break;
        }
    }
    if (! $found) {
        $_SESSION['cart'][] = $product;
    }
    }
    if (isset($_GET['update_id'], $_GET['action'])) {
        $update_id = intval($_GET['update_id']);
        $action    = $_GET['action'];

    foreach ($_SESSION['cart'] as $key => $item) {
        if ($item['id'] === $update_id) {
            if ($action === 'increase') {
                $_SESSION['cart'][$key]['quantity']++;
            } elseif ($action === 'decrease') {
                $_SESSION['cart'][$key]['quantity']--;
                if ($_SESSION['cart'][$key]['quantity'] <= 0) {
                    unset($_SESSION['cart'][$key]);
                }
            }
            break;
        }
    }
    $_SESSION['cart'] = array_values($_SESSION['cart']);
}
?>

<div class="cart-section">
    <h2>
        Winkelwagen
        <?php
        if (!empty($_SESSION['cart'])) {
            $total = 0;
            foreach ($_SESSION['cart'] as $item) {
                $total += $item['price'] * $item['quantity'];
            }
            echo "(€" . number_format($total, 2, ',', '.') . ")";
        }
        ?>
    </h2>

    <div class="cart-items">
        <?php if (!empty($_SESSION['cart'])): ?>
            <?php foreach ($_SESSION['cart'] as $item): ?>
                <div class="cart-item">
                    <img class="image-container" src="css/<?= $item['image'] ?>" alt="<?= $item['name'] ?>">
                    <div class="cart-info">
                        <h3 style="color: #0f1111"><?= $item['name'] ?></h3>
                        <p class="price">&euro;<?= number_format($item['price'], 2, ',', '.') ?></p>
                        <p class="quantity">
                            Aantal:
                            <a href="?page=cart&update_id=<?= $item['id'] ?>&action=decrease" class="quantity-btn">◀</a>
                            <?= $item['quantity'] ?>
                            <a href="?page=cart&update_id=<?= $item['id'] ?>&action=increase" class="quantity-btn">▶</a>
                        </p>
                    </div>
                </div>
            <?php endforeach; ?>


        <?php else: ?>
            <p>Je winkelwagen is leeg.</p>
        <?php endif; ?>
    </div>

    <form class="checkout-form" method="post" action="PHP/cart.php">
        <div class="form-group">
            <label>Email</label>
            <input type="email" placeholder="jan.jansen@example.com" required name="email">
            <label>Straat en Huisnummer</label>
            <input type="text" required name="straat en huisnummer">
            <label>Telefoon Nummer</label>
            <input type="text" placeholder="+31" required name="t.nummer">
            <label>Postcode</label>
            <input type="text" required name="postcode">
            <div>
                <label>Provincie</label>
                <select id="provincie" required name="provincie">
                    <option value="">Selecteer een provincie </option>
                </select>
                <label>Gemeente</label>
                <select id="gemeente" required disabled name="gemeente">
                    <option value="">Selecteer een gemeente</option>
                </select>
            </div>
                <label>Betaalmethode</label><br>
                <div class="form-group">
                    <label for="idealRadio">iDEAL</label><input type="radio" id="idealRadio" name="paymentMethod" value="ideal" checked>
                    <label for="cardRadio">Creditcard</label><input type="radio" id="cardRadio" name="paymentMethod" value="card">
                </div>

                <div id="idealSection">
                    <label>Uw Bank</label>
                    <select required name="idealBank">
                        <option>Kies een Bank...</option>
                        <option>ABN AMRO</option>
                        <option>ASN Bank</option>
                        <option>Bunq</option>
                        <option>ING</option>
                        <option>Knab</option>
                        <option>Moneyou</option>
                        <option>Rabobank</option>
                        <option>Regiobank</option>
                        <option>SNS</option>
                        <option>Svenska Hadelsbanken</option>
                        <option>Tridos Bank</option>
                        <option>Van Lanschot</option>
                    </select>
                </div>

                <div id="cardSection" style="display: none;">
                    <label>Kaartnummer</label>
                    <input type="text" name="kaartnummer" id="kaartnummer" maxlength="19" placeholder="1234 5678 9012 3456">
                    <label>Exp. Maand</label>
                    <input type="month" name="exp_date" >
                    <label>CVV</label>
                    <input type="text" name="cvv" maxlength="3">
                </div>

        </div>
        <button type="submit">Betalen</button>
    </form>

</div>

<script>
    const data = {
        "Drenthe": ["Aa en Hunze", "Assen", "Borger-Odoorn", "Coevorden", "Emmen", "Hoogeveen", "Meppel", "Midden-Drenthe", "Noordenveld", "Tynaarlo", "Westerveld"],
        "Flevoland": ["Almere", "Dronten", "Lelystad", "Noordoostpolder", "Urk", "Zeewolde"],
        "Friesland": ["Achtkarspelen", "Ameland", "Dantumadiel", "De Fryske Marren", "Harlingen", "Heerenveen", "Leeuwarden", "Noardeast-Fryslân", "Ooststellingwerf", "Opsterland", "Schiermonnikoog", "Smallingerland", "Súdwest-Fryslân", "Terschelling", "Tytsjerksteradiel", "Vlieland", "Waadhoeke", "Weststellingwerf"],
        "Gelderland": ["Aalten", "Apeldoorn", "Arnhem", "Barneveld", "Berg en Dal", "Berkelland", "Beuningen", "Bronckhorst", "Brummen", "Buren", "Culemborg", "Doesburg", "Doetinchem", "Druten", "Duiven", "Ede", "Elburg", "Epe", "Ermelo", "Harderwijk", "Hattem", "Heerde", "Heumen", "Lingewaard", "Lochem", "Maasdriel", "Montferland", "Neder-Betuwe", "Nijkerk", "Nijmegen", "Oldebroek", "Oost Gelre", "Oude IJsselstreek", "Overbetuwe", "Putten", "Renkum", "Rheden", "Rozendaal", "Scherpenzeel", "Tiel", "Voorst", "Wageningen", "West Betuwe", "West Maas en Waal", "Winterswijk", "Wijchen", "Zaltbommel", "Zevenaar", "Zutphen"],
        "Groningen": ["Appingedam", "Delfzijl", "Groningen", "Het Hogeland", "Loppersum", "Midden-Groningen", "Oldambt", "Pekela", "Stadskanaal", "Veendam", "Westerkwartier", "Westerwolde"],
        "Limburg": ["Beek", "Beekdaelen", "Beesel", "Bergen", "Brunssum", "Echt-Susteren", "Eijsden-Margraten", "Gennep", "Gulpen-Wittem", "Heerlen", "Horst aan de Maas", "Kerkrade", "Landgraaf", "Leudal", "Maasgouw", "Maastricht", "Meerssen", "Mook en Middelaar", "Nederweert", "Peel en Maas", "Roerdalen", "Roermond", "Simpelveld", "Sittard-Geleen", "Stein", "Vaals", "Venlo", "Venray", "Voerendaal", "Weert"],
        "Noord-Brabant": ["Alphen-Chaam", "Asten", "Baarle-Nassau", "Bergeijk", "Bergen op Zoom", "Bernheze", "Best", "Bladel", "Boekel", "Boxmeer", "Boxtel", "Breda", "Cranendonck", "Cuijk", "Deurne", "Dongen", "Drimmelen", "Eersel", "Eindhoven", "Etten-Leur", "Geertruidenberg", "Geldrop-Mierlo", "Gemert-Bakel", "Gilze en Rijen", "Goirle", "Grave", "Haaren", "Halderberge", "Heeze-Leende", "Helmond", "Heusden", "'s-Hertogenbosch", "Hilvarenbeek", "Laarbeek", "Landerd", "Loon op Zand", "Meierijstad", "Mill en Sint Hubert", "Moerdijk", "Nuenen, Gerwen en Nederwetten", "Oirschot", "Oisterwijk", "Oosterhout", "Oss", "Reusel-De Mierden", "Rucphen", "Sint Anthonis", "Sint-Michielsgestel", "Someren", "Son en Breugel", "Steenbergen", "Tilburg", "Uden", "Valkenswaard", "Veldhoven", "Vught", "Waalre", "Waalwijk", "Woensdrecht", "Zundert"],
        "Noord-Holland": ["Aalsmeer", "Alkmaar", "Amstelveen", "Amsterdam", "Beemster", "Bergen", "Beverwijk", "Blaricum", "Bloemendaal", "Castricum", "Den Helder", "Diemen", "Drechterland", "Edam-Volendam", "Enkhuizen", "Gooise Meren", "Haarlem", "Haarlemmermeer", "Heemskerk", "Heemstede", "Heerhugowaard", "Heiloo", "Hilversum", "Hollands Kroon", "Hoorn", "Huizen", "Koggenland", "Landsmeer", "Langedijk", "Laren", "Medemblik", "Oostzaan", "Opmeer", "Ouder-Amstel", "Purmerend", "Schagen", "Stede Broec", "Texel", "Uitgeest", "Uithoorn", "Velsen", "Weesp", "Zaanstad", "Zandvoort"],
        "Overijssel": ["Almelo", "Borne", "Dalfsen", "Deventer", "Enschede", "Haaksbergen", "Hardenberg", "Hellendoorn", "Hengelo", "Hof van Twente", "Kampen", "Losser", "Oldenzaal", "Ommen", "Raalte", "Staphorst", "Steenwijkerland", "Tubbergen", "Twenterand", "Wierden", "Zwartewaterland", "Zwolle"],
        "Utrecht": ["Amersfoort", "Baarn", "Bunnik", "Bunschoten", "De Bilt", "De Ronde Venen", "Eemnes", "Houten", "IJsselstein", "Leusden", "Lopik", "Montfoort", "Nieuwegein", "Oudewater", "Renswoude", "Rhenen", "Soest", "Stichtse Vecht", "Utrecht", "Utrechtse Heuvelrug", "Veenendaal", "Vijfheerenlanden", "Wijk bij Duurstede", "Woerden", "Woudenberg", "Zeist"],
        "Zeeland": ["Borsele", "Goes", "Hulst", "Kapelle", "Middelburg", "Noord-Beveland", "Reimerswaal", "Schouwen-Duiveland", "Sluis", "Terneuzen", "Tholen", "Veere", "Vlissingen"],
        "Zuid-Holland": ["Alblasserdam", "Albrandswaard", "Alphen aan den Rijn", "Barendrecht", "Bodegraven-Reeuwijk", "Capelle aan den IJssel", "Delft", "Den Haag", "Dordrecht", "Goeree-Overflakkee", "Gorinchem", "Gouda", "Hardinxveld-Giessendam", "Hellevoetsluis", "Hendrik-Ido-Ambacht", "Hillegom", "Hoeksche Waard", "Kaag en Braassem", "Katwijk", "Krimpen aan den IJssel", "Krimpenerwaard", "Lansingerland", "Leiden", "Leiderdorp", "Leidschendam-Voorburg", "Lisse", "Maassluis", "Midden-Delfland", "Nieuwkoop", "Nissewaard", "Noordwijk", "Oegstgeest", "Papendrecht", "Pijnacker-Nootdorp", "Ridderkerk", "Rijswijk", "Rotterdam", "Schiedam", "Sliedrecht", "Teylingen", "Vlaardingen", "Voorschoten", "Waddinxveen", "Wassenaar", "Westland", "Westvoorne", "Zoetermeer", "Zoeterwoude", "Zuidplas", "Zwijndrecht"]
    };

    const provincieSelect = document.getElementById("provincie");
    const gemeenteSelect = document.getElementById("gemeente");

    Object.keys(data).forEach(provincie => {
        let option = document.createElement("option");
        option.value = provincie;
        option.textContent = provincie;
        provincieSelect.appendChild(option);
    });

    provincieSelect.addEventListener("change", function() {
        gemeenteSelect.innerHTML = '<option value="">Selecteer een gemeente</option>';

        if (this.value) {
            data[this.value].forEach(gemeente => {
                let option = document.createElement("option");
                option.value = gemeente;
                option.textContent = gemeente;
                gemeenteSelect.appendChild(option);
            });
            gemeenteSelect.disabled = false;
        } else {
            gemeenteSelect.disabled = true;
        }
    });
        const idealRadio = document.getElementById("idealRadio");
        const cardRadio = document.getElementById("cardRadio");
        const idealSection = document.getElementById("idealSection");
        const cardSection = document.getElementById("cardSection");

        idealRadio.addEventListener("change", function () {
        if (idealRadio.checked) {
        idealSection.style.display = "block";
        cardSection.style.display = "none";
    }
    });

        cardRadio.addEventListener("change", function () {
        if (cardRadio.checked) {
        idealSection.style.display = "none";
        cardSection.style.display = "block";
    }
    });

    document.getElementById("kaartnummer").addEventListener("input", function(e) {
        let value = e.target.value.replace(/\D/g, '').substring(0,16); // sadece rakam, en fazla 16 hane
        value = value.replace(/(.{4})/g, '$1 ').trim(); // her 4 hanede boşluk
        e.target.value = value;
    });

</script>