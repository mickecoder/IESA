import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ManageInstructors = () => {
    const [instructors, setInstructors] = useState([]);
    const [file, setFile] = useState(null);

    useEffect(() => {
        fetchInstructors();
    }, []);

    const fetchInstructors = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/admin/instructors');
            setInstructors(res.data);
        } catch (err) {
            console.error("Error fetching instructors", err);
        }
    };

    const handleImport = async () => {
        if (!file) return alert("Please select a CSV file first!");
        const formData = new FormData();
        formData.append('file', file);

        try {
            await axios.post('http://localhost:5000/api/admin/instructors/import', formData);
            alert("Instructors imported successfully!");
            fetchInstructors();
        } catch (err) {
            alert("Import failed.");
        }
    };

    return (
        /* The outer container ensures the content stays within the main flex area */
        <div style={{ width: '100%', padding: '40px' }}>
            <h2 style={{ marginBottom: '20px', color: '#1e293b' }}>Manage Instructors</h2>
            
            {/* Import Card */}
            <div style={{ 
                backgroundColor: 'white', 
                padding: '30px', 
                borderRadius: '16px', 
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)', 
                marginBottom: '30px' 
            }}>
                <h4 style={{ marginTop: 0, color: '#334155' }}>Bulk Import Instructors (CSV)</h4>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginTop: '15px' }}>
                    <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} />
                    <button onClick={handleImport} style={{ 
                        backgroundColor: '#1ab5f1', 
                        color: 'white', 
                        border: 'none', 
                        padding: '10px 20px', 
                        borderRadius: '8px', 
                        cursor: 'pointer', 
                        fontWeight: 'bold' 
                    }}>
                        Upload CSV
                    </button>
                </div>
            </div>

            {/* Table Card */}
            <div style={{ 
                backgroundColor: 'white', 
                padding: '30px', 
                borderRadius: '16px', 
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)' 
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>
                            <th style={{ padding: '15px 10px' }}>Name</th>
                            <th style={{ padding: '15px 10px' }}>Department</th>
                            <th style={{ padding: '15px 10px' }}>Rank</th>
                        </tr>
                    </thead>
                    <tbody>
                        {instructors.map((inst, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '15px 10px' }}><strong>{inst.name}</strong></td>
                                <td style={{ padding: '15px 10px' }}>{inst.department}</td>
                                <td style={{ padding: '15px 10px' }}>{inst.rank}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ManageInstructors;