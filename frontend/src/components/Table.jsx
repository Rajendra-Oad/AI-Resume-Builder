export const Table = ({ columns, rows, rowKey = "id", emptyMessage = "No records found." }) => (
  <div className="table-wrap overflow-auto">
    <table className="w-full border-collapse">
      <thead>
        <tr>
          {columns.map((column) => (
            <th className="border-b border-border p-3 text-left text-xs text-ink-subtle uppercase" key={column.key} scope="col">
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length ? (
          rows.map((row) => (
            <tr key={row[rowKey]}>
              {columns.map((column) => (
                <td className="border-b border-border p-3 text-left" key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
              ))}
            </tr>
          ))
        ) : (
          <tr>
            <td className="border-b border-border p-3 text-left" colSpan={columns.length}>{emptyMessage}</td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);
