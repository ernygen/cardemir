function LiveF1Table() {
    const [data, setData] = React.useState([]);
  
    React.useEffect(() => {
      const fetchSheet = async () => {
        try {
          const res = await fetch(
            "https://opensheet.elk.sh/184-vi4ZapBokjwpvfMABFfGhjvwZVvMWlnn4NkdqkmY/s%C3%BCr%C3%BCc%C3%BC%20listesi"
          );
          const json = await res.json();
          setData(json);
        } catch (err) {
          console.error("Veri çekme hatası:", err);
        }
      };
  
      fetchSheet();
      const interval = setInterval(fetchSheet, 30000);
      return () => clearInterval(interval);
    }, []);
  
    // Renk eşlemelerini sürücüye göre yapıyoruz
    const driverColors = {
      "Max Verstappen": "darkblue",
      "Yuki Tsunoda": "darkblue",
      "Lewis Hamilton": "red",
      "Charles Leclerc": "red",
      "Lando Norris": "orange",
      "Oscar Piastri": "orange",
      "George Russell": "silver",
      "A. Kimi Antonelli": "silver",
      "Fernando Alonso": "darkgreen",
      "Lance Stroll": "darkgreen",
      "Liam Lawson": "turquoise",
      "Isack Hadjar": "turquoise",
      "Oliver Bearman": "white",
      "Esteban Ocon": "white",
      "Pierre Gasly": "pink",
      "Jack Doohan": "pink",
      "Alex Albon": "blue",
      "Carlos Sainz": "blue",
      "Nico Hülkenberg": "green",
      "Gabriel Bortoletto": "green"
    };
  
    return (
      <div>
        <h1>Canlı F1 Puan Durumu</h1>
        <table border="1">
          <thead>
            <tr>
              {data.length > 0 &&
                Object.keys(data[0]).map((header, i) => (
                  <th key={i}>{header}</th>
                ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                {Object.entries(row).map(([key, cell], j) => {
                  // Sürücünün adı varsa ve renk eşlemesi mevcutsa
                  const color = driverColors[row["Sürücü"]] || "white"; // Varsayılan renk beyaz
                  const cellStyle = key === "Sürücü" ? { backgroundColor: color } : {}; // Sadece "Sürücü" hücresine renk ekleyelim
  
                  return (
                    <td key={j} style={cellStyle}>
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  
  ReactDOM.createRoot(document.getElementById("root")).render(<LiveF1Table />);
  