import React from "react";

function FreqTable({ freqTable }) {
  if (!Array.isArray(freqTable)) return null;
  return (
    <table border="1" cellPadding="4" style={{ margin: "20px 0", width: "100%", maxWidth: 400 }}>
      <thead>
        <tr>
          <th>순위</th>
          <th>용어</th>
          <th>빈도수</th>
        </tr>
      </thead>
      <tbody>
        {freqTable.map((row, idx) => (
          <tr key={row.term}>
            <td>{idx + 1}</td>
            <td>{row.term}</td>
            <td>{row.freq}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default FreqTable; 