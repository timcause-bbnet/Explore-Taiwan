import React, { useState } from 'react';
import { Printer, CheckSquare, Trash2, ArrowRight } from 'lucide-react';

function App() {
    const [inputText, setInputText] = useState('');
    const [rows, setRows] = useState([]);

    // Parse the messy pasted text
    const handleParse = () => {
        if (!inputText) return;

        const lines = inputText.split('\n');
        const newRows = [];

        lines.forEach((line, index) => {
            // Split by tab or multiple spaces
            const parts = line.trim().split(/\s{2,}|\t/);

            // Basic heuristic to skip headers or empty lines
            // Looking for lines that likely start with a date (YYYY-MM-DD)
            if (parts.length < 3) return;

            const datePart = parts[0]; // Assuming first column is valid date string
            if (!datePart.match(/\d{4}-\d{2}-\d{2}/)) return;

            const dateObj = new Date(datePart);
            const formattedDate = datePart.split(' ')[0]; // Just YYYY-MM-DD

            // Attempt to guess location from the line
            // Standard format seen: Date | Type | Location | Money...
            // e.g., 2026-01-22 22:40:05 | 扣款 | 台北捷運明德 | 40 ...
            const type = parts[1] || '';
            const rawLocation = parts[2] || '';
            const amount = parts[3] || '0';

            // Guess Transport Type
            let transport = '捷運';
            if (rawLocation.includes('高鐵')) transport = '高鐵';
            if (rawLocation.includes('Uber') || rawLocation.includes('計程車')) transport = '計程車';

            // Clean Location Name for "From/To" guess
            // "台北捷運明德" -> "明德"
            let cleanLoc = rawLocation.replace('台北捷運', '').replace('高雄捷運', '');

            newRows.push({
                id: Date.now() + index,
                selected: true,
                date: formattedDate,
                time: datePart.split(' ')[1] || '',
                transport: transport,
                location: cleanLoc,
                startPoint: '', // To be filled by user
                endPoint: cleanLoc, // Default to this location as end point? Or let user edit
                amount: amount,
                memo: ''
            });
        });

        // Try to infer start points from previous rows if possible (reverse chronological order usually)
        // If list is new->old, the "end" of the previous trip (in time) might be the "start" of the current?
        // Usually these lists are Time Descending.
        // Let's just leave startPoint empty for manual entry or basic guess.

        setRows(newRows);
    };

    const handlePrint = () => {
        window.print();
    };

    const updateRow = (id, field, value) => {
        setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const toggleSelect = (id) => {
        setRows(rows.map(r => r.id === id ? { ...r, selected: !r.selected } : r));
    };

    const selectedRows = rows.filter(r => r.selected);
    const totalAmount = selectedRows.reduce((sum, r) => sum + parseInt(r.amount || 0), 0);

    return (
        <div className="container">
            <header className="no-print">
                <h1>出差費用報銷小幫手</h1>
                <p className="subtitle">貼上悠遊卡明細，快速勾選並產生報表</p>
            </header>

            {/* Paste Section */}
            <div className="paste-section no-print">
                <h3>1. 貼上明細資料</h3>
                <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>
                    請直接從網頁複製完整的表格內容並貼在下方 (包含日期、地點、金額等欄位)
                </p>
                <textarea
                    className="input-area"
                    placeholder="在此貼上資料..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                />
                <button className="btn" onClick={handleParse}>
                    <ArrowRight size={20} />
                    開始解析
                </button>
            </div>

            {/* Results Section */}
            {rows.length > 0 && (
                <>
                    <div className="actions-bar no-print">
                        <div style={{ marginRight: 'auto', alignSelf: 'center', fontWeight: 'bold' }}>
                            已選取: {selectedRows.length} 筆 | 總金額: ${totalAmount}
                        </div>
                        <button className="btn secondary" onClick={() => setRows([])}>
                            <Trash2 size={18} /> 清除全部
                        </button>
                        <button className="btn" onClick={handlePrint}>
                            <Printer size={18} /> 列印 / 存為 PDF
                        </button>
                    </div>

                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th className="checkbox-col no-print">
                                        <CheckSquare size={16} />
                                    </th>
                                    <th style={{ width: '120px' }}>日期</th>
                                    <th style={{ width: '100px' }}>交通方式</th>
                                    <th>起訖點 / 行程說明 (起點 - 終點)</th>
                                    <th style={{ width: '100px' }}>金額</th>
                                    <th style={{ width: '150px' }} className="no-print">備註</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(row => (
                                    <tr key={row.id} style={{ opacity: row.selected ? 1 : 0.5 }}>
                                        <td className="checkbox-col no-print">
                                            <input
                                                type="checkbox"
                                                checked={row.selected}
                                                onChange={() => toggleSelect(row.id)}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                            />
                                        </td>
                                        <td>
                                            {row.selected ? (
                                                <input
                                                    type="text"
                                                    value={row.date}
                                                    onChange={(e) => updateRow(row.id, 'date', e.target.value)}
                                                />
                                            ) : (
                                                <span>{row.date}</span>
                                            )}
                                        </td>
                                        <td>
                                            {row.selected ? (
                                                <select
                                                    value={row.transport}
                                                    onChange={(e) => updateRow(row.id, 'transport', e.target.value)}
                                                >
                                                    <option value="捷運">捷運</option>
                                                    <option value="公車">公車</option>
                                                    <option value="高鐵">高鐵</option>
                                                    <option value="台鐵">台鐵</option>
                                                    <option value="計程車">計程車</option>
                                                    <option value="客運">客運</option>
                                                    <option value="其他">其他</option>
                                                </select>
                                            ) : (
                                                <span>{row.transport}</span>
                                            )}
                                        </td>
                                        <td>
                                            {row.selected ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <input
                                                        type="text"
                                                        placeholder="起點"
                                                        value={row.startPoint}
                                                        onChange={(e) => updateRow(row.id, 'startPoint', e.target.value)}
                                                        style={{ width: '45%' }}
                                                    />
                                                    <span>-</span>
                                                    <input
                                                        type="text"
                                                        placeholder="終點"
                                                        value={row.endPoint}
                                                        onChange={(e) => updateRow(row.id, 'endPoint', e.target.value)}
                                                        style={{ width: '45%' }}
                                                    />
                                                </div>
                                            ) : (
                                                <span>{row.startPoint} - {row.endPoint}</span>
                                            )}
                                        </td>
                                        <td>
                                            {row.selected ? (
                                                <input
                                                    type="text"
                                                    value={row.amount}
                                                    onChange={(e) => updateRow(row.id, 'amount', e.target.value)}
                                                />
                                            ) : (
                                                <span>{row.amount}</span>
                                            )}
                                        </td>
                                        <td className="no-print">
                                            <input
                                                type="text"
                                                placeholder="選填備註"
                                                value={row.memo}
                                                onChange={(e) => updateRow(row.id, 'memo', e.target.value)}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

export default App;
