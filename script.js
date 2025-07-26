document.addEventListener('DOMContentLoaded', () => {
    // !!! REPLACE THIS URL WITH YOUR WEB APP URL !!!
    const GOOGLE_SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbwQv-mykdLfo_s1VAmThG7SY-qDdym7UvKHj94D1aZ2h2wmmldEiKxAIX_xqOBmt6eV/exec';

    // ... (các DOM Elements và App State giữ nguyên như cũ) ...
    const currentTimeEl = document.getElementById('current-time');
    const motivationalQuoteEl = document.getElementById('motivational-quote');
    const loadingIndicator = document.getElementById('loading');
    const tableBody = document.getElementById('task-table-body');
    const tableHead = document.querySelector('#task-table thead');
    const paginationContainer = document.getElementById('pagination-container');
    const addTaskBtn = document.getElementById('add-task-btn');
    const reloadBtn = document.getElementById('reload-data-btn');
    const modal = document.getElementById('task-modal');
    const taskForm = document.getElementById('task-form');
    const filterControls = document.getElementById('filter-controls');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const quickFilterTabs = document.getElementById('quick-filter-tabs');
    const summaryHead = document.getElementById('project-status-summary-head');
    const summaryBody = document.getElementById('project-status-summary-body');
    const summaryFoot = document.getElementById('project-status-summary-foot');
    const matrixTable = summaryHead.closest('.summary-matrix-table');
    const monthlyChartCanvas = document.getElementById('monthly-chart');
    const comboChartCanvas = document.getElementById('combo-chart');
    const meetingTabs = document.getElementById('meeting-tabs');
    const meetingListContainer = document.getElementById('meeting-list-container');
    let allTasks = [];
    let displayedTasks = [];
    let myMonthlyChart, myComboChart;
    let currentPage = 1;
    const rowsPerPage = 10;
    let sortKey = 'End';
    let sortDirection = 'asc';
    let activeTabFilter = 'all';
    let meetingData = { today: [], upcoming: [] };
    const motivationalQuotes = [ "The best way to predict the future is to create it.", "Don't wait for opportunity. Create it.", "Success is not final, failure is not fatal: it is the courage to continue that counts.", "Believe you can and you're halfway there.", "The journey of a thousand miles begins with a single step.", "Only those who dare to fail greatly can ever achieve greatly.", "Do something today that your future self will thank you for.", "Discipline is the bridge between goals and accomplishment." ];
    const barChartColors = ['rgba(52, 152, 219, 0.8)', 'rgba(46, 204, 113, 0.8)', 'rgba(155, 89, 182, 0.8)', 'rgba(230, 126, 34, 0.8)', 'rgba(241, 196, 15, 0.8)', 'rgba(26, 188, 156, 0.8)', 'rgba(231, 76, 60, 0.8)'];
    const lineChartColors = ['#c0392b', '#8e44ad', '#2980b9', '#d35400', '#27ae60', '#f39c12', '#16a085'];
    
    // ... (các hàm linkify, renderTable, main, populateFilterDropdowns, ... giữ nguyên)
    function linkify(text) { if (!text) return ''; const urlRegex = /(https?:\/\/[^\s]+)/g; return text.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`); }
    function renderTable() { tableBody.innerHTML = ''; const startIndex = (currentPage - 1) * rowsPerPage; const endIndex = startIndex + rowsPerPage; const paginatedTasks = displayedTasks.slice(startIndex, endIndex); if (paginatedTasks.length === 0) { tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center;">No matching data found.</td></tr>`; return; } const today = new Date(); today.setHours(0, 0, 0, 0); const excludedStatuses = ['Done', 'On Hold', 'Cancelled']; let rowsHtml = ''; paginatedTasks.forEach(task => { let overdueLabelHtml = ''; if (task.End) { const taskDeadline = new Date(task.End); if (taskDeadline < today && !excludedStatuses.includes(task.Status)) { overdueLabelHtml = '<span class="label overdue-label">Overdue</span>'; } } const linkedNote = linkify(task.Note || ''); rowsHtml += ` <tr data-id="${task.ID}"> <td>${task.ID || ''}</td><td>${task.Task || ''}</td><td>${task.Project || ''}</td> <td>${task.Category || ''}</td><td>${task.Type || ''}</td> <td>${task.Start ? new Date(task.Start).toLocaleDateString('en-US') : ''}</td> <td>${task.End ? new Date(task.End).toLocaleDateString('en-US') : ''} ${overdueLabelHtml}</td> <td>${task.Status || ''}</td><td>${linkedNote}</td> <td><div class="action-buttons"> <button class="btn btn-icon btn-edit" data-id="${task.ID}" title="Edit Task"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button> <button class="btn btn-icon btn-delete" data-id="${task.ID}" title="Delete Task"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button> </div></td></tr>`; }); tableBody.innerHTML = rowsHtml; }
    async function main() { loadingIndicator.style.display = 'block'; loadingIndicator.textContent = 'Loading data...'; try { const response = await fetch(GOOGLE_SHEET_API_URL); if (!response.ok) throw new Error('Network response was not ok'); const data = await response.json(); if (data.status === 'error') throw new Error(data.message); allTasks = data; populateFilterDropdowns(); applyFiltersAndSort(); } catch (error) { loadingIndicator.textContent = `Error: ${error.message}. Please check the API URL and network connection.`; } finally { loadingIndicator.style.display = 'none'; } }
    function populateFilterDropdowns() { const populateSelect = (elementId, dataKey, defaultText) => { const selectElement = document.getElementById(elementId); const uniqueItems = [...new Set(allTasks.map(task => task[dataKey]).filter(Boolean))].sort(); const currentValue = selectElement.value; selectElement.innerHTML = `<option value="">${defaultText}</option>`; uniqueItems.forEach(item => { selectElement.innerHTML += `<option value="${item}">${item}</option>`; }); selectElement.value = currentValue; }; populateSelect('filter-du-an', 'Project', 'All Projects'); populateSelect('filter-category', 'Category', 'All Categories'); populateSelect('filter-type', 'Type', 'All Types'); }
    function renderProjectStatusSummary(tasks) { if (tasks.length === 0) { summaryHead.innerHTML = ''; summaryBody.innerHTML = `<tr><td style="text-align: center;">No data available.</td></tr>`; summaryFoot.innerHTML = ''; return; } const statusOrder = ["To Do", "In Progress", "Done", "On Hold", "Cancelled"]; const allStatuses = [...new Set(tasks.map(t => t.Status || 'Undefined'))]; const sortedStatuses = statusOrder.filter(s => allStatuses.includes(s)).concat(allStatuses.filter(s => !statusOrder.includes(s)).sort()); const summaryData = tasks.reduce((acc, task) => { const project = task.Project || 'Unassigned'; const status = task.Status || 'Undefined'; if (!acc[project]) acc[project] = {}; acc[project][status] = (acc[project][status] || 0) + 1; return acc; }, {}); const sortedProjects = Object.keys(summaryData).sort(); let headHtml = '<tr><th class="sticky-col">Project</th>'; sortedStatuses.forEach(status => { headHtml += `<th>${status}</th>`; }); headHtml += '<th>Total</th></tr>'; summaryHead.innerHTML = headHtml; let bodyHtml = ''; const columnTotals = new Array(sortedStatuses.length + 1).fill(0); sortedProjects.forEach(project => { let rowTotal = 0; let rowHtml = `<tr><th class="sticky-col">${project}</th>`; sortedStatuses.forEach((status, index) => { const count = summaryData[project][status] || 0; rowHtml += `<td>${count}</td>`; rowTotal += count; columnTotals[index] += count; }); rowHtml += `<td><strong>${rowTotal}</strong></td></tr>`; bodyHtml += rowHtml; columnTotals[columnTotals.length - 1] += rowTotal; }); summaryBody.innerHTML = bodyHtml; let footHtml = '<tr><th class="sticky-col">Total</th>'; columnTotals.forEach(total => { footHtml += `<td><strong>${total}</strong></td>`; }); footHtml += '</tr>'; summaryFoot.innerHTML = footHtml; }
    function renderMonthlyChart(tasks) { const statusColors = { 'To Do': 'rgba(243, 156, 18, 0.7)', 'In Progress': 'rgba(52, 152, 219, 0.7)', 'Done': 'rgba(39, 174, 96, 0.7)', 'On Hold': 'rgba(149, 165, 166, 0.7)', 'Cancelled': 'rgba(231, 76, 60, 0.7)', 'Undefined': 'rgba(127, 140, 141, 0.7)' }; const monthlyData = tasks.reduce((acc, task) => { if (!task.Start) return acc; const date = new Date(task.Start); const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; const status = task.Status || 'Undefined'; if (!acc[key]) acc[key] = {}; acc[key][status] = (acc[key][status] || 0) + 1; return acc; }, {}); const sortedMonths = Object.keys(monthlyData).sort(); const allStatuses = [...new Set(tasks.map(t => t.Status || 'Undefined'))]; const datasets = allStatuses.map(status => ({ label: status, data: sortedMonths.map(month => monthlyData[month][status] || 0), backgroundColor: statusColors[status] || 'rgba(189, 195, 199, 0.7)' })); const chartData = { labels: sortedMonths.map(key => { const [year, month] = key.split('-'); return `${month}/${year}`; }), datasets: datasets }; if (myMonthlyChart) myMonthlyChart.destroy(); const ctx = monthlyChartCanvas.getContext('2d'); myMonthlyChart = new Chart(ctx, { type: 'bar', data: chartData, options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: false }, tooltip: { mode: 'index', intersect: false } }, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Number of Tasks' } } } } }); }
    function renderComboChart(tasks) { if (myComboChart) myComboChart.destroy(); const monthlyData = tasks.reduce((acc, task) => { if (!task.Start) return acc; const date = new Date(task.Start); const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; const category = task.Category || 'Unassigned Category'; const type = task.Type || 'Unassigned Type'; if (!acc[key]) acc[key] = { categories: {}, types: {} }; acc[key].categories[category] = (acc[key].categories[category] || 0) + 1; acc[key].types[type] = (acc[key].types[type] || 0) + 1; return acc; }, {}); const sortedMonths = Object.keys(monthlyData).sort(); const allCategories = [...new Set(tasks.map(t => t.Category || 'Unassigned Category'))]; const allTypes = [...new Set(tasks.map(t => t.Type || 'Unassigned Type'))]; const categoryDatasets = allCategories.map((category, index) => ({ type: 'bar', label: category, data: sortedMonths.map(month => (monthlyData[month].categories && monthlyData[month].categories[category]) || 0), backgroundColor: barChartColors[index % barChartColors.length], yAxisID: 'y' })); const typeDatasets = allTypes.map((type, index) => ({ type: 'line', label: type, data: sortedMonths.map(month => (monthlyData[month].types && monthlyData[month].types[type]) || 0), borderColor: lineChartColors[index % lineChartColors.length], borderWidth: 2.5, pointBackgroundColor: lineChartColors[index % lineChartColors.length], pointRadius: 4, tension: 0.1, yAxisID: 'y1' })); const chartData = { labels: sortedMonths.map(key => { const [year, month] = key.split('-'); return `${month}/${year}`; }), datasets: [...categoryDatasets, ...typeDatasets] }; const ctx = comboChartCanvas.getContext('2d'); myComboChart = new Chart(ctx, { type: 'bar', data: chartData, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false, }, plugins: { title: { display: false }, tooltip: { mode: 'index', intersect: false } }, scales: { x: { stacked: true, }, y: { type: 'linear', display: true, position: 'left', stacked: true, title: { display: true, text: 'Count by Category' } }, y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Count by Type' }, grid: { drawOnChartArea: false, }, ticks: { beginAtZero: true } }, } } }); }

    // START: NEW HELPER FUNCTION TO EXTRACT TIME
    /**
     * Extracts a 24-hour time (HHMM or HHMM-HHMM) from a note string.
     * @param {string} noteText The text of the note.
     * @returns {object|null} An object {start: "HHMM", end: "HHMM"|null} or null if not found.
     */
    function extractTimeFromNote(noteText) {
        if (!noteText) return null;
        // Regex to find HHMM-HHMM or a single HHMM (e.g., 0930-1530 or 1400)
        const timeRegex = /\b(\d{4})\s*-\s*(\d{4})\b|\b(\d{4})\b/;
        const match = noteText.match(timeRegex);

        if (!match) return null;

        // Matched a range like "0930-1530"
        if (match[1] && match[2]) {
            return { start: match[1], end: match[2] };
        }
        // Matched a single time like "1400"
        if (match[3]) {
            return { start: match[3], end: null };
        }

        return null;
    }
    // END: NEW HELPER FUNCTION

    // START: HEAVILY MODIFIED FUNCTION
    function renderMeetingSchedule(tasks) {
        // Step 1: Filter for potential meetings and process them
        const processedMeetings = tasks
            .filter(task => task.Category === 'Meeting' && task.Start && !['Done', 'Cancelled'].includes(task.Status))
            .map(meeting => {
                const timeInfo = extractTimeFromNote(meeting.Note);
                if (!timeInfo) {
                    return null; // This meeting is invalid if no time is in the note
                }

                // Create the precise date and time object for the meeting start
                const baseDate = new Date(meeting.Start);
                const startHour = parseInt(timeInfo.start.substring(0, 2), 10);
                const startMin = parseInt(timeInfo.start.substring(2, 4), 10);
                const meetingDateTime = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), startHour, startMin);

                // Create a user-friendly display time string
                let displayTime = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
                if (timeInfo.end) {
                    const endHour = timeInfo.end.substring(0, 2);
                    const endMin = timeInfo.end.substring(2, 4);
                    displayTime += ` - ${endHour}:${endMin}`;
                }

                // Return a new object with all the necessary info
                return {
                    ...meeting,
                    meetingDateTime,
                    displayTime
                };
            })
            .filter(Boolean) // Remove any null entries (meetings without valid time)
            .sort((a, b) => a.meetingDateTime - b.meetingDateTime); // Sort by the precise time

        // Step 2: Categorize into 'today' and 'upcoming'
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const sevenDaysFromNow = new Date(today);
        sevenDaysFromNow.setDate(today.getDate() + 7);
        sevenDaysFromNow.setHours(23, 59, 59, 999);

        meetingData.today = processedMeetings.filter(m =>
            m.meetingDateTime >= today && m.meetingDateTime <= todayEnd
        );

        meetingData.upcoming = processedMeetings.filter(m =>
            m.meetingDateTime >= tomorrow && m.meetingDateTime <= sevenDaysFromNow
        );
        
        // Step 3: Render the currently active tab
        const activeFilter = meetingTabs.querySelector('.active').dataset.filter;
        displayMeetings(activeFilter === 'today' ? meetingData.today : meetingData.upcoming, activeFilter);
    }
    // END: HEAVILY MODIFIED FUNCTION
    
    // START: SLIGHTLY MODIFIED FUNCTION
    function displayMeetings(meetingsToDisplay, filterType) {
        meetingListContainer.innerHTML = '';
        if (meetingsToDisplay.length === 0) {
            meetingListContainer.innerHTML = `<div class="no-meetings">No meetings scheduled.</div>`;
            return;
        }

        let meetingsHtml = '';
        let lastDate = null; 

        meetingsToDisplay.forEach(meeting => {
            // Use the pre-calculated `meetingDateTime` object
            const meetingDate = meeting.meetingDateTime; 

            if (filterType === 'upcoming') {
                const currentDateStr = meetingDate.toDateString();
                if (currentDateStr !== lastDate) {
                    const dateHeader = meetingDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
                    meetingsHtml += `<h4 class="meeting-date-header">${dateHeader}</h4>`;
                    lastDate = currentDateStr;
                }
            }
            
            // Use the pre-formatted `displayTime` string
            meetingsHtml += `
                <div class="meeting-item">
                    <div class="meeting-time">${meeting.displayTime}</div>
                    <div class="meeting-details">
                        ${meeting.Task}
                        <span class="meeting-project">(${meeting.Project})</span>
                    </div>
                </div>
            `;
        });
        meetingListContainer.innerHTML = meetingsHtml;
    }
    // END: SLIGHTLY MODIFIED FUNCTION
    
    // ... (rest of the file remains the same) ...
    function createAdvancedPagination(container, currentPage, totalItems, itemsPerPage, onPageChange) { container.innerHTML = ''; const pageCount = Math.ceil(totalItems / itemsPerPage); if (pageCount <= 1) return; const createButton = (text, page, isDisabled = false) => { const button = document.createElement('button'); button.innerHTML = text; button.className = 'btn'; button.disabled = isDisabled; button.addEventListener('click', () => onPageChange(page)); return button; }; container.appendChild(createButton('« First', 1, currentPage === 1)); container.appendChild(createButton('‹ Prev', currentPage - 1, currentPage === 1)); const select = document.createElement('select'); select.className = 'page-select'; for (let i = 1; i <= pageCount; i++) { const option = document.createElement('option'); option.value = i; option.textContent = i; if (i === currentPage) option.selected = true; select.appendChild(option); } select.addEventListener('change', (e) => onPageChange(parseInt(e.target.value))); container.appendChild(select); const pageInfo = document.createElement('span'); pageInfo.className = 'page-info'; pageInfo.textContent = `/ ${pageCount}`; container.appendChild(pageInfo); container.appendChild(createButton('Next ›', currentPage + 1, currentPage === pageCount)); container.appendChild(createButton('Last »', pageCount, currentPage === pageCount)); }
    function buildMainPagination() { createAdvancedPagination(paginationContainer, currentPage, displayedTasks.length, rowsPerPage, (newPage) => { currentPage = newPage; renderTable(); buildMainPagination(); }); }
    function applyFiltersAndSort() { let intermediateTasks = [...allTasks]; const excludedStatuses = ['Done', 'On Hold', 'Cancelled']; const today = new Date(); today.setHours(0, 0, 0, 0); if (activeTabFilter === 'today') { const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999); intermediateTasks = intermediateTasks.filter(task => { if (!task.End) return false; const taskDeadline = new Date(task.End); return taskDeadline >= today && taskDeadline <= todayEnd && !excludedStatuses.includes(task.Status); }); } else if (activeTabFilter === 'upcoming') { const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1); const sevenDaysFromNow = new Date(today); sevenDaysFromNow.setDate(today.getDate() + 7); sevenDaysFromNow.setHours(23, 59, 59, 999); intermediateTasks = intermediateTasks.filter(task => { if (!task.End) return false; const taskDeadline = new Date(task.End); return taskDeadline >= tomorrow && taskDeadline <= sevenDaysFromNow && !excludedStatuses.includes(task.Status); }); } let filteredTasks = [...intermediateTasks]; const filters = { ID: document.getElementById('filter-id').value.trim(), Task: document.getElementById('filter-ten-task').value.trim().toLowerCase(), Project: document.getElementById('filter-du-an').value, Category: document.getElementById('filter-category').value, Type: document.getElementById('filter-type').value, Status: document.getElementById('filter-trang-thai').value, Start_start: document.getElementById('filter-ngay-bat-dau-start').value, Start_end: document.getElementById('filter-ngay-bat-dau-end').value, End_start: document.getElementById('filter-deadline-start').value, End_end: document.getElementById('filter-deadline-end').value, }; const ngayBatDauStartFilter = filters.Start_start ? new Date(filters.Start_start) : null; const ngayBatDauEndFilter = filters.Start_end ? new Date(filters.Start_end) : null; const deadlineStartFilter = filters.End_start ? new Date(filters.End_start) : null; const deadlineEndFilter = filters.End_end ? new Date(filters.End_end) : null; if (ngayBatDauEndFilter) ngayBatDauEndFilter.setHours(23, 59, 59, 999); if (deadlineEndFilter) deadlineEndFilter.setHours(23, 59, 59, 999); if (ngayBatDauStartFilter) ngayBatDauStartFilter.setHours(0, 0, 0, 0); if (deadlineStartFilter) deadlineStartFilter.setHours(0, 0, 0, 0); filteredTasks = filteredTasks.filter(task => { const taskNgayBatDau = task.Start ? new Date(task.Start) : null; const taskDeadline = task.End ? new Date(task.End) : null; return (!filters.ID || String(task.ID).includes(filters.ID)) && (!filters.Task || (task.Task || '').toLowerCase().includes(filters.Task)) && (!filters.Project || task.Project === filters.Project) && (!filters.Category || task.Category === filters.Category) && (!filters.Type || task.Type === filters.Type) && (!filters.Status || task.Status === filters.Status) && (!ngayBatDauStartFilter || (taskNgayBatDau && taskNgayBatDau >= ngayBatDauStartFilter)) && (!ngayBatDauEndFilter || (taskNgayBatDau && taskNgayBatDau <= ngayBatDauEndFilter)) && (!deadlineStartFilter || (taskDeadline && taskDeadline >= deadlineStartFilter)) && (!deadlineEndFilter || (taskDeadline && taskDeadline <= deadlineEndFilter)); }); renderProjectStatusSummary(filteredTasks); renderMonthlyChart(filteredTasks); renderComboChart(filteredTasks); renderMeetingSchedule(filteredTasks); if (sortKey) { filteredTasks.sort((a, b) => { let valA = a[sortKey]; let valB = b[sortKey]; if (valA === undefined || valA === null || valA === '') return 1; if (valB === undefined || valB === null || valB === '') return -1; if (sortKey === 'Start' || sortKey === 'End') { valA = new Date(valA); valB = new Date(valB); } if (valA < valB) return sortDirection === 'asc' ? -1 : 1; if (valA > valB) return sortDirection === 'asc' ? 1 : -1; return 0; }); } displayedTasks = filteredTasks; currentPage = 1; updateSortIndicators(); renderTable(); buildMainPagination(); }
    function updateSortIndicators() { tableHead.querySelectorAll('th.sortable').forEach(th => { th.classList.remove('sort-asc', 'sort-desc'); if (th.dataset.sortKey === sortKey) { th.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc'); } }); }
    function formatDateForInput(dateString) { if (!dateString) return ''; try { const d = new Date(dateString); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; } catch (e) { return ''; } }
    function showModal(task = null) { taskForm.reset(); const modalTitle = document.getElementById('modal-title'); if (task) { modalTitle.textContent = 'Edit Task'; document.getElementById('taskId').value = task.ID; document.getElementById('tenTask').value = task.Task || ''; document.getElementById('duAn').value = task.Project || ''; document.getElementById('danhMuc').value = task.Category || ''; document.getElementById('loaiTask').value = task.Type || ''; document.getElementById('ngayBatDau').value = formatDateForInput(task.Start); document.getElementById('deadline').value = formatDateForInput(task.End); document.getElementById('trangThai').value = task.Status || 'To Do'; document.getElementById('ghiChu').value = task.Note || ''; } else { modalTitle.textContent = 'Add New Task'; document.getElementById('taskId').value = allTasks.length > 0 ? Math.max(...allTasks.map(t => t.ID || 0)) + 1 : 1; } modal.classList.remove('hidden'); }
    function hideModal() { modal.classList.add('hidden'); }
    async function handleFormSubmit(e) { e.preventDefault(); const saveButton = e.target.querySelector('button[type="submit"]'); saveButton.disabled = true; saveButton.textContent = 'Saving...'; const id = document.getElementById('taskId').value; const taskData = { ID: parseInt(id), Task: document.getElementById('tenTask').value, Project: document.getElementById('duAn').value, Category: document.getElementById('danhMuc').value, Type: document.getElementById('loaiTask').value, Start: document.getElementById('ngayBatDau').value, End: document.getElementById('deadline').value, Status: document.getElementById('trangThai').value, Note: document.getElementById('ghiChu').value }; const isUpdating = allTasks.some(t => t.ID == id); const action = isUpdating ? 'updateTask' : 'addTask'; try { const response = await sendDataToServer({ action: action, task: taskData }); if(response.status === 'success') { if (isUpdating) { const index = allTasks.findIndex(t => t.ID == id); if (index !== -1) allTasks[index] = response.task; } else { allTasks.unshift(response.task); } alert(response.message); hideModal(); populateFilterDropdowns(); applyFiltersAndSort(); } else { throw new Error(response.message); } } catch (error) { alert(`Save failed: ${error.message}`); } finally { saveButton.disabled = false; saveButton.textContent = 'Save'; } }
    async function sendDataToServer(payload) { try { const response = await fetch(GOOGLE_SHEET_API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) }); if (!response.ok) throw new Error(`HTTP Error: ${response.status}`); return await response.json(); } catch (error) { return { status: 'error', message: error.message }; } }
    function updateTime() { if (!currentTimeEl) return; const now = new Date(); const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']; const dayName = days[now.getDay()]; const formattedDate = now.toLocaleDateString('en-US'); const formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); currentTimeEl.textContent = `${dayName}, ${formattedDate} - ${formattedTime}`; }
    function updateQuote() { if (!motivationalQuoteEl) return; const randomIndex = Math.floor(Math.random() * motivationalQuotes.length); motivationalQuoteEl.textContent = `"${motivationalQuotes[randomIndex]}"`; }
    addTaskBtn.addEventListener('click', () => showModal()); reloadBtn.addEventListener('click', main); document.getElementById('cancel-btn').addEventListener('click', hideModal); modal.addEventListener('click', (e) => { if (e.target === modal) hideModal(); }); taskForm.addEventListener('submit', handleFormSubmit); tableBody.addEventListener('click', async (e) => { const target = e.target.closest('button'); if (!target) return; const id = target.dataset.id; if (target.classList.contains('btn-edit')) { const taskToEdit = allTasks.find(t => t.ID == id); if (taskToEdit) showModal(taskToEdit); } if (target.classList.contains('btn-delete')) { if (confirm(`Are you sure you want to delete task ID: ${id}? This action cannot be undone.`)) { target.disabled = true; const response = await sendDataToServer({ action: 'deleteTask', task: { ID: id } }); if(response.status === 'success') { allTasks = allTasks.filter(t => t.ID != id); populateFilterDropdowns(); applyFiltersAndSort(); alert(response.message); } else { alert(`Deletion failed: ${response.message}`); target.disabled = false; } } } }); filterControls.addEventListener('input', applyFiltersAndSort); resetFiltersBtn.addEventListener('click', () => { filterControls.querySelectorAll('input, select').forEach(el => el.value = ''); activeTabFilter = 'all'; quickFilterTabs.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === 'all')); applyFiltersAndSort(); }); tableHead.addEventListener('click', (e) => { const th = e.target.closest('th.sortable'); if (!th) return; const key = th.dataset.sortKey; if (sortKey === key) { sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'; } else { sortKey = key; sortDirection = 'asc'; } applyFiltersAndSort(); }); quickFilterTabs.addEventListener('click', (e) => { const target = e.target.closest('.tab-btn'); if (!target) return; quickFilterTabs.querySelector('.active').classList.remove('active'); target.classList.add('active'); activeTabFilter = target.dataset.filter; applyFiltersAndSort(); }); matrixTable.addEventListener('mouseover', (e) => { const cell = e.target.closest('th, td'); if (!cell) return; const cellIndex = cell.cellIndex; if (cellIndex < 0) return; matrixTable.querySelectorAll('.col-hover').forEach(el => el.classList.remove('col-hover')); for (const row of matrixTable.rows) { if (row.cells[cellIndex]) row.cells[cellIndex].classList.add('col-hover'); } }); matrixTable.addEventListener('mouseout', () => { matrixTable.querySelectorAll('.col-hover').forEach(el => el.classList.remove('col-hover')); });
    meetingTabs.addEventListener('click', (e) => { const target = e.target.closest('.tab-btn-small'); if (!target) return; meetingTabs.querySelector('.active').classList.remove('active'); target.classList.add('active'); const filter = target.dataset.filter; displayMeetings(filter === 'today' ? meetingData.today : meetingData.upcoming, filter); });
    updateTime(); setInterval(updateTime, 1000); updateQuote(); setInterval(updateQuote, 2 * 60 * 60 * 1000); main();
});
