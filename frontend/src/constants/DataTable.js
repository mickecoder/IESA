import React, { useState } from 'react';

const DataTable = ({ columns, data, onEdit, onDelete, onView, actions = true }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    const paginatedData = data.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    
    const totalPages = Math.ceil(data.length / itemsPerPage);
    
    return (
        <div>
            <table style={styles.table}>
                <thead>
                    <tr>
                        {columns.map(col => (
                            <th key={col.key} style={styles.th}>{col.label}</th>
                        ))}
                        {actions && <th style={styles.th}>Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {paginatedData.map((row, idx) => (
                        <tr key={idx}>
                            {columns.map(col => (
                                <td key={col.key} style={styles.td}>
                                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                                </td>
                            ))}
                            {actions && (
                                <td style={styles.td}>
                                    {onView && <button onClick={() => onView(row)}>View</button>}
                                    {onEdit && <button onClick={() => onEdit(row)}>Edit</button>}
                                    {onDelete && <button onClick={() => onDelete(row.id)}>Delete</button>}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
            {/* Pagination */}
            <div style={styles.pagination}>
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p-1)}>Previous</button>
                <span>Page {currentPage} of {totalPages}</span>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p+1)}>Next</button>
            </div>
        </div>
    );
};