function LiveF1Table() {
  const [sheets, setSheets] = React.useState([]);
  const [activeSheet, setActiveSheet] = React.useState(0);

  React.useEffect(() => {
    const fetchSheet = async () => {
      try {
        const res = await Promise.all([
          fetch("https://opensheet.elk.sh/184-vi4ZapBokjwpvfMABFfGhjvwZVvMWlnn4NkdqkmY/1"),
          fetch("https://opensheet.elk.sh/184-vi4ZapBokjwpvfMABFfGhjvwZVvMWlnn4NkdqkmY/2"),
          fetch("https://opensheet.elk.sh/184-vi4ZapBokjwpvfMABFfGhjvwZVvMWlnn4NkdqkmY/3"),
          fetch("https://opensheet.elk.sh/184-vi4ZapBokjwpvfMABFfGhjvwZVvMWlnn4NkdqkmY/4")
        ]);
        const dataResponses = await Promise.all(res.map((r) => r.json()));
        setSheets(dataResponses);
      } catch (err) {
        console.error("Veri çekme hatası:", err);
      }
    };

    fetchSheet();
    const interval = setInterval(fetchSheet, 30000);
    return () => clearInterval(interval);
  }, []);

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

  const data = sheets[activeSheet] || [];

  // Sıralama: varsa "Total" kolonuna göre sırala
  const sortedData = [...data].sort((a, b) => {
    const totalA = parseInt(a.Total) || 0;
    const totalB = parseInt(b.Total) || 0;
    return totalB - totalA;
  });

  return (
    <div>
      <nav>
        <a href="#1" onClick={(e) => { e.preventDefault(); setActiveSheet(0); }}>Driver Points</a> |
        <a href="#2" onClick={(e) => { e.preventDefault(); setActiveSheet(1); }}>Teams Points</a> |
        <a href="#3" onClick={(e) => { e.preventDefault(); setActiveSheet(2); }}>Positions Gained Championship</a> |
        <a href="#4" onClick={(e) => { e.preventDefault(); setActiveSheet(3); }}>All Time Points</a>
      </nav>
      <table border="1">
        <thead>
          <tr>
            {sheets[activeSheet] && Object.keys(sheets[activeSheet][0]).map((header, i) => (
              <th key={i}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(sheets[activeSheet] || []).map((row, i) => (
            <tr key={i}>
              {Object.entries(row).map(([key, cell], j) => {
                const driverColor = driverColors[row["Sürücü"]] || { background: "white", text: "black" };
                let cellStyle = {};

                if (["DNF", "DNS", "DSQ"].includes(cell)) {
                  cellStyle = { backgroundColor: "black", color: "white", fontWeight: "bold" };
                } else if (cell === "25") {
                  cellStyle = { backgroundColor: "gold", color: "black", fontWeight: "bold" };
                } else if (cell === "18") {
                  cellStyle = { backgroundColor: "gray", color: "black", fontWeight: "bold" };
                } else if (cell === "15") {
                  cellStyle = { backgroundColor: "brown", color: "black" };
                }

                if (Object.keys(cellStyle).length === 0 && key === "Sürücü") {
                  cellStyle = {
                    backgroundColor: driverColor.background,
                    color: driverColor.text
                  };
                }

                return <td key={j} style={cellStyle}>{cell}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<LiveF1Table />);
