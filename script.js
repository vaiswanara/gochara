    // Rashi and Nakshatra mappings
    const rashiNames = {
        '1': 'Mesha', '2': 'Vrushabha', '3': 'Mithuna', '4': 'Karka', '5': 'Simha', '6': 'Kanya',
        '7': 'Tula', '8': 'Vrischika', '9': 'Dhanu', '10': 'Makara', '11': 'Kumbha', '12': 'Meena'
    };
    const nakshatraNames = {
        '1': 'Ashwini', '2': 'Bharani', '3': 'Krittika', '4': 'Rohini', '5': 'Mrigashira', '6': 'Ardra',
        '7': 'Punarvasu', '8': 'Pushya', '9': 'Ashlesha', '10': 'Magha', '11': 'Purva Phalguni', '12': 'Uttara Phalguni',
        '13': 'Hasta', '14': 'Chitra', '15': 'Swati', '16': 'Vishakha', '17': 'Anuradha', '18': 'Jyeshtha',
        '19': 'Mula', '20': 'Purva Ashadha', '21': 'Uttara Ashadha', '22': 'Shravana', '23': 'Dhanishta', '24': 'Shatabhisha',
        '25': 'Purva Bhadrapada', '26': 'Uttara Bhadrapada', '27': 'Revati'
    };
// script.js
// Loads Ephemeris.json and renders the table with filtering on button click

document.addEventListener('DOMContentLoaded', () => {
    const table = document.getElementById('data-table');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    const fromDateInput = document.getElementById('from-date');
    const toDateInput = document.getElementById('to-date');
    const janmaRashiInput = document.getElementById('janma-rashi');
    const fetchBtn = document.getElementById('fetch-btn');
    const columnFiltersDiv = document.getElementById('column-filters');

    let data = [];
    let headers = [];
    let transitResults = {};
    let gocharaData = {}; // { planetLower: { transit_no: {Gochara_Phala, Reference} } }
    let columnFilters = {};

    // Fetch planet transit results JSON and map for quick lookup
    fetch('planets-transit-results.json')
        .then(response => response.json())
        .then(json => {
            transitResults = {};
            for (const planet of json.planets) {
                transitResults[planet.name.trim().toLowerCase()] = planet;
            }
        });

    // Fetch and parse Gochara_phala.csv into gocharaData for quick lookup
    fetch('Gochara_phala.csv')
        .then(response => response.text())
        .then(text => {
            const rows = parseCSV(text);
            // Expect header: Graha,Transit_Rashi_no,Gochara_Phala,Reference
            rows.forEach(r => {
                const graha = (r['Graha'] || '').trim();
                const transitNo = r['Transit_Rashi_no'] ? String(r['Transit_Rashi_no']).trim() : '';
                const phala = r['Gochara_Phala'] || '';
                const ref = r['Reference'] || '';
                if (!graha || !transitNo) return;
                const key = graha.toLowerCase();
                if (!gocharaData[key]) gocharaData[key] = {};
                gocharaData[key][transitNo] = { Gochara_Phala: phala, Reference: ref };
            });
        })
        .catch(err => {
            console.error('Failed to load Gochara_phala.csv', err);
        });

    fetchBtn.addEventListener('click', () => {
        fetch('Ephemeris.json')
            .then(response => response.json())
            .then(json => {
                data = json;
                headers = Object.keys(data[0]);
                setupColumnFilters();
                filterAndRender();
            });
    });

    function setupColumnFilters() {
        columnFiltersDiv.innerHTML = '';
        columnFilters = {};
        if (!headers.length) return;
    // Categorical columns for dropdown-checkboxes (remove Pada, Navamsha)
    const checkboxCols = ['Graha', 'Direction', 'Rashi', 'Nakshatra', 'Changes'];
    // Custom order for Graha filter
    const grahaOrder = ['Surya', 'Kuja', 'Budha', 'Guru', 'Sukra', 'Shani', 'Rahu'];
    // Columns to hide filters for (add Pada, Navamsha)
    const hideFilterCols = ['﻿Date', 'Longitude', 'Speed', 'Pada', 'Navamsha'];
    // Remove Navamsha from headers so it doesn't show in table
    headers = headers.filter(h => h !== 'Navamsha');
        const filterRow = document.createElement('div');
        filterRow.style.display = 'flex';
        filterRow.style.gap = '16px';
        headers.forEach(h => {
            if (hideFilterCols.includes(h)) return; // skip these columns
            let displayName = h.replace(/^\uFEFF/, '');
            if (h === 'Rashi') displayName = 'Rashi (Sign)';
            if (h === 'Nakshatra') displayName = 'Nakshatra (Star)';
            if (h === 'Navamsha') displayName = 'Navamsha (Sign)';
            const filterBox = document.createElement('div');
            filterBox.style.position = 'relative';
            filterBox.style.marginRight = '8px';
            if (checkboxCols.includes(h)) {
                // Dropdown-style button
                const dropdownBtn = document.createElement('button');
                dropdownBtn.type = 'button';
                dropdownBtn.textContent = displayName + ' ▼';
                dropdownBtn.style.minWidth = '120px';
                dropdownBtn.style.cursor = 'pointer';
                dropdownBtn.style.marginBottom = '4px';
                const dropdownPanel = document.createElement('div');
                dropdownPanel.style.display = 'none';
                dropdownPanel.style.position = 'absolute';
                dropdownPanel.style.background = '#fff';
                dropdownPanel.style.border = '1px solid #ccc';
                dropdownPanel.style.zIndex = '1000';
                dropdownPanel.style.maxHeight = '200px';
                dropdownPanel.style.overflowY = 'auto';
                dropdownPanel.style.padding = '8px';
                dropdownPanel.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                let uniqueVals;
                if (h === 'Graha') {
                    // Normalize data grahas for robust matching
                    const dataGrahasRaw = Array.from(new Set(data.map(row => row[h])));
                    const dataGrahas = dataGrahasRaw.map(g => (g || '').trim());
                    // Add all grahaOrder planets that are present in data (case/whitespace insensitive)
                    uniqueVals = grahaOrder.filter(orderName => dataGrahas.some(g => g.toLowerCase() === orderName.toLowerCase()));
                    // Add any extra planets from data not in grahaOrder
                    uniqueVals = [
                        ...uniqueVals,
                        ...dataGrahas.filter(g => !grahaOrder.some(orderName => orderName.toLowerCase() === g.toLowerCase()))
                    ];
                } else {
                    uniqueVals = Array.from(new Set(data.map(row => row[h]))).sort((a, b) => {
                        if (h === 'Rashi' || h === 'Navamsha') return parseInt(a) - parseInt(b);
                        if (h === 'Nakshatra') return parseInt(a) - parseInt(b);
                        return String(a).localeCompare(String(b));
                    });
                }
                columnFilters[h] = [];
                uniqueVals.forEach(val => {
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.value = val;
                    checkbox.addEventListener('change', () => {
                        const checked = Array.from(dropdownPanel.querySelectorAll('input[type=checkbox]:checked')).map(cb => cb.value);
                        columnFilters[h] = checked;
                        filterAndRender();
                    });
                    let labelText = val;
                    if (h === 'Rashi' || h === 'Navamsha') labelText = rashiNames[val] || val;
                    if (h === 'Nakshatra') labelText = nakshatraNames[val] || val;
                    const cbLabel = document.createElement('label');
                    cbLabel.style.display = 'flex';
                    cbLabel.style.alignItems = 'center';
                    cbLabel.appendChild(checkbox);
                    cbLabel.appendChild(document.createTextNode(' ' + labelText));
                    dropdownPanel.appendChild(cbLabel);
                });
                // Show/hide dropdown
                dropdownBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdownPanel.style.display = dropdownPanel.style.display === 'block' ? 'none' : 'block';
                });
                // Hide dropdown when clicking outside
                document.addEventListener('click', (e) => {
                    if (!filterBox.contains(e.target)) {
                        dropdownPanel.style.display = 'none';
                    }
                });
                filterBox.appendChild(dropdownBtn);
                filterBox.appendChild(dropdownPanel);
            } else {
                // Text input for other columns
                const input = document.createElement('input');
                input.type = 'text';
                input.placeholder = 'Filter';
                input.addEventListener('input', () => {
                    columnFilters[h] = input.value;
                    filterAndRender();
                });
                filterBox.appendChild(input);
            }
            filterRow.appendChild(filterBox);
        });
    // Result filter (Ausp, In-Ausp, -) in the same row as other filters
        // Clear Filter button
        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.textContent = 'Clear Filter';
        clearBtn.style.background = '#e11d48';
        clearBtn.style.color = '#fff';
        clearBtn.style.marginLeft = '12px';
        clearBtn.style.fontWeight = 'bold';
        clearBtn.style.border = 'none';
        clearBtn.style.borderRadius = '6px';
        clearBtn.style.padding = '6px 18px';
        clearBtn.style.fontSize = '1rem';
        clearBtn.style.cursor = 'pointer';
        clearBtn.addEventListener('mouseenter', () => clearBtn.style.background = '#be123c');
        clearBtn.addEventListener('mouseleave', () => clearBtn.style.background = '#e11d48');
        clearBtn.addEventListener('click', () => {
            // Reset all filters
            Object.keys(columnFilters).forEach(k => columnFilters[k] = Array.isArray(columnFilters[k]) ? [] : '');
            // Uncheck all checkboxes
            columnFiltersDiv.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
            // Reset text inputs
            columnFiltersDiv.querySelectorAll('input[type=text]').forEach(inp => inp.value = '');
            // Reset Result filter checkboxes
            columnFiltersDiv.querySelectorAll('button').forEach(btn => {
                if (btn.textContent.startsWith('Result')) {
                    const panel = btn.nextSibling;
                    if (panel) panel.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
                }
            });
            filterAndRender();
        });
        const resultBox = document.createElement('div');
        resultBox.style.position = 'relative';
        resultBox.style.marginRight = '8px';
        const resultBtn = document.createElement('button');
        resultBtn.type = 'button';
        resultBtn.textContent = 'Result ▼';
        resultBtn.style.minWidth = '120px';
        resultBtn.style.cursor = 'pointer';
        resultBtn.style.background = '#f1f5f9';
        resultBtn.style.color = '#374151';
        resultBtn.style.border = '1px solid #cbd5e1';
        resultBtn.style.borderRadius = '6px';
        resultBtn.style.padding = '6px 14px';
        resultBtn.style.fontSize = '1rem';
        resultBtn.style.marginBottom = '4px';
        const resultPanel = document.createElement('div');
        resultPanel.style.display = 'none';
        resultPanel.style.position = 'absolute';
        resultPanel.style.background = '#fff';
        resultPanel.style.border = '1px solid #ccc';
        resultPanel.style.zIndex = '1000';
        resultPanel.style.maxHeight = '200px';
        resultPanel.style.overflowY = 'auto';
        resultPanel.style.padding = '8px';
        resultPanel.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        const resultVals = ['Ausp', 'In-Ausp', '-'];
        columnFilters['Result'] = [];
        resultVals.forEach(val => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = val;
            checkbox.addEventListener('change', () => {
                const checked = Array.from(resultPanel.querySelectorAll('input[type=checkbox]:checked')).map(cb => cb.value);
                columnFilters['Result'] = checked;
                filterAndRender();
            });
            const cbLabel = document.createElement('label');
            cbLabel.style.display = 'flex';
            cbLabel.style.alignItems = 'center';
            cbLabel.appendChild(checkbox);
            cbLabel.appendChild(document.createTextNode(' ' + val));
            resultPanel.appendChild(cbLabel);
        });
        resultBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            resultPanel.style.display = resultPanel.style.display === 'block' ? 'none' : 'block';
        });
        document.addEventListener('click', (e) => {
            if (!resultBox.contains(e.target)) {
                resultPanel.style.display = 'none';
            }
        });
        resultBox.appendChild(resultBtn);
        resultBox.appendChild(resultPanel);
    filterRow.appendChild(resultBox);
    filterRow.appendChild(clearBtn);
    columnFiltersDiv.appendChild(filterRow);
    }

    function filterAndRender() {
        let filtered = data;
        const from = fromDateInput.value;
        const to = toDateInput.value;
        const janmaRashi = janmaRashiInput.value;
        if (from) {
            filtered = filtered.filter(row => parseDate(row['﻿Date']) >= parseDate(from));
        }
        if (to) {
            filtered = filtered.filter(row => parseDate(row['﻿Date']) <= parseDate(to));
        }
        // Apply column filters
        Object.entries(columnFilters).forEach(([col, val]) => {
            if (col === 'Result') return; // handle below
            if (Array.isArray(val) && val.length > 0) {
                if (col === 'Graha') {
                    // Compare trimmed values for Graha
                    filtered = filtered.filter(row => val.some(v => (row[col] || '').trim() === v));
                } else {
                    filtered = filtered.filter(row => val.includes(row[col]));
                }
            } else if (val && typeof val === 'string') {
                filtered = filtered.filter(row => {
                    if (typeof row[col] === 'string') {
                        return row[col].toLowerCase().includes(val.toLowerCase());
                    } else {
                        return row[col] == val;
                    }
                });
            }
        });
        // Result filter
        const resultVals = columnFilters['Result'];
        if (Array.isArray(resultVals) && resultVals.length > 0) {
            filtered = filtered.filter(row => {
                let result = '';
                if (janmaRashi && row['Rashi'] && row['Graha']) {
                    const planetName = row['Graha'].trim().toLowerCase();
                    const planetData = transitResults[planetName];
                    if (planetData) {
                        const dist = ((parseInt(row['Rashi']) - parseInt(janmaRashi) + 12) % 12) + 1;
                        if (planetData.positiveTransit.includes(dist)) {
                            result = 'Ausp';
                        } else if (planetData.negativeTransit.includes(dist)) {
                            result = 'In-Ausp';
                        } else {
                            result = '-';
                        }
                    }
                }
                return resultVals.includes(result);
            });
        }
        renderTable(filtered, janmaRashi);
    }

    function renderTable(rows, janmaRashi) {
        if (!headers.length) return;
        // Add Results and Info columns
        const allHeaders = [...headers, 'Result', 'Info'];
        // For mobile: use display names for data-labels
        const displayNames = allHeaders.map(h => {
            if (h === 'Rashi') return 'Rashi (Sign)';
            if (h === 'Nakshatra') return 'Nakshatra (Star)';
            return h.replace(/^\u000b/, '');
        });
        thead.innerHTML = '<tr>' + displayNames.map(name => `<th>${name}</th>`).join('') + '</tr>';
        tbody.innerHTML = rows.map(row => {
            const tds = headers.map((h, i) => {
                let val = row[h];
                if (h === 'Rashi') val = rashiNames[row[h]] || row[h];
                if (h === 'Nakshatra') val = nakshatraNames[row[h]] || row[h];
                return `<td data-label="${displayNames[i]}">${val}</td>`;
            });
            let result = '';
            let infoCell = '';
            if (janmaRashi && row['Rashi'] && row['Graha']) {
                const planetName = row['Graha'].trim().toLowerCase();
                const planetData = transitResults[planetName];
                if (planetData) {
                    // Calculate distance (1-based, wrap around 12)
                    const dist = ((parseInt(row['Rashi']) - parseInt(janmaRashi) + 12) % 12) + 1;
                    if (planetData.positiveTransit.includes(dist)) {
                        result = 'Ausp';
                    } else if (planetData.negativeTransit.includes(dist)) {
                        result = 'In-Ausp';
                    } else {
                        result = '-';
                    }
                    // Lookup gochara data by planet and transit number
                    const gdataForPlanet = gocharaData[planetName];
                    const distStr = String(dist);
                    if (gdataForPlanet && gdataForPlanet[distStr]) {
                        // render an info button with data attributes
                        const safePhala = escapeHtml(gdataForPlanet[distStr].Gochara_Phala || '');
                        const safeRef = escapeHtml(gdataForPlanet[distStr].Reference || '');
                        infoCell = `<td data-label="${displayNames[displayNames.length-1]}">` +
                                   `<button class="info-btn" data-planet="${planetName}" data-dist="${distStr}" ` +
                                   `data-phala="${safePhala}" data-ref="${safeRef}" style="cursor:pointer">&#x2139;</button></td>`;
                    } else {
                        infoCell = `<td data-label="${displayNames[displayNames.length-1]}"></td>`;
                    }
                }
            }
            tds.push(`<td data-label="${displayNames[displayNames.length-1]}">${result}</td>`);
            // Append the info cell (already contains a td)
            tds.push(infoCell);
            return '<tr>' + tds.join('') + '</tr>';
        }).join('');

        // Attach click handlers to info buttons for popover display
        // Use event delegation on tbody to avoid re-querying too much
        const existingPopover = document.querySelector('.info-popover');
        if (existingPopover) existingPopover.remove();
        tbody.querySelectorAll('.info-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Remove any existing popover
                document.querySelectorAll('.info-popover').forEach(p => p.remove());
                const planet = btn.getAttribute('data-planet');
                const dist = btn.getAttribute('data-dist');
                const phala = btn.getAttribute('data-phala');
                const ref = btn.getAttribute('data-ref');
                const pop = document.createElement('div');
                pop.className = 'info-popover';
                pop.style.position = 'absolute';
                pop.style.background = '#fff';
                pop.style.border = '1px solid #ccc';
                pop.style.padding = '12px';
                pop.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
                pop.style.zIndex = 2000;
                pop.innerHTML = `<div style="font-weight:700;margin-bottom:6px">Transit Rashi #: ${dist}</div>` +
                                `<div style="margin-bottom:6px"><strong>Gochara Phala:</strong><div>${phala}</div></div>` +
                                `<div><strong>Reference:</strong><div>${ref}</div></div>`;
                document.body.appendChild(pop);
                // Position near button
                const rect = btn.getBoundingClientRect();
                pop.style.left = Math.min(window.innerWidth - 320, rect.left + window.scrollX) + 'px';
                pop.style.top = (rect.bottom + window.scrollY + 8) + 'px';
                // Close on outside click
                const closeOnOutside = (ev) => {
                    if (!pop.contains(ev.target) && ev.target !== btn) {
                        pop.remove();
                        document.removeEventListener('click', closeOnOutside);
                    }
                };
                document.addEventListener('click', closeOnOutside);
            });
        });
    }

    // Simple CSV parser that handles quoted fields and returns array of objects
    function parseCSV(text) {
        const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
        if (!lines.length) return [];
        // Split header
        const headers = splitCSVLine(lines[0]).map(h => h.replace(/\uFEFF/g, '').trim());
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const parts = splitCSVLine(lines[i]);
            if (parts.length === 0) continue;
            const obj = {};
            for (let j = 0; j < headers.length; j++) {
                obj[headers[j]] = parts[j] !== undefined ? parts[j] : '';
            }
            rows.push(obj);
        }
        return rows;
    }

    // Splits a CSV line into fields, handling double-quoted fields
    function splitCSVLine(line) {
        const res = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                // Peek next char for escaped quote
                if (inQuotes && line[i+1] === '"') {
                    cur += '"';
                    i++; // skip escaped quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (ch === ',' && !inQuotes) {
                res.push(cur);
                cur = '';
            } else {
                cur += ch;
            }
        }
        res.push(cur);
        return res.map(s => s.trim());
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function parseDate(str) {
        // Handles both yyyy-mm-dd (input) and dd-MMM-yy (data)
        if (/\d{4}-\d{2}-\d{2}/.test(str)) {
            return new Date(str);
        }
        // e.g., 01-Jan-25
        const [d, m, y] = str.split('-');
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return new Date('20' + y, months.indexOf(m), d);
    }
});
