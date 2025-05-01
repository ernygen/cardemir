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
      "Max Verstappen": { background: "darkblue", text: "white" },
      "Yuki Tsunoda": { background: "darkblue", text: "white" },
      "Lewis Hamilton": { background: "red", text: "white" },
      "Charles Leclerc": { background: "red", text: "white" },
      "Lando Norris": { background: "orange", text: "white" },
      "Oscar Piastri": { background: "orange", text: "white" },
      "George Russell": { background: "silver", text: "black" },
      "A. Kimi Antonelli": { background: "silver", text: "black" },
      "Fernando Alonso": { background: "darkgreen", text: "white" },
      "Lance Stroll": { background: "darkgreen", text: "white" },
      "Liam Lawson": { background: "turquoise", text: "black" },
      "Isack Hadjar": { background: "turquoise", text: "black" },
      "Oliver Bearman": { background: "white", text: "black" },
      "Esteban Ocon": { background: "white", text: "black" },
      "Pierre Gasly": { background: "pink", text: "black" },
      "Jack Doohan": { background: "pink", text: "black" },
      "Alex Albon": { background: "blue", text: "white" },
      "Carlos Sainz": { background: "blue", text: "white" },
      "Nico Hülkenberg": { background: "green", text: "white" },
      "Gabriel Bortoletto": { background: "green", text: "white" }
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
                  const driverColor = driverColors[row["Sürücü"]] || { background: "white", text: "black" }; // Varsayılan renk beyaz ve siyah yazı
                  const cellStyle = key === "Sürücü" ? {
                    backgroundColor: driverColor.background,
                    color: driverColor.text
                  } : {}; // Sadece "Sürücü" hücresine renk ekleyelim
  
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
  