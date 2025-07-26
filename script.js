document.addEventListener('DOMContentLoaded', () => {
    // !!! THAY THẾ URL NÀY BẰNG URL WEB APP CỦA BẠN !!!
    const GOOGLE_SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbwQv-mykdLfo_s1VAmThG7SY-qDdym7UvKHj94D1aZ2h2wmmldEiKxAIX_xqOBmt6eV/exec';

    // DOM Elements
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
    // DOM Elements cho bảng ma trận
    const summaryHead = document.getElementById('project-status-summary-head');
    const summaryBody = document.getElementById('project-status-summary-body');
    const summaryFoot = document.getElementById('project-status-summary-foot');
    const matrixTable = summaryHead.closest('.summary-matrix-table');
    // DOM Element cho biểu đồ
    const chartCanvas = document.getElementById('monthly-chart');

    // App state
    let allTasks = [];
    let displayedTasks = [];
    let myMonthlyChart; // Biến giữ instance của biểu đồ

    // State for main pagination
    let currentPage = 1;
    const rowsPerPage = 10;

    // State for sorting
    let sortKey = 'Deadline';
    let sortDirection = 'asc';

    // State for quick filter tabs
    let activeTabFilter = 'all'; 

    function linkify(text) {
        if (!text) return '';
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
    }

    function renderTable() {
        tableBody.innerHTML = '';
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const paginatedTasks = displayedTasks.slice(startIndex, endIndex);

        if (paginatedTasks.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Không có dữ liệu phù hợp.</td></tr>`;
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        const excludedStatuses = ['Done', 'On Hold', 'Cancelled'];

        let rowsHtml = '';
        paginatedTasks.forEach(task => {
            let overdueLabelHtml = '';
            if (task.End) {
                const taskDeadline = new Date(task.End);
                if (taskDeadline < today && !excludedStatuses.includes(task.Status)) {
                    overdueLabelHtml = '<span class="label overdue-label">Overdue</span>';
                }
            }
            
            const linkedNote = linkify(task.Note || '');

            rowsHtml += `
                <tr data-id="${task.ID}">
                    <td>${task.ID || ''}</td>
                    <td>${task.Task || ''}</td>
                    <td>${task.Project || ''}</td>
                    <td>${task.Category || ''}</td>
                    <td>${task.Type || ''}</td>
                    <td>${task.Start ? new Date(task.Start).toLocaleDateString('vi-VN') : ''}</td>
                    <td>${task.End ? new Date(task.End).toLocaleDateString('vi-VN') : ''} ${overdueLabelHtml}</td>
                    <td>${task.Status || ''}</td>
                    <td>${linkedNote}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-icon btn-edit" data-id="${task.ID}" title="Sửa Task">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="btn btn-icon btn-delete" data-id="${task.ID}" title="Xóa Task">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = rowsHtml;
    }

    async function main() {
        loadingIndicator.style.display = 'block';
        loadingIndicator.textContent = 'Đang tải dữ liệu...';
        try {
            const response = await fetch(GOOGLE_SHEET_API_URL);
            if (!response.ok) throw new Error('Network response was not ok');
            allTasks = await response.json();
            populateFilterDropdowns();
            applyFiltersAndSort();
        } catch (error) {
            loadingIndicator.textContent = `Lỗi: ${error.message}. Vui lòng kiểm tra URL API và kết nối mạng.`;
        } finally {
            loadingIndicator.style.display = 'none';
        }
    }

    function populateFilterDropdowns() {
        const duAnFilter = document.getElementById('filter-du-an');
        const uniqueDuAn = [...new Set(allTasks.map(task => task.Project).filter(Boolean))].sort();
        const currentDuAn = duAnFilter.value;
        duAnFilter.innerHTML = '<option value="">Tất cả Dự Án</option>';
        uniqueDuAn.forEach(item => duAnFilter.innerHTML += `<option value="${item}">${item}</option>`);
        duAnFilter.value = currentDuAn;
    }
    
    function renderProjectStatusSummary(tasks) {
        if (tasks.length === 0) {
            summaryHead.innerHTML = '';
            summaryBody.innerHTML = `<tr><td style="text-align: center;">Không có dữ liệu.</td></tr>`;
            summaryFoot.innerHTML = '';
            return;
        }

        const statusOrder = ["To Do", "In Progress", "Done", "On Hold", "Cancelled"];
        const allStatuses = [...new Set(tasks.map(t => t.TrangThai || 'Không xác định'))];
        const sortedStatuses = statusOrder.filter(s => allStatuses.includes(s))
                                         .concat(allStatuses.filter(s => !statusOrder.includes(s)).sort());

        const summaryData = tasks.reduce((acc, task) => {
            const project = task.Project || 'Chưa có';
            const status = task.Status || 'Không xác định';
            if (!acc[project]) acc[project] = {};
            acc[project][status] = (acc[project][status] || 0) + 1;
            return acc;
        }, {});

        const sortedProjects = Object.keys(summaryData).sort();

        let headHtml = '<tr><th class="sticky-col">Dự Án</th>';
        sortedStatuses.forEach(status => { headHtml += `<th>${status}</th>`; });
        headHtml += '<th>Tổng cộng</th></tr>';
        summaryHead.innerHTML = headHtml;

        let bodyHtml = '';
        const columnTotals = new Array(sortedStatuses.length + 1).fill(0);

        sortedProjects.forEach(project => {
            let rowTotal = 0;
            let rowHtml = `<tr><th class="sticky-col">${project}</th>`;
            sortedStatuses.forEach((status, index) => {
                const count = summaryData[project][status] || 0;
                rowHtml += `<td>${count}</td>`;
                rowTotal += count;
                columnTotals[index] += count;
            });
            rowHtml += `<td><strong>${rowTotal}</strong></td></tr>`;
            bodyHtml += rowHtml;
            columnTotals[columnTotals.length - 1] += rowTotal;
        });
        summaryBody.innerHTML = bodyHtml;

        let footHtml = '<tr><th class="sticky-col">Tổng cộng</th>';
        columnTotals.forEach(total => { footHtml += `<td><strong>${total}</strong></td>`; });
        footHtml += '</tr>';
        summaryFoot.innerHTML = footHtml;
    }
    
    // --- HÀM MỚI: RENDER BIỂU ĐỒ THÁNG ---
    function renderMonthlyChart(tasks) {
        const statusColors = {
            'To Do': 'rgba(243, 156, 18, 0.7)',
            'In Progress': 'rgba(52, 152, 219, 0.7)',
            'Done': 'rgba(39, 174, 96, 0.7)',
            'On Hold': 'rgba(149, 165, 166, 0.7)',
            'Cancelled': 'rgba(231, 76, 60, 0.7)',
            'Không xác định': 'rgba(127, 140, 141, 0.7)'
        };

        const monthlyData = tasks.reduce((acc, task) => {
            if (!task.Start) return acc;
            const date = new Date(task.Start);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const status = task.Status || 'Không xác định';
            if (!acc[key]) acc[key] = {};
            acc[key][status] = (acc[key][status] || 0) + 1;
            return acc;
        }, {});

        const sortedMonths = Object.keys(monthlyData).sort();
        const allStatuses = [...new Set(tasks.map(t => t.TrangThai || 'Không xác định'))];
        
        const datasets = allStatuses.map(status => {
            return {
                label: status,
                data: sortedMonths.map(month => monthlyData[month][status] || 0),
                backgroundColor: statusColors[status] || 'rgba(189, 195, 199, 0.7)',
            };
        });

        const chartData = {
            labels: sortedMonths.map(key => {
                const [year, month] = key.split('-');
                return `${month}/${year}`;
            }),
            datasets: datasets
        };

        if (myMonthlyChart) {
            myMonthlyChart.destroy();
        }

        const ctx = chartCanvas.getContext('2d');
        myMonthlyChart = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: false },
                    tooltip: { mode: 'index', intersect: false },
                },
                scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Số lượng Task' } }
                }
            }
        });
    }

    function createAdvancedPagination(container, currentPage, totalItems, itemsPerPage, onPageChange) {
        container.innerHTML = '';
        const pageCount = Math.ceil(totalItems / itemsPerPage);
        if (pageCount <= 1) return;

        const createButton = (text, page, isDisabled = false) => {
            const button = document.createElement('button');
            button.innerHTML = text;
            button.className = 'btn';
            button.disabled = isDisabled;
            button.addEventListener('click', () => onPageChange(page));
            return button;
        };

        container.appendChild(createButton('« Đầu', 1, currentPage === 1));
        container.appendChild(createButton('‹ Trước', currentPage - 1, currentPage === 1));

        const select = document.createElement('select');
        select.className = 'page-select';
        for (let i = 1; i <= pageCount; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            if (i === currentPage) option.selected = true;
            select.appendChild(option);
        }
        select.addEventListener('change', (e) => onPageChange(parseInt(e.target.value)));
        container.appendChild(select);
        
        const pageInfo = document.createElement('span');
        pageInfo.className = 'page-info';
        pageInfo.textContent = `/ ${pageCount}`;
        container.appendChild(pageInfo);

        container.appendChild(createButton('Sau ›', currentPage + 1, currentPage === pageCount));
        container.appendChild(createButton('Cuối »', pageCount, currentPage === pageCount));
    }

    function buildMainPagination() {
        createAdvancedPagination(
            paginationContainer,
            currentPage,
            displayedTasks.length,
            rowsPerPage,
            (newPage) => {
                currentPage = newPage;
                renderTable();
                buildMainPagination(); 
            }
        );
    }

    function applyFiltersAndSort() {
        let intermediateTasks = [...allTasks];
        const excludedStatuses = ['Done', 'On Hold', 'Cancelled'];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (activeTabFilter === 'today') {
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);
            intermediateTasks = intermediateTasks.filter(task => {
                if (!task.End) return false;
                const taskDeadline = new Date(task.End);
                return taskDeadline >= today && taskDeadline <= todayEnd && !excludedStatuses.includes(task.Status);
            });
        } else if (activeTabFilter === 'upcoming') {
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const sevenDaysFromNow = new Date(today);
            sevenDaysFromNow.setDate(today.getDate() + 7);
            sevenDaysFromNow.setHours(23, 59, 59, 999);
            intermediateTasks = intermediateTasks.filter(task => {
                if (!task.End) return false;
                const taskDeadline = new Date(task.End);
                return taskDeadline >= tomorrow && taskDeadline <= sevenDaysFromNow && !excludedStatuses.includes(task.Status);
            });
        }
        
        let filteredTasks = [...intermediateTasks];
        const filters = {
            ID: document.getElementById('filter-id').value.trim(),
            TenTask: document.getElementById('filter-ten-task').value.trim().toLowerCase(),
            DuAn: document.getElementById('filter-du-an').value,
            TrangThai: document.getElementById('filter-trang-thai').value,
            ngayBatDauStart: document.getElementById('filter-ngay-bat-dau-start').value,
            ngayBatDauEnd: document.getElementById('filter-ngay-bat-dau-end').value,
            deadlineStart: document.getElementById('filter-deadline-start').value,
            deadlineEnd: document.getElementById('filter-deadline-end').value,
        };
        const ngayBatDauStartFilter = filters.ngayBatDauStart ? new Date(filters.ngayBatDauStart) : null;
        const ngayBatDauEndFilter = filters.ngayBatDauEnd ? new Date(filters.ngayBatDauEnd) : null;
        const deadlineStartFilter = filters.deadlineStart ? new Date(filters.deadlineStart) : null;
        const deadlineEndFilter = filters.deadlineEnd ? new Date(filters.deadlineEnd) : null;
        if (ngayBatDauEndFilter) ngayBatDauEndFilter.setHours(23, 59, 59, 999);
        if (deadlineEndFilter) deadlineEndFilter.setHours(23, 59, 59, 999);
        if (ngayBatDauStartFilter) ngayBatDauStartFilter.setHours(0, 0, 0, 0);
        if (deadlineStartFilter) deadlineStartFilter.setHours(0, 0, 0, 0);
        
        filteredTasks = filteredTasks.filter(task => {
            const taskNgayBatDau = task.Start ? new Date(task.Start) : null;
            const taskDeadline = task.End ? new Date(task.End) : null;
            return (!filters.ID || String(task.ID).includes(filters.ID)) &&
                   (!filters.TenTask || (task.TenTask || '').toLowerCase().includes(filters.TenTask)) &&
                   (!filters.DuAn || task.Project === filters.DuAn) &&
                   (!filters.TrangThai || task.Status === filters.TrangThai) &&
                   (!ngayBatDauStartFilter || (taskNgayBatDau && taskNgayBatDau >= ngayBatDauStartFilter)) &&
                   (!ngayBatDauEndFilter || (taskNgayBatDau && taskNgayBatDau <= ngayBatDauEndFilter)) &&
                   (!deadlineStartFilter || (taskDeadline && taskDeadline >= deadlineStartFilter)) &&
                   (!deadlineEndFilter || (taskDeadline && taskDeadline <= deadlineEndFilter));
        });

        // Cập nhật các bảng tóm tắt và biểu đồ
        renderProjectStatusSummary(filteredTasks);
        renderMonthlyChart(filteredTasks); // <-- Gọi hàm render biểu đồ mới
        
        if (sortKey) {
            filteredTasks.sort((a, b) => {
                let valA = a[sortKey]; let valB = b[sortKey];
                if (valA == null) return 1; if (valB == null) return -1;
                if (sortKey === 'NgayBatDau' || sortKey === 'Deadline') { valA = new Date(valA); valB = new Date(valB); }
                if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        displayedTasks = filteredTasks;
        currentPage = 1;
        updateSortIndicators();
        renderTable();
        buildMainPagination();
    }
    
    function updateSortIndicators() {
        tableHead.querySelectorAll('th.sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.dataset.sortKey === sortKey) th.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
        });
    }
    
    function formatDateForInput(dateString) { if (!dateString) return ''; try { const d = new Date(dateString); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; } catch (e) { return ''; } }
    
    function showModal(task = null) {
        taskForm.reset();
        const modalTitle = document.getElementById('modal-title');
        if (task) {
            modalTitle.textContent = 'Sửa Task';
            document.getElementById('taskId').value = task.ID;
            document.getElementById('tenTask').value = task.Task || '';
            document.getElementById('duAn').value = task.Project || '';
            document.getElementById('ngayBatDau').value = formatDateForInput(task.Start);
            document.getElementById('deadline').value = formatDateForInput(task.End);
            document.getElementById('trangThai').value = task.Status || 'To Do';
            document.getElementById('ghiChu').value = task.Note || '';
        } else {
            modalTitle.textContent = 'Thêm Task Mới';
            document.getElementById('taskId').value = allTasks.length > 0 ? Math.max(...allTasks.map(t => t.ID)) + 1 : 1;
        }
        modal.classList.remove('hidden');
    }
    
    function hideModal() { modal.classList.add('hidden'); }
    
    async function handleFormSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('taskId').value;
        const taskData = { 
            ID: parseInt(id), 
            TenTask: document.getElementById('tenTask').value, 
            DuAn: document.getElementById('duAn').value, 
            NgayBatDau: document.getElementById('ngayBatDau').value, 
            Deadline: document.getElementById('deadline').value, 
            TrangThai: document.getElementById('trangThai').value, 
            GhiChu: document.getElementById('ghiChu').value 
        };
        const isUpdating = allTasks.some(t => t.ID == id);
        sendDataToServer({ action: isUpdating ? 'updateTask' : 'addTask', task: taskData });
        if (isUpdating) {
            const index = allTasks.findIndex(t => t.ID == id);
            if (index !== -1) allTasks[index] = taskData;
        } else { allTasks.unshift(taskData); }
        hideModal(); populateFilterDropdowns(); applyFiltersAndSort(); alert('Lưu thành công!');
    }
    
    async function sendDataToServer(payload) { try { await fetch(GOOGLE_SHEET_API_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); } catch (error) { alert(`Lỗi kết nối: ${error.message}.`); } }
    
    addTaskBtn.addEventListener('click', () => showModal());
    reloadBtn.addEventListener('click', main);
    document.getElementById('cancel-btn').addEventListener('click', hideModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) hideModal(); });
    taskForm.addEventListener('submit', handleFormSubmit);

    tableBody.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const id = target.dataset.id;
        if (target.classList.contains('btn-edit')) {
            const taskToEdit = allTasks.find(t => t.ID == id);
            if (taskToEdit) showModal(taskToEdit);
        }
        if (target.classList.contains('btn-delete')) {
            if (confirm(`Bạn có chắc chắn muốn xóa task ID: ${id}?`)) {
                sendDataToServer({ action: 'deleteTask', task: { ID: id } });
                allTasks = allTasks.filter(t => t.ID != id);
                populateFilterDropdowns(); applyFiltersAndSort(); alert('Xóa thành công!');
            }
        }
    });

    filterControls.addEventListener('input', applyFiltersAndSort);
    resetFiltersBtn.addEventListener('click', () => { 
        filterControls.querySelectorAll('input, select').forEach(el => el.value = ''); 
        activeTabFilter = 'all';
        quickFilterTabs.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === 'all');
        });
        applyFiltersAndSort(); 
    });
    
    tableHead.addEventListener('click', (e) => {
        const th = e.target.closest('th.sortable');
        if (!th) return;
        const key = th.dataset.sortKey;
        if (sortKey === key) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortKey = key;
            sortDirection = 'asc';
        }
        applyFiltersAndSort();
    });

    quickFilterTabs.addEventListener('click', (e) => {
        const target = e.target.closest('.tab-btn');
        if (!target) return;
        quickFilterTabs.querySelector('.active').classList.remove('active');
        target.classList.add('active');
        activeTabFilter = target.dataset.filter;
        applyFiltersAndSort();
    });

    matrixTable.addEventListener('mouseover', (e) => {
        const cell = e.target.closest('th, td');
        if (!cell) return;
        const cellIndex = cell.cellIndex;
        if (cellIndex < 0) return;
        matrixTable.querySelectorAll('.col-hover').forEach(el => el.classList.remove('col-hover'));
        for (const row of matrixTable.rows) {
            if (row.cells[cellIndex]) {
                row.cells[cellIndex].classList.add('col-hover');
            }
        }
    });

    matrixTable.addEventListener('mouseout', () => {
        matrixTable.querySelectorAll('.col-hover').forEach(el => el.classList.remove('col-hover'));
    });

    main();
});
