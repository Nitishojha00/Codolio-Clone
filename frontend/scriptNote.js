const API_BASE_URL = "http://127.0.0.1:4000"; // ⚠️ Check if you need '/api' here based on your server.js
axios.defaults.withCredentials = true;

let currentState = {
    view: 'importance',
    page: 1,
    tag: '',
    stars: 0
};

document.addEventListener('DOMContentLoaded', () => {
    loadView('importance'); 

    // Search Listener
    document.getElementById('tagSearchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const tag = e.target.value.trim();
            currentState.tag = tag;
            loadView(tag ? 'tag' : 'importance');
        }
    });

    // Create Form Listener
    document.getElementById('createForm').addEventListener('submit', handleCreateProblem);
});

/* --- FETCHING & NAVIGATION --- */
function loadView(viewType) {
    currentState.view = viewType;
    currentState.page = 1;
    updateUIHeader(viewType);
    fetchData();
}

function filterByStars(starCount) {
    currentState.view = 'stars';
    currentState.stars = starCount;
    updateUIHeader('stars');
    fetchData();
}

function changePage(delta) {
    currentState.page += delta;
    if (currentState.page < 1) currentState.page = 1;
    fetchData();
}

async function fetchData() {
    toggleLoader(true);
    let url = '';
    let params = {};

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
            break;
        case 'stars':
            url = `${API_BASE_URL}/api/notes/stars/${currentState.stars}`;
            break;
    }

    try {
        const response = await axios.get(url, { params });
        const result = response.data;
        if (result.success) {
            renderTable(result.data);
            updatePaginationControls(result.data.length);
        }
    } catch (error) {
        console.error(error);
        alert(error.response?.data?.message || 'Error fetching data');
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
        let tagHtml = Array.isArray(p.tags) 
            ? p.tags.map(t => `<span class="tag-badge">${t}</span>`).join('') 
            : '';
        
        const starsHtml = '<i class="fa-solid fa-star"></i>'.repeat(p.stars) + '<i class="fa-regular fa-star"></i>'.repeat(3 - p.stars);

        const row = `
            <tr onclick="fetchProblemDetails(${p.problemId})" style="cursor: pointer;">
                <td style="color:var(--text-muted)">#${p.problemId}</td>
                <td style="font-weight: 600; color: #fff;">${p.problemName}</td>
                <td>${tagHtml}</td>
                <td><span class="stars">${starsHtml}</span></td>
                <td onclick="event.stopPropagation()">
                    <a href="${p.problemLink}" target="_blank" class="link-icon">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> Open
                    </a>
                </td>
                <td onclick="event.stopPropagation()">
                    <button class="action-btn delete-btn" onclick="deleteProblem(${p.problemId})">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

/* --- ACTIONS --- */

// 1. CREATE PROBLEM (Updated with new fields)
async function handleCreateProblem(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const tagsStr = formData.get('tags');
    const tagsArray = tagsStr ? tagsStr.split(',').map(t => t.trim()) : [];

    const payload = {
        problemName: formData.get('problemName'),
        problemLink: formData.get('problemLink'),
        stars: parseInt(formData.get('stars')),
        tags: tagsArray,
        // ✅ NEW FIELDS
        problemDescription: formData.get('problemDescription'),
        mistake: formData.get('mistake'),
        notes: formData.get('notes')
    };

    try {
        const response = await axios.post(`${API_BASE_URL}/api/notes/new`, payload);
        if (response.data.success) {
            closeModal('createModal');
            e.target.reset();
            loadView(currentState.view);
            alert('Problem Created Successfully!');
        }
    } catch (error) {
        alert(error.response?.data?.message || 'Error creating problem');
    }
}
// 2. VIEW DETAILS (Updated Layout)
// Replace your fetchProblemDetails function with this:

// REPLACE fetchProblemDetails function

async function fetchProblemDetails(id) {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/notes/problemById/${id}`);
        const result = response.data;

        if (result.success) {
            const p = result.data;
            const content = document.getElementById('viewContent');
            
            // Generate Stars
            const starsHtml = '<i class="fa-solid fa-star"></i>'.repeat(p.stars) + 
                            '<i class="fa-regular fa-star" style="opacity:0.3"></i>'.repeat(3 - p.stars);
            
            // Generate Tags (Large Pills)
            const tagHtml = p.tags.map(t => 
                `<span style="background:rgba(255,255,255,0.08); padding:8px 16px; border-radius:30px; color:#e2e8f0; font-size:16px;">#${t}</span>`
            ).join('');

            const desc = p.problemDescription || 'No description provided.';
            const notes = p.notes || 'No notes added yet.';

            content.innerHTML = `
                <div class="modal-header-fixed">
                    <div>
                        <h1 class="big-title">${p.problemName}</h1>
                        <div class="meta-info">
                            <span style="color:#fbbf24;">${starsHtml}</span>
                            <span>•</span>
                            <span>Problem ID: #${p.problemId}</span>
                            <span>•</span>
                            <div style="display:inline-flex; gap:10px;">${tagHtml}</div>
                        </div>
                    </div>
                    
                    <div style="display:flex; align-items:center; gap:30px;">
                        <a href="${p.problemLink}" target="_blank" class="solve-btn-massive">
                            Solve Now <i class="fa-solid fa-arrow-up-right-from-square" style="margin-left:10px;"></i>
                        </a>
                        <div class="close-massive" onclick="closeModal('viewModal')">&times;</div>
                    </div>
                </div>

                <div class="modal-body">
                    
                    <div>
                        <div class="section-title">Description</div>
                        <div class="text-content">${desc}</div>
                    </div>

                    <div class="note-box-wide">
                        <div class="section-title" style="border-color:#6366f1; color:#818cf8;">
                            <i class="fa-solid fa-lightbulb"></i> My Solution Notes
                        </div>
                        <div class="text-content" style="color:#e0e7ff;">${notes}</div>
                    </div>

                    ${p.mistake ? `
                    <div class="mistake-box-wide">
                        <div class="section-title" style="border-color:#ef4444; color:#f87171;">
                            <i class="fa-solid fa-triangle-exclamation"></i> Mistakes to Avoid
                        </div>
                        <div class="text-content" style="color:#fee2e2;">${p.mistake}</div>
                    </div>
                    ` : ''}

                    <div style="margin-top:auto; padding-top:40px; border-top:1px solid #334155; color:#64748b; font-size:14px;">
                        Created on: ${new Date(p.createdAt).toLocaleDateString()} &nbsp; • &nbsp; 
                        Last Updated: ${new Date(p.updatedAt).toLocaleDateString()}
                    </div>
                </div>
            `;
            
            // Open Modal
            document.getElementById('viewModal').style.display = 'flex';
        }
    } catch (error) {
        console.error(error);
        alert('Could not fetch details.');
    }
}
// ... rest of your code ...
// 3. DELETE
async function deleteProblem(id) {
    if(!confirm("Delete this problem?")) return;
    try {
        const response = await axios.delete(`${API_BASE_URL}/api/notes/problem/${id}`);
        if (response.data.success) fetchData();
    } catch (error) {
        alert(error.response?.data?.message || 'Error deleting');
    }
}

/* --- UTILS --- */
function updateUIHeader(view) {
    const title = document.getElementById('page-title');
    const btns = document.querySelectorAll('.nav-btn');
    btns.forEach(b => b.classList.remove('active'));

    if (view === 'importance') {
        title.innerText = 'Top Priority Problems';
        btns[0].classList.add('active');
    } else if (view === 'all') {
        title.innerText = 'All Problems';
        btns[1].classList.add('active');
    } else if (view === 'tag') {
        title.innerText = `Tag: "${currentState.tag}"`;
    } else if (view === 'stars') {
        title.innerText = `Importance: ${currentState.stars} Stars`;
    }
}

function updatePaginationControls(count) {
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    document.getElementById('pageIndicator').innerText = `Page ${currentState.page}`;
    
    prevBtn.disabled = currentState.page === 1;
    nextBtn.disabled = count < 10;
    
    document.querySelector('.pagination').style.display = 
        (currentState.view === 'tag' || currentState.view === 'stars') ? 'none' : 'flex';
}

function toggleLoader(show) {
    const loader = document.getElementById('loader');
    if(loader) loader.classList.toggle('hidden', !show);
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
window.onclick = function(e) { if (e.target.classList.contains('modal')) e.target.style.display = 'none'; }

async function logout() {
  try {
    await axios.post("/logout");
  } catch {}
  window.location.replace("login.html");
}