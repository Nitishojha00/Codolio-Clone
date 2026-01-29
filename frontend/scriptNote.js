const API_BASE_URL = "https://codolio-clone.onrender.com"; 
axios.defaults.withCredentials = true;

let currentState = { view: 'importance', page: 1, tag: '', stars: 0 };
let isEditing = false; // Flag to check if we are updating


document.addEventListener('DOMContentLoaded', () => {
    loadView('importance'); 

    // Search Listener
    document.getElementById('tagSearchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            currentState.tag = e.target.value.trim();
            loadView(currentState.tag ? 'tag' : 'importance');
        }
    });

    // Form Listener (Handles BOTH Create and Update)
    document.getElementById('createForm').addEventListener('submit', handleFormSubmit);

    // --- FIX START: Connect Pagination Buttons ---
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if(prevBtn) prevBtn.addEventListener('click', () => changePage(-1));
    if(nextBtn) nextBtn.addEventListener('click', () => changePage(1));
    // --- FIX END ---
});

/* --- SIDEBAR TOGGLE (For Mobile) --- */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
    // Show/Hide close icon inside sidebar
    const closeIcon = document.getElementById('sidebarClose');
    if(closeIcon) closeIcon.style.display = sidebar.classList.contains('active') ? 'block' : 'none';
}

/* --- FETCHING --- */
function loadView(viewType) {
    currentState.view = viewType;
    currentState.page = 1;
    updateUIHeader(viewType);
    fetchData();
}

function filterByStars(s) { currentState.view = 'stars'; currentState.stars = s; updateUIHeader('stars'); fetchData(); }
function changePage(d) { currentState.page += d; if (currentState.page < 1) currentState.page = 1; fetchData(); }

async function fetchData() {
    toggleLoader(true);
    let url = '', params = {};

    switch (currentState.view) {
        case 'importance': 
            url = `${API_BASE_URL}/api/notes/problemByImportance`; 
            params = { page: currentState.page }; 
            break;

        case 'all': 
            url = `${API_BASE_URL}/api/notes/problem`; 
            params = { page: currentState.page }; 
            break;

        case 'tag': 
            url = `${API_BASE_URL}/api/notes/tag/${currentState.tag}`; 
            // FIX START: Add page param here
            params = { page: currentState.page }; 
            // FIX END
            break;

        case 'stars': 
            url = `${API_BASE_URL}/api/notes/stars/${currentState.stars}`; 
            // FIX START: Add page param here
            params = { page: currentState.page }; 
            // FIX END
            break;
    }

    try {
        const res = await axios.get(url, { params });
        if (res.data.success) {
            renderTable(res.data.data);
            
            // Pass totalPages from backend (default to 1 if missing)
            const total = res.data.totalPages || 1; 
            updatePaginationControls(total); 
        }
    } catch (err) {
        console.error(err);
    } finally {
        toggleLoader(false);
    }
}

/* --- RENDER TABLE --- */
function renderTable(problems) {
    const tbody = document.getElementById('problemTableBody');
    tbody.innerHTML = '';
    if (!problems || problems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px;">No problems found</td></tr>';
        return;
    }

    problems.forEach(p => {
        const starsHtml = '<i class="fa-solid fa-star"></i>'.repeat(p.stars) + '<i class="fa-regular fa-star" style="opacity:0.3"></i>'.repeat(3 - p.stars);
        const tags = Array.isArray(p.tags) ? p.tags.map(t => `<span class="tag-badge">${t}</span>`).join('') : '';

        // Added Edit Button logic here
        const row = `
            <tr onclick="fetchProblemDetails(${p.problemId})" style="cursor: pointer;">
                <td style="color:var(--text-muted)">#${p.problemId}</td>
                <td style="font-weight: 600; color: #fff;">${p.problemName}</td>
                <td>${tags}</td>
                <td><span class="text-gold">${starsHtml}</span></td>
                <td onclick="event.stopPropagation()"><a href="${p.problemLink}" target="_blank" class="link-icon"><i class="fa-solid fa-arrow-up-right-from-square"></i></a></td>
                <td onclick="event.stopPropagation()">
                    <button class="action-btn edit-btn" onclick="openEditModal(${p.problemId})"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="action-btn delete-btn" onclick="deleteProblem(${p.problemId})"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            </tr>`;
        tbody.innerHTML += row;
    });
}

/* --- CREATE & UPDATE LOGIC --- */

// 1. Open Modal for NEW
function openCreateModal() {
    isEditing = false;
    document.getElementById('createForm').reset();
    document.getElementById('modalTitle').innerText = "Add New Problem";
    document.getElementById('modalSubmitBtn').innerText = "Save Problem";
    document.getElementById('createModal').style.display = 'flex';
}

// 2. Open Modal for EDIT (Fetch details first)
async function openEditModal(id) {
    isEditing = true;
    try {
        const res = await axios.get(`${API_BASE_URL}/api/notes/problemById/${id}`);
        if(res.data.success) {
            const p = res.data.data;
            // Fill Form
            document.getElementById('editProblemId').value = p.problemId;
            document.getElementById('inpName').value = p.problemName;
            document.getElementById('inpLink').value = p.problemLink;
            document.getElementById('inpTags').value = p.tags.join(', ');
            document.getElementById('inpStars').value = p.stars;
            document.getElementById('inpDesc').value = p.problemDescription || '';
            document.getElementById('inpNotes').value = p.notes || '';
            document.getElementById('inpMistake').value = p.mistake || '';

            // UI Changes
            document.getElementById('modalTitle').innerText = "Edit Problem";
            document.getElementById('modalSubmitBtn').innerText = "Update Problem";
            document.getElementById('createModal').style.display = 'flex';
        }
    } catch(e) { alert("Error loading problem for edit"); }
}

// 3. Handle Submit (Decide Create or Update)
async function handleFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const tagsArray = formData.get('tags').split(',').map(t => t.trim()).filter(t => t);

    const payload = {
        problemName: formData.get('problemName'),
        problemLink: formData.get('problemLink'),
        stars: parseInt(formData.get('stars')),
        tags: tagsArray,
        problemDescription: formData.get('problemDescription'),
        mistake: formData.get('mistake'),
        notes: formData.get('notes')
    };

    try {
        let response;
        if (isEditing) {
            // UPDATE
            const id = document.getElementById('editProblemId').value;
            response = await axios.put(`${API_BASE_URL}/api/notes/problem/${id}`, payload);
        } else {
            // CREATE
            response = await axios.post(`${API_BASE_URL}/api/notes/new`, payload);
        }

        if (response.data.success) {
            closeModal('createModal');
            loadView(currentState.view); // Refresh table
            alert(isEditing ? 'Problem Updated!' : 'Problem Created!');
        }
    } catch (error) {
        alert(error.response?.data?.message || 'Operation failed');
    }
}

/* --- VIEW DETAILS (Full Screen) --- */
async function fetchProblemDetails(id) {
    try {
        const res = await axios.get(`${API_BASE_URL}/api/notes/problemById/${id}`);
        if (res.data.success) {
            const p = res.data.data;
            const content = document.getElementById('viewContent');
            
            const starsHtml = '<i class="fa-solid fa-star"></i>'.repeat(p.stars);
            const tagHtml = p.tags.map(t => `<span style="background:rgba(255,255,255,0.1); padding:5px 12px; border-radius:15px; font-size:14px; margin-right:5px;">#${t}</span>`).join('');

            content.innerHTML = `
                <div class="modal-header-fixed">
                    <div style="flex:1">
                        <h1 class="big-title">${p.problemName}</h1>
                        <div class="meta-info">
                            <span style="color:#fbbf24;">${starsHtml}</span>
                            <span>| ID: #${p.problemId}</span>
                        </div>
                        <div style="margin-top:10px;">${tagHtml}</div>
                    </div>
                    <div style="display:flex; align-items:center; gap:15px;">
                        <div class="close-massive" onclick="closeModal('viewModal')">&times;</div>
                    </div>
                </div>

                <div class="modal-body">
                    <div class="action-bar-modal">
                        <a href="${p.problemLink}" target="_blank" class="solve-btn-massive" style="flex:2; text-align:center;">
                            Solve Problem <i class="fa-solid fa-arrow-up-right-from-square"></i>
                        </a>
                        
                        <button onclick="openEditModal(${p.problemId}); closeModal('viewModal')" class="solve-btn-massive icon-btn-modal" style="background:#334155;">
                            <i class="fa-solid fa-pen"></i> Edit
                        </button>

                        <button onclick="deleteProblem(${p.problemId})" class="solve-btn-massive icon-btn-modal" style="background:#ef4444;">
                            <i class="fa-solid fa-trash-can"></i> Delete
                        </button>
                    </div>

                    <div>
                        <div class="section-title">Description</div>
                        <div class="text-content">${p.problemDescription || 'No description.'}</div>
                    </div>

                    <div class="note-box-wide">
                        <div class="section-title" style="color:#818cf8;"><i class="fa-solid fa-lightbulb"></i> Notes</div>
                        <div class="text-content" style="color:#e0e7ff;">${p.notes || 'No notes.'}</div>
                    </div>

                    ${p.mistake ? `
                    <div class="mistake-box-wide">
                        <div class="section-title" style="color:#f87171;"><i class="fa-solid fa-triangle-exclamation"></i> Mistakes</div>
                        <div class="text-content" style="color:#fee2e2;">${p.mistake}</div>
                    </div>` : ''}
                </div>
            `;
            document.getElementById('viewModal').style.display = 'flex';
        }
    } catch (error) { console.error(error); }
}

async function deleteProblem(id) {
    if(!confirm("Delete this problem?")) return;
    try {
        const res = await axios.delete(`${API_BASE_URL}/api/notes/problem/${id}`);
        if(res.data.success) {
            // If the deleted problem is open in View Modal, close it
            closeModal('viewModal'); 
            fetchData();
        }
    } catch (e) { alert('Error deleting'); }
}

/* --- UTILS --- */
/* --- UTILS --- */
function updateUIHeader(view) {
    const title = document.getElementById('page-title');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    if (view === 'importance') { 
        title.innerText = 'Top Priority'; 
        document.querySelector('.nav-btn:nth-child(1)').classList.add('active'); 
    }
    else if (view === 'all') { 
        title.innerText = 'All Problems'; 
        document.querySelector('.nav-btn:nth-child(2)').classList.add('active'); 
    }
    else if (view === 'tag') { 
        title.innerText = `Tag: "${currentState.tag}"`; 
    }
    else if (view === 'stars') { 
        // --- CHANGE START ---
        if(currentState.stars === 0) {
            title.innerText = "Unrated Problems (0 Stars)";
        } else {
            title.innerText = `${currentState.stars} Star Problems`; 
        }
        // --- CHANGE END ---
    }
}

function updatePaginationControls(totalPages) {
    const prev = document.getElementById('prevBtn');
    const next = document.getElementById('nextBtn');
    document.getElementById('pageIndicator').innerText = `Page ${currentState.page}`;
    
    // Disable PREV if on page 1
    prev.disabled = currentState.page === 1;

    // --- FIX START ---
    // Disable NEXT if current page is equal to or greater than total pages
    next.disabled = currentState.page >= totalPages;
    // --- FIX END ---
}

function toggleLoader(show) { document.getElementById('loader')?.classList.toggle('hidden', !show); }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
window.onclick = function(e) { if (e.target.classList.contains('modal')) e.target.style.display = 'none'; }


async function logout() {
  try {
    await axios.post("/logout");
  } catch {}
  window.location.replace("login.html");
}