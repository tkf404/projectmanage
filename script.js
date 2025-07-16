document.addEventListener('DOMContentLoaded', function() {
    let masterTasks = []; let currentTasks = [];
    let sortState = { column: 'id', direction: 'asc' }; let columnFilters = {}; let gantt;

    function generateSampleData() {
        const projects = ['Phát triển App Di Động', 'Nâng cấp Hệ thống ERP', 'Chiến dịch Marketing 2025', 'Tổ chức Sự kiện Year-End'];
        const tasks = ['Lên kế hoạch', 'Thiết kế', 'Phát triển', 'Kiểm thử', 'Triển khai'];
        const subtasks = ['UI/UX', 'API Backend', 'Frontend Web', 'Test case', 'Deploy to Staging', 'Viết tài liệu', 'Báo cáo'];
        const statuses = ['Chưa bắt đầu', 'Bắt đầu', 'Đang thực hiện', 'Hoàn thành', 'Đang chờ', 'Hủy bỏ'];
        let sampleData = [];
        for (let i = 1; i <= 200; i++) {
            const start_date = new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
            const end_date = new Date(start_date.getTime() + (Math.floor(Math.random() * 20) + 3) * 24 * 60 * 60 * 1000);
            let dep = null; if (i > 10 && Math.random() > 0.6) { dep = Math.floor(Math.random() * (i - 1)) + 1; }
            sampleData.push({ id: i, project: projects[Math.floor(Math.random() * projects.length)], task: tasks[Math.floor(Math.random() * tasks.length)], subtask: subtasks[Math.floor(Math.random() * subtasks.length)], dependencies: dep, start: i % 5 === 0 ? null : formatDate(start_date), end: i % 7 === 0 ? null : formatDate(end_date), status: statuses[Math.floor(Math.random() * statuses.length)], note: Math.random() > 0.5 ? 'Cần review lại...' : '' });
        }
        return sampleData;
    }

    const isTaskBlocked = (task) => { if (!task.dependencies) return false; const prereqTask = masterTasks.find(t => t.id == task.dependencies); return prereqTask && prereqTask.status !== 'Hoàn thành'; };
    const getNewId = () => Math.max(0, ...masterTasks.map(t => t.id)) + 1;
    const formatDate = (date) => date.toISOString().split('T')[0];
    const formatDateForDisplay = (dateString) => { if (!dateString) return '...'; const [year, month, day] = dateString.split('-'); return `${day}/${month}/${year}`; };
    const updateProjectDatalist = () => { const projectList = document.getElementById('project-list'); projectList.innerHTML = [...new Set(masterTasks.map(t => t.project))].map(p => `<option value="${p}"></option>`).join(''); };
    
    const applyFiltersAndSort = () => {
        let filtered = [...masterTasks];
        const startDateFilter = document.getElementById('filter-start-date').value; const endDateFilter = document.getElementById('filter-end-date').value;
        if (startDateFilter && endDateFilter) { filtered = filtered.filter(task => { if (!task.start || !task.end) return false; return task.start <= endDateFilter && task.end >= startDateFilter; }); }
        Object.keys(columnFilters).forEach(key => { const filterValue = columnFilters[key] ? columnFilters[key].toLowerCase() : ''; if (filterValue) { filtered = filtered.filter(task => String(task[key] || '').toLowerCase().includes(filterValue)); } });
        filtered.sort((a, b) => {
            const valA = a[sortState.column] || ''; const valB = b[sortState.column] || '';
            const direction = sortState.direction === 'asc' ? 1 : -1;
            if (sortState.column === 'id' || sortState.column === 'dependencies') return (parseInt(valA) - parseInt(valB)) * direction;
            return String(valA).localeCompare(String(valB)) * direction;
        });
        currentTasks = filtered;
    };
    
    const renderTaskTable = () => {
        const tableBody = document.getElementById('task-table-body'); tableBody.innerHTML = '';
        currentTasks.forEach(task => {
            const isBlocked = isTaskBlocked(task); const statusSlug = (task.status || 'empty').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, ''); const statusClass = `status-${statusSlug}`;
            const row = document.createElement('tr'); row.dataset.id = task.id; if (isBlocked) { row.classList.add('blocked-task'); row.title = `Bị chặn bởi công việc ID: ${task.dependencies}`; }
            row.innerHTML = `
                <td>${task.project}</td><td>${task.id}</td><td>${task.task}</td><td>${task.subtask || ''}</td>
                <td>${task.dependencies || ''}</td>
                <td class="date-cell" data-field="start">${formatDateForDisplay(task.start)}</td><td class="date-cell" data-field="end">${formatDateForDisplay(task.end)}</td>
                <td class="status-cell">${task.status ? `<span class="status ${statusClass}">${task.status}</span>` : `<span style="color:#ccc;">...</span>`}</td>
                <td class="editable note-cell" contenteditable="true">${task.note || ''}</td><td><button class="btn-delete">✖</button></td>`;
            tableBody.appendChild(row);
        });
        updateSortIndicators();
    };

    const updateSortIndicators = () => { document.querySelectorAll('th.sortable span').forEach(span => span.textContent = ''); const activeHeader = document.querySelector(`th[data-sort="${sortState.column}"] span`); if (activeHeader) activeHeader.textContent = sortState.direction === 'asc' ? ' ▲' : ' ▼'; };
    
    const renderGantt = () => {
        const ganttChartElement = document.getElementById('gantt-chart'); ganttChartElement.innerHTML = '';
        let ganttTasks = currentTasks.filter(t => t.start && t.end).map(t => {
            const statusSlug = (t.status || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, '');
            return { id: String(t.id), name: t.subtask || t.task, start: t.start, end: t.end, dependencies: t.dependencies ? String(t.dependencies) : '', custom_class: `gantt-${statusSlug}` };
        });
        
        if (ganttTasks.length === 0) { ganttChartElement.innerHTML = `<p style="text-align:center; color:#999; padding: 20px;">Không có công việc nào để hiển thị trên biểu đồ.</p>`; return; }
        
        const targetYear = 2025; ganttTasks.push({ id: 'start_of_year', name: '', start: `${targetYear}-01-01`, end: `${targetYear}-01-02`, custom_class: 'gantt-dummy-task' }); ganttTasks.push({ id: 'end_of_year', name: '', start: `${targetYear}-12-30`, end: `${targetYear}-12-31`, custom_class: 'gantt-dummy-task' });
        
        gantt = new Gantt("#gantt-chart", ganttTasks, {
            on_date_change: (task, start, end) => {
                if(task.id === 'start_of_year' || task.id === 'end_of_year') return;
                const taskId = parseInt(task.id, 10); const masterTask = masterTasks.find(t => t.id === taskId);
                if (masterTask) { masterTask.start = formatDate(start); masterTask.end = formatDate(end); rerenderAll(); }
            }
        });
    };

    const rerenderAll = () => { applyFiltersAndSort(); renderTaskTable(); renderGantt(); updateProjectDatalist(); };
    document.getElementById('filter-btn').addEventListener('click', rerenderAll);
    document.getElementById('reset-filter-btn').addEventListener('click', () => { document.getElementById('filter-start-date').value = ''; document.getElementById('filter-end-date').value = ''; document.querySelectorAll('.filter-row input').forEach(input => input.value = ''); columnFilters = {}; rerenderAll(); });
    document.querySelectorAll('tr.filter-row input').forEach(input => { input.addEventListener('keyup', (e) => { columnFilters[e.target.dataset.filter] = e.target.value; rerenderAll(); }); });
    document.querySelectorAll('th.sortable').forEach(th => { th.addEventListener('click', () => { const column = th.dataset.sort; sortState.column === column ? sortState.direction = (sortState.direction === 'asc' ? 'desc' : 'asc') : (sortState = { column, direction: 'asc' }); rerenderAll(); }); });
    document.getElementById('add-task-form').addEventListener('submit', function(e) { e.preventDefault(); const depId = document.getElementById('task-deps').value; masterTasks.push({ id: getNewId(), project: document.getElementById('task-project').value, task: document.getElementById('task-main').value, subtask: document.getElementById('task-sub').value, dependencies: depId ? parseInt(depId, 10) : null, start: document.getElementById('task-start').value || null, end: document.getElementById('task-end').value || null, status: 'Chưa bắt đầu', note: '' }); rerenderAll(); this.reset(); });
    
    const tableBody = document.getElementById('task-table-body');
    tableBody.addEventListener('click', function(e) {
        const row = e.target.closest('tr'); if (!row) return; const taskId = row.dataset.id; const task = masterTasks.find(t => t.id == taskId);
        if (e.target.classList.contains('btn-delete')) { if (confirm(`Xóa công việc ID: ${taskId}?`)) { masterTasks = masterTasks.filter(t => t.id != taskId); rerenderAll(); } }
        if (e.target.tagName === 'SPAN' && e.target.parentElement.classList.contains('status-cell')) {
            const cell = e.target.parentElement; const currentStatus = e.target.textContent;
            cell.innerHTML = `<select class="status-edit" style="width:100%;"><option>Chưa bắt đầu</option><option>Bắt đầu</option><option>Đang thực hiện</option><option>Hoàn thành</option><option>Đang chờ</option><option>Hủy bỏ</option></select>`;
            const select = cell.querySelector('select'); select.value = currentStatus; select.focus();
            const saveStatus = () => {
                const newStatus = select.value;
                if ((newStatus === 'Bắt đầu' || newStatus === 'Đang thực hiện') && isTaskBlocked(task)) { alert(`Không thể bắt đầu! Công việc phụ thuộc ID: ${task.dependencies} chưa được hoàn thành.`); rerenderAll(); return; }
                task.status = newStatus; const today = formatDate(new Date());
                if (task.status === 'Bắt đầu' && !task.start) task.start = today;
                if (task.status === 'Hoàn thành' && !task.end) { task.end = today; if (!task.start) task.start = today; }
                rerenderAll();
            };
            select.addEventListener('blur', saveStatus); select.addEventListener('change', saveStatus);
        }
        if (e.target.classList.contains('date-cell')) {
            const cell = e.target; if(cell.querySelector('input')) return;
            const field = cell.dataset.field;
            cell.innerHTML = `<input type="date" value="${task[field] || ''}" style="width: 100%;">`;
            const input = cell.querySelector('input'); input.focus();
            const saveDate = () => { const originalValue = task[field]; task[field] = input.value || null; if (task.start && task.end && new Date(task.end) < new Date(task.start)) { alert("Lỗi: Ngày kết thúc không thể trước ngày bắt đầu!"); task[field] = originalValue; } rerenderAll(); };
            input.addEventListener('blur', saveDate); input.addEventListener('keydown', e => { if(e.key === 'Enter') saveDate(); });
        }
    });
    tableBody.addEventListener('input', e => { if (e.target.classList.contains('note-cell')) { const taskId = e.target.parentElement.dataset.id; const task = masterTasks.find(t => t.id == taskId); if (task) task.note = e.target.textContent; } });
    document.querySelectorAll('.view-btn').forEach(btn => { btn.addEventListener('click', function() { document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active')); this.classList.add('active'); if (gantt) gantt.change_view_mode(this.getAttribute('data-view')); }); });
    document.getElementById('today-btn').addEventListener('click', () => { if (gantt) { gantt.set_scroll_today(); } });
    Sortable.create(tableBody, { animation: 150, onEnd: evt => { const movedItem = masterTasks.splice(evt.oldIndex, 1)[0]; masterTasks.splice(evt.newIndex, 0, movedItem); renderGantt(); }});
    
    masterTasks = generateSampleData();
    rerenderAll();
});