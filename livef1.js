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
                  // Eğer renk bilgisini içeriyorsa (örneğin 'color' alanı)
                  const cellStyle = row['color'] ? { backgroundColor: row['color'] } : {};
  
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
  