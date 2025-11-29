// =================================================================
// KANBAN TRACKER MODULE
// Sprint-based project tracking for development, bugs, lessons, and voice recording
// =================================================================

class KanbanTrackerModule extends LearningModule {
    constructor(assetManager) {
        super(assetManager);
        this.projects = [];
        this.sprints = [];
        this.tasks = [];
        this.currentProjectId = null;
        this.currentSprintId = null;
        this.viewMode = 'week'; // 'week', 'month', 'quarter'
        this.selectedMonth = new Date(); // For month view
        this.selectedQuarter = { year: new Date().getFullYear(), quarter: Math.ceil((new Date().getMonth() + 1) / 3) };
        this.expandedSprints = new Set(); // Track which sprints are expanded in accordion view
        this.filters = {
            category: '',
            language: '',
            assignee: ''
        };
        this.draggedTask = null;
        this.columns = ['todo', 'in-progress', 'review', 'done'];
        this.projectColors = [
            { id: 'blue', name: 'Blue', color: '#3B82F6' },
            { id: 'green', name: 'Green', color: '#10B981' },
            { id: 'purple', name: 'Purple', color: '#8B5CF6' },
            { id: 'orange', name: 'Orange', color: '#F97316' },
            { id: 'pink', name: 'Pink', color: '#EC4899' },
            { id: 'teal', name: 'Teal', color: '#14B8A6' },
            { id: 'red', name: 'Red', color: '#EF4444' },
            { id: 'indigo', name: 'Indigo', color: '#6366F1' }
        ];
        this.categories = [
            { id: 'dev', name: 'Development', icon: 'fa-code', color: '#4F46E5' },
            { id: 'bug', name: 'Bug Fix', icon: 'fa-bug', color: '#EF4444' },
            { id: 'lesson', name: 'Lesson', icon: 'fa-book', color: '#10B981' },
            { id: 'voice', name: 'Voice Recording', icon: 'fa-microphone', color: '#F59E0B' }
        ];
        this.languages = [
            { id: 'ceb', name: 'Cebuano' },
            { id: 'mrw', name: 'Maranao' },
            { id: 'sin', name: 'Sinama' },
            { id: 'all', name: 'All Languages' }
        ];
        // Bug-specific options
        this.priorities = [
            { id: 'critical', name: 'Critical', color: '#DC2626' },
            { id: 'high', name: 'High', color: '#F97316' },
            { id: 'medium', name: 'Medium', color: '#EAB308' },
            { id: 'low', name: 'Low', color: '#22C55E' }
        ];
        this.severities = [
            { id: 'blocker', name: 'Blocker' },
            { id: 'major', name: 'Major' },
            { id: 'minor', name: 'Minor' },
            { id: 'trivial', name: 'Trivial' }
        ];
        this.knownModules = [
            'flashcards-module.js', 'match-module.js', 'quiz-module.js',
            'voice-module.js', 'sentence-review-module.js', 'conversation-practice-module.js',
            'story-zone-module.js', 'sentence-builder-module.js', 'grammar-module.js',
            'deck-builder-module.js', 'admin-module.js', 'app.js', 'kanban-tracker-module.js'
        ];
    }

    async render() {
        this.container.innerHTML = `
            <div class="kanban-container">
                <!-- Header -->
                <div class="kanban-header">
                    <div class="kanban-title">
                        <i class="fas fa-columns"></i>
                        <h2>Project Tracker</h2>
                    </div>
                    <div class="kanban-controls">
                        <!-- Project Selector -->
                        <div class="project-selector">
                            <label><i class="fas fa-folder"></i></label>
                            <select id="projectSelect" class="kanban-select">
                                <option value="">All Projects</option>
                            </select>
                            <button id="manageProjectsBtn" class="kanban-btn kanban-btn-secondary" title="Manage Projects">
                                <i class="fas fa-cog"></i>
                            </button>
                        </div>
                        <!-- View Mode Selector -->
                        <div class="view-mode-selector">
                            <button class="view-mode-btn active" data-mode="week" title="Week View">
                                <i class="fas fa-calendar-week"></i> Week
                            </button>
                            <button class="view-mode-btn" data-mode="month" title="Month View">
                                <i class="fas fa-calendar-alt"></i> Month
                            </button>
                            <button class="view-mode-btn" data-mode="quarter" title="Quarter View">
                                <i class="fas fa-calendar"></i> Quarter
                            </button>
                        </div>
                        <div class="sprint-selector" id="sprintSelectorContainer">
                            <label><i class="fas fa-calendar-week"></i></label>
                            <select id="sprintSelect" class="kanban-select">
                                <option value="">Select Sprint...</option>
                            </select>
                            <button id="manageSprintsBtn" class="kanban-btn kanban-btn-secondary" title="Manage Sprints">
                                <i class="fas fa-cog"></i>
                            </button>
                        </div>
                        <!-- Month/Quarter Navigator (hidden by default) -->
                        <div class="period-navigator hidden" id="periodNavigator">
                            <button id="prevPeriodBtn" class="kanban-btn kanban-btn-icon" title="Previous">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <span id="periodLabel" class="period-label">November 2025</span>
                            <button id="nextPeriodBtn" class="kanban-btn kanban-btn-icon" title="Next">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        <button id="addTaskBtn" class="kanban-btn kanban-btn-primary">
                            <i class="fas fa-plus"></i>
                            <span>Add Task</span>
                        </button>
                    </div>
                </div>

                <!-- Period Progress (for month/quarter view) -->
                <div class="sprint-progress-bar" id="sprintProgressContainer">
                    <div class="sprint-info">
                        <span id="sprintName">No Sprint Selected</span>
                        <span id="sprintDates"></span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-fill" id="sprintProgressFill"></div>
                    </div>
                    <span class="progress-text" id="sprintProgressText">0%</span>
                </div>

                <!-- Filters -->
                <div class="kanban-filters">
                    <div class="filter-group">
                        <select id="filterCategory" class="kanban-select filter-select">
                            <option value="">All Categories</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <select id="filterLanguage" class="kanban-select filter-select">
                            <option value="">All Languages</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <select id="filterAssignee" class="kanban-select filter-select">
                            <option value="">All Assignees</option>
                        </select>
                    </div>
                    <button id="clearFiltersBtn" class="kanban-btn kanban-btn-text">
                        <i class="fas fa-times"></i> Clear
                    </button>
                </div>

                <!-- Board (Week View) -->
                <div class="kanban-board" id="kanbanBoard">
                    <div class="kanban-column" data-status="todo">
                        <div class="column-header">
                            <span class="column-title"><i class="fas fa-clipboard-list"></i> To Do</span>
                            <span class="column-count" id="todoCount">0</span>
                        </div>
                        <div class="column-tasks" id="todoTasks" data-status="todo"></div>
                    </div>
                    <div class="kanban-column" data-status="in-progress">
                        <div class="column-header">
                            <span class="column-title"><i class="fas fa-spinner"></i> In Progress</span>
                            <span class="column-count" id="in-progressCount">0</span>
                        </div>
                        <div class="column-tasks" id="in-progressTasks" data-status="in-progress"></div>
                    </div>
                    <div class="kanban-column" data-status="review">
                        <div class="column-header">
                            <span class="column-title"><i class="fas fa-eye"></i> Review</span>
                            <span class="column-count" id="reviewCount">0</span>
                        </div>
                        <div class="column-tasks" id="reviewTasks" data-status="review"></div>
                    </div>
                    <div class="kanban-column" data-status="done">
                        <div class="column-header">
                            <span class="column-title"><i class="fas fa-check-circle"></i> Done</span>
                            <span class="column-count" id="doneCount">0</span>
                        </div>
                        <div class="column-tasks" id="doneTasks" data-status="done"></div>
                    </div>
                </div>

                <!-- Accordion View (Month/Quarter View) -->
                <div class="sprint-accordion hidden" id="sprintAccordion">
                    <!-- Sprint sections will be rendered here dynamically -->
                </div>
            </div>

            <!-- Task Modal -->
            <div id="taskModal" class="kanban-modal hidden">
                <div class="kanban-modal-content">
                    <div class="kanban-modal-header">
                        <h3 id="taskModalTitle">Add Task</h3>
                        <button id="closeTaskModal" class="kanban-btn-icon"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="kanban-modal-body">
                        <div class="form-group">
                            <label>Title <span class="required">*</span></label>
                            <input type="text" id="taskTitle" class="kanban-input" placeholder="Task title...">
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="taskDescription" class="kanban-textarea" rows="3" placeholder="Task description..."></textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Category <span class="required">*</span></label>
                                <select id="taskCategory" class="kanban-select"></select>
                            </div>
                            <div class="form-group">
                                <label>Language</label>
                                <select id="taskLanguage" class="kanban-select"></select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Assignee</label>
                                <input type="text" id="taskAssignee" class="kanban-input" placeholder="Assignee name...">
                            </div>
                            <div class="form-group">
                                <label>Due Date</label>
                                <input type="date" id="taskDueDate" class="kanban-input">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Project</label>
                                <select id="taskProject" class="kanban-select"></select>
                            </div>
                            <div class="form-group">
                                <label>Sprint</label>
                                <select id="taskSprint" class="kanban-select"></select>
                            </div>
                        </div>

                        <!-- Bug-specific fields (shown when category is 'bug') -->
                        <div id="bugFields" class="bug-fields hidden">
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Priority</label>
                                    <select id="taskPriority" class="kanban-select">
                                        <option value="low">Low</option>
                                        <option value="medium" selected>Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Severity</label>
                                    <select id="taskSeverity" class="kanban-select">
                                        <option value="trivial">Trivial</option>
                                        <option value="minor" selected>Minor</option>
                                        <option value="major">Major</option>
                                        <option value="blocker">Blocker</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Module / File</label>
                                <select id="taskModule" class="kanban-select">
                                    <option value="">Select module...</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="kanban-modal-footer">
                        <button id="deleteTaskBtn" class="kanban-btn kanban-btn-danger hidden">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                        <div class="modal-actions">
                            <button id="cancelTaskBtn" class="kanban-btn kanban-btn-secondary">Cancel</button>
                            <button id="saveTaskBtn" class="kanban-btn kanban-btn-primary">Save Task</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sprint Management Modal -->
            <div id="sprintModal" class="kanban-modal hidden">
                <div class="kanban-modal-content">
                    <div class="kanban-modal-header">
                        <h3>Manage Sprints</h3>
                        <button id="closeSprintModal" class="kanban-btn-icon"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="kanban-modal-body">
                        <div class="sprint-form">
                            <div class="form-group">
                                <label>Sprint Name</label>
                                <input type="text" id="sprintName" class="kanban-input" placeholder="e.g., Week 12, Sprint 5...">
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Start Date</label>
                                    <input type="date" id="sprintStartDate" class="kanban-input">
                                </div>
                                <div class="form-group">
                                    <label>End Date</label>
                                    <input type="date" id="sprintEndDate" class="kanban-input">
                                </div>
                            </div>
                            <button id="addSprintBtn" class="kanban-btn kanban-btn-primary">
                                <i class="fas fa-plus"></i> Add Sprint
                            </button>
                        </div>
                        <div class="sprint-list" id="sprintList"></div>
                    </div>
                </div>
            </div>

            <!-- Project Management Modal -->
            <div id="projectModal" class="kanban-modal hidden">
                <div class="kanban-modal-content">
                    <div class="kanban-modal-header">
                        <h3>Manage Projects</h3>
                        <button id="closeProjectModal" class="kanban-btn-icon"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="kanban-modal-body">
                        <div class="project-form">
                            <div class="form-group">
                                <label>Project Name <span class="required">*</span></label>
                                <input type="text" id="projectNameInput" class="kanban-input" placeholder="e.g., WSOL Development, Lesson Creation...">
                            </div>
                            <div class="form-group">
                                <label>Description</label>
                                <textarea id="projectDescription" class="kanban-textarea" rows="2" placeholder="Brief project description..."></textarea>
                            </div>
                            <div class="form-group">
                                <label>Color</label>
                                <div class="project-color-picker" id="projectColorPicker"></div>
                            </div>
                            <button id="addProjectBtn" class="kanban-btn kanban-btn-primary">
                                <i class="fas fa-plus"></i> Add Project
                            </button>
                        </div>
                        <div class="project-list" id="projectList"></div>
                    </div>
                </div>
            </div>

            <!-- Task Detail Modal (for viewing history and comments) -->
            <div id="taskDetailModal" class="kanban-modal hidden">
                <div class="kanban-modal-content kanban-modal-wide">
                    <div class="kanban-modal-header">
                        <h3 id="detailModalTitle">Task Details</h3>
                        <button id="closeDetailModal" class="kanban-btn-icon"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="kanban-modal-body" id="taskDetailContent"></div>
                </div>
            </div>
        `;
    }

    async init() {
        // Check authentication
        if (!authManager?.authenticated) {
            this.container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-lock"></i>
                    <h3>Authentication Required</h3>
                    <p>Please log in to access the Project Tracker.</p>
                </div>
            `;
            return;
        }

        // Check role permissions
        const allowedRoles = ['admin', 'deck-manager', 'editor'];
        if (!allowedRoles.includes(authManager.role)) {
            this.container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-ban"></i>
                    <h3>Access Denied</h3>
                    <p>You don't have permission to access the Project Tracker.</p>
                </div>
            `;
            return;
        }

        // Load data from localStorage
        this.loadData();

        // Populate dropdowns
        this.populateProjectDropdowns();
        this.populateFilterDropdowns();
        this.populateSprintDropdowns();
        this.populateTaskFormDropdowns();

        // Setup event listeners
        this.setupEventListeners();

        // Render project color picker
        this.renderProjectColorPicker();

        // Initialize drag and drop
        this.initDragAndDrop();

        // Render tasks
        this.renderTasks();
        this.updateProgress();

        debugLogger?.log(2, 'Kanban Tracker initialized');
    }

    loadData() {
        try {
            const savedProjects = localStorage.getItem('kanbanProjects');
            const savedSprints = localStorage.getItem('kanbanSprints');
            const savedTasks = localStorage.getItem('kanbanTasks');
            const savedCurrentProject = localStorage.getItem('kanbanCurrentProject');
            const savedCurrentSprint = localStorage.getItem('kanbanCurrentSprint');

            this.projects = savedProjects ? JSON.parse(savedProjects) : this.createDefaultProject();
            this.sprints = savedSprints ? JSON.parse(savedSprints) : this.createDefaultSprints();
            this.tasks = savedTasks ? JSON.parse(savedTasks) : [];
            this.currentProjectId = savedCurrentProject ? parseInt(savedCurrentProject) : null;
            this.currentSprintId = savedCurrentSprint ? parseInt(savedCurrentSprint) : (this.sprints.length > 0 ? this.sprints[0].id : null);

            // Migrate existing tasks/sprints to default project if they don't have a projectId
            if (this.projects.length > 0) {
                const defaultProjectId = this.projects[0].id;
                let migrated = false;
                this.tasks.forEach(task => {
                    if (!task.projectId) {
                        task.projectId = defaultProjectId;
                        migrated = true;
                    }
                });
                this.sprints.forEach(sprint => {
                    if (!sprint.projectId) {
                        sprint.projectId = defaultProjectId;
                        migrated = true;
                    }
                });
                if (migrated) this.saveData();
            }

            // Save defaults if none existed
            if (!savedProjects || !savedSprints) this.saveData();
        } catch (err) {
            debugLogger?.log(1, `Error loading kanban data: ${err.message}`);
            this.projects = this.createDefaultProject();
            this.sprints = this.createDefaultSprints();
            this.tasks = [];
        }
    }

    createDefaultProject() {
        return [{
            id: 1,
            name: 'Default Project',
            description: 'General tasks and sprints',
            color: '#3B82F6',
            createdAt: new Date().toISOString()
        }];
    }

    createDefaultSprints() {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)

        // Get the default project ID (1 for initial setup)
        const defaultProjectId = this.projects.length > 0 ? this.projects[0].id : 1;

        const sprints = [];
        for (let i = 0; i < 4; i++) {
            const start = new Date(startOfWeek);
            start.setDate(startOfWeek.getDate() + (i * 7));
            const end = new Date(start);
            end.setDate(start.getDate() + 6);

            const weekNum = this.getWeekNumber(start);
            sprints.push({
                id: i + 1,
                name: `Week ${weekNum}`,
                startDate: start.toISOString().split('T')[0],
                endDate: end.toISOString().split('T')[0],
                projectId: defaultProjectId
            });
        }
        return sprints;
    }

    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    saveData() {
        try {
            localStorage.setItem('kanbanProjects', JSON.stringify(this.projects));
            localStorage.setItem('kanbanSprints', JSON.stringify(this.sprints));
            localStorage.setItem('kanbanTasks', JSON.stringify(this.tasks));
            if (this.currentProjectId) {
                localStorage.setItem('kanbanCurrentProject', this.currentProjectId.toString());
            } else {
                localStorage.removeItem('kanbanCurrentProject');
            }
            if (this.currentSprintId) {
                localStorage.setItem('kanbanCurrentSprint', this.currentSprintId.toString());
            }
        } catch (err) {
            debugLogger?.log(1, `Error saving kanban data: ${err.message}`);
            toastManager?.show('Error saving data', 'error');
        }
    }

    populateProjectDropdowns() {
        const projectSelect = document.getElementById('projectSelect');
        const taskProjectSelect = document.getElementById('taskProject');

        if (projectSelect) {
            projectSelect.innerHTML = '<option value="">All Projects</option>' +
                this.projects.map(p => `<option value="${p.id}" ${p.id === this.currentProjectId ? 'selected' : ''}>${this.escapeHtml(p.name)}</option>`).join('');
        }

        if (taskProjectSelect) {
            taskProjectSelect.innerHTML = '<option value="">No Project</option>' +
                this.projects.map(p => `<option value="${p.id}">${this.escapeHtml(p.name)}</option>`).join('');
        }

        this.renderProjectList();
    }

    renderProjectColorPicker() {
        const picker = document.getElementById('projectColorPicker');
        if (!picker) return;

        picker.innerHTML = this.projectColors.map((c, i) =>
            `<button type="button" class="color-option ${i === 0 ? 'selected' : ''}" data-color="${c.color}" style="background-color: ${c.color}" title="${c.name}"></button>`
        ).join('');

        picker.querySelectorAll('.color-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                picker.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });
    }

    renderProjectList() {
        const container = document.getElementById('projectList');
        if (!container) return;

        if (this.projects.length === 0) {
            container.innerHTML = '<p class="no-projects">No projects created yet.</p>';
            return;
        }

        container.innerHTML = this.projects.map(project => {
            const taskCount = this.tasks.filter(t => t.projectId === project.id).length;
            const sprintCount = this.sprints.filter(s => s.projectId === project.id).length;
            return `
                <div class="project-item" data-project-id="${project.id}">
                    <div class="project-color-indicator" style="background-color: ${project.color}"></div>
                    <div class="project-item-info">
                        <strong>${this.escapeHtml(project.name)}</strong>
                        <span>${taskCount} task${taskCount !== 1 ? 's' : ''}, ${sprintCount} sprint${sprintCount !== 1 ? 's' : ''}</span>
                        ${project.description ? `<span class="project-desc">${this.escapeHtml(project.description)}</span>` : ''}
                    </div>
                    <button class="kanban-btn-icon delete-project" data-project-id="${project.id}" title="Delete Project">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }).join('');

        // Add delete handlers
        container.querySelectorAll('.delete-project').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteProject(parseInt(btn.dataset.projectId));
            });
        });
    }

    addProject() {
        const nameInput = document.getElementById('projectNameInput');
        const descInput = document.getElementById('projectDescription');
        const colorPicker = document.getElementById('projectColorPicker');
        const selectedColor = colorPicker?.querySelector('.color-option.selected');

        const name = nameInput?.value.trim();
        const description = descInput?.value.trim();
        const color = selectedColor?.dataset.color || this.projectColors[0].color;

        if (!name) {
            toastManager?.show('Please enter a project name', 'error');
            return;
        }

        const newProject = {
            id: Math.max(0, ...this.projects.map(p => p.id)) + 1,
            name,
            description,
            color,
            createdAt: new Date().toISOString()
        };

        this.projects.push(newProject);
        this.saveData();
        this.populateProjectDropdowns();
        toastManager?.show('Project created', 'success');

        // Clear form
        if (nameInput) nameInput.value = '';
        if (descInput) descInput.value = '';
        // Reset color picker to first color
        colorPicker?.querySelectorAll('.color-option').forEach((btn, i) => {
            btn.classList.toggle('selected', i === 0);
        });
    }

    deleteProject(projectId) {
        const tasksInProject = this.tasks.filter(t => t.projectId === projectId).length;
        const sprintsInProject = this.sprints.filter(s => s.projectId === projectId).length;

        if (this.projects.length <= 1) {
            toastManager?.show('Cannot delete the last project', 'error');
            return;
        }

        let confirmMsg = `Delete this project?`;
        if (tasksInProject > 0 || sprintsInProject > 0) {
            confirmMsg = `This project has ${tasksInProject} task${tasksInProject !== 1 ? 's' : ''} and ${sprintsInProject} sprint${sprintsInProject !== 1 ? 's' : ''}. Delete anyway? All tasks and sprints will be moved to the first remaining project.`;
        }

        if (!confirm(confirmMsg)) return;

        // Find another project to move items to
        const remainingProjects = this.projects.filter(p => p.id !== projectId);
        const targetProjectId = remainingProjects[0].id;

        // Move tasks and sprints to the target project
        this.tasks.forEach(t => {
            if (t.projectId === projectId) t.projectId = targetProjectId;
        });
        this.sprints.forEach(s => {
            if (s.projectId === projectId) s.projectId = targetProjectId;
        });

        // Remove the project
        this.projects = remainingProjects;

        // Reset current project if deleted
        if (this.currentProjectId === projectId) {
            this.currentProjectId = null;
        }

        this.saveData();
        this.populateProjectDropdowns();
        this.renderTasks();
        toastManager?.show('Project deleted', 'success');
    }

    populateFilterDropdowns() {
        // Category filter
        const categoryFilter = document.getElementById('filterCategory');
        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="">All Categories</option>';
            this.categories.forEach(cat => {
                categoryFilter.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
            });
        }

        // Language filter
        const languageFilter = document.getElementById('filterLanguage');
        if (languageFilter) {
            languageFilter.innerHTML = '<option value="">All Languages</option>';
            this.languages.forEach(lang => {
                languageFilter.innerHTML += `<option value="${lang.id}">${lang.name}</option>`;
            });
        }

        // Assignee filter - populate from existing tasks
        this.updateAssigneeFilter();
    }

    updateAssigneeFilter() {
        const assigneeFilter = document.getElementById('filterAssignee');
        if (!assigneeFilter) return;

        const assignees = [...new Set(this.tasks.map(t => t.assignee).filter(a => a))];
        assigneeFilter.innerHTML = '<option value="">All Assignees</option>';
        assignees.sort().forEach(assignee => {
            assigneeFilter.innerHTML += `<option value="${assignee}">${assignee}</option>`;
        });
    }

    populateSprintDropdowns() {
        const sprintSelect = document.getElementById('sprintSelect');
        const taskSprintSelect = document.getElementById('taskSprint');

        // Filter sprints by current project if one is selected
        const filteredSprints = this.currentProjectId
            ? this.sprints.filter(s => s.projectId === this.currentProjectId)
            : this.sprints;

        const options = '<option value="">All Sprints</option>' +
            filteredSprints.map(s => `<option value="${s.id}" ${s.id === this.currentSprintId ? 'selected' : ''}>${s.name}</option>`).join('');

        if (sprintSelect) {
            sprintSelect.innerHTML = options;
            if (this.currentSprintId) {
                sprintSelect.value = this.currentSprintId;
            }
        }

        if (taskSprintSelect) {
            taskSprintSelect.innerHTML = '<option value="">No Sprint</option>' +
                filteredSprints.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        }

        this.updateSprintInfo();
        this.renderSprintList();
    }

    updateSprintInfo() {
        const nameEl = document.getElementById('sprintName');
        const datesEl = document.getElementById('sprintDates');

        if (this.currentSprintId) {
            const sprint = this.sprints.find(s => s.id === this.currentSprintId);
            if (sprint) {
                nameEl.textContent = sprint.name;
                datesEl.textContent = `${this.formatDate(sprint.startDate)} - ${this.formatDate(sprint.endDate)}`;
            }
        } else {
            nameEl.textContent = 'All Tasks';
            datesEl.textContent = '';
        }
    }

    formatDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    populateTaskFormDropdowns() {
        // Category dropdown
        const categorySelect = document.getElementById('taskCategory');
        if (categorySelect) {
            categorySelect.innerHTML = this.categories.map(cat =>
                `<option value="${cat.id}">${cat.name}</option>`
            ).join('');
        }

        // Language dropdown
        const languageSelect = document.getElementById('taskLanguage');
        if (languageSelect) {
            languageSelect.innerHTML = this.languages.map(lang =>
                `<option value="${lang.id}">${lang.name}</option>`
            ).join('');
        }

        // Module dropdown (for bugs)
        const moduleSelect = document.getElementById('taskModule');
        if (moduleSelect) {
            moduleSelect.innerHTML = '<option value="">Select module...</option>' +
                this.knownModules.map(mod => `<option value="${mod}">${mod}</option>`).join('');
        }
    }

    setupEventListeners() {
        // View mode buttons
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.setViewMode(mode);
            });
        });

        // Period navigation
        document.getElementById('prevPeriodBtn')?.addEventListener('click', () => {
            this.navigatePeriod(-1);
        });

        document.getElementById('nextPeriodBtn')?.addEventListener('click', () => {
            this.navigatePeriod(1);
        });

        // Sprint selection
        document.getElementById('sprintSelect')?.addEventListener('change', (e) => {
            this.currentSprintId = e.target.value ? parseInt(e.target.value) : null;
            this.saveData();
            this.updateSprintInfo();
            this.renderTasks();
            this.updateProgress();
        });

        // Manage sprints button
        document.getElementById('manageSprintsBtn')?.addEventListener('click', () => {
            document.getElementById('sprintModal').classList.remove('hidden');
        });

        // Add task button
        document.getElementById('addTaskBtn')?.addEventListener('click', () => {
            this.openTaskModal();
        });

        // Filter changes
        ['filterCategory', 'filterLanguage', 'filterAssignee'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', (e) => {
                this.filters[id.replace('filter', '').toLowerCase()] = e.target.value;
                this.renderTasks();
            });
        });

        // Clear filters
        document.getElementById('clearFiltersBtn')?.addEventListener('click', () => {
            this.filters = { category: '', language: '', assignee: '' };
            document.getElementById('filterCategory').value = '';
            document.getElementById('filterLanguage').value = '';
            document.getElementById('filterAssignee').value = '';
            this.renderTasks();
        });

        // Task modal
        document.getElementById('closeTaskModal')?.addEventListener('click', () => {
            document.getElementById('taskModal').classList.add('hidden');
        });

        document.getElementById('cancelTaskBtn')?.addEventListener('click', () => {
            document.getElementById('taskModal').classList.add('hidden');
        });

        document.getElementById('saveTaskBtn')?.addEventListener('click', () => {
            this.saveTask();
        });

        document.getElementById('deleteTaskBtn')?.addEventListener('click', () => {
            this.deleteTask();
        });

        // Category change - show/hide bug fields
        document.getElementById('taskCategory')?.addEventListener('change', (e) => {
            this.toggleBugFields(e.target.value === 'bug');
        });

        // Task detail modal
        document.getElementById('closeDetailModal')?.addEventListener('click', () => {
            document.getElementById('taskDetailModal').classList.add('hidden');
        });

        // Sprint modal
        document.getElementById('closeSprintModal')?.addEventListener('click', () => {
            document.getElementById('sprintModal').classList.add('hidden');
        });

        document.getElementById('addSprintBtn')?.addEventListener('click', () => {
            this.addSprint();
        });

        // Project selection
        document.getElementById('projectSelect')?.addEventListener('change', (e) => {
            this.currentProjectId = e.target.value ? parseInt(e.target.value) : null;
            this.currentSprintId = null; // Reset sprint selection when project changes
            this.saveData();
            this.populateSprintDropdowns();
            this.renderTasks();
            this.updateProgress();
        });

        // Manage projects button
        document.getElementById('manageProjectsBtn')?.addEventListener('click', () => {
            document.getElementById('projectModal').classList.remove('hidden');
        });

        // Project modal
        document.getElementById('closeProjectModal')?.addEventListener('click', () => {
            document.getElementById('projectModal').classList.add('hidden');
        });

        document.getElementById('addProjectBtn')?.addEventListener('click', () => {
            this.addProject();
        });

        // Close modals on backdrop click
        document.querySelectorAll('.kanban-modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });
    }

    initDragAndDrop() {
        this.columns.forEach(status => {
            const container = document.getElementById(`${status}Tasks`);
            if (container && typeof Sortable !== 'undefined') {
                new Sortable(container, {
                    group: 'kanban',
                    animation: 150,
                    ghostClass: 'task-ghost',
                    chosenClass: 'task-chosen',
                    dragClass: 'task-drag',
                    onEnd: (evt) => {
                        const taskId = evt.item.dataset.taskId;
                        const newStatus = evt.to.dataset.status;
                        this.moveTask(taskId, newStatus);
                    }
                });
            }
        });
    }

    moveTask(taskId, newStatus) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            const oldStatus = task.status;
            task.status = newStatus;

            const currentUser = authManager?.username || 'Unknown';
            const now = new Date().toISOString();

            // Add history entry
            if (!task.history) task.history = [];
            task.history.push({
                date: now,
                user: currentUser,
                action: 'Moved',
                details: `Status: ${oldStatus} → ${newStatus}`
            });

            if (newStatus === 'done') {
                task.completedAt = now;
            }

            this.saveData();
            this.updateColumnCounts();
            this.updateProgress();
            toastManager?.show('Task moved', 'success');
        }
    }

    renderTasks() {
        // Clear all columns
        this.columns.forEach(status => {
            const container = document.getElementById(`${status}Tasks`);
            if (container) container.innerHTML = '';
        });

        // Filter tasks
        let filteredTasks = this.tasks.filter(task => {
            // Project filter
            if (this.currentProjectId && task.projectId !== this.currentProjectId) return false;

            // Sprint filter
            if (this.currentSprintId && task.sprintId !== this.currentSprintId) return false;

            // Category filter
            if (this.filters.category && task.category !== this.filters.category) return false;

            // Language filter
            if (this.filters.language && task.language !== this.filters.language) return false;

            // Assignee filter
            if (this.filters.assignee && task.assignee !== this.filters.assignee) return false;

            return true;
        });

        // Render each task
        filteredTasks.forEach(task => {
            const container = document.getElementById(`${task.status}Tasks`);
            if (container) {
                container.appendChild(this.createTaskCard(task));
            }
        });

        this.updateColumnCounts();
    }

    createTaskCard(task) {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.dataset.taskId = task.id;

        const category = this.categories.find(c => c.id === task.category) || this.categories[0];
        const language = this.languages.find(l => l.id === task.language);
        const priority = task.category === 'bug' ? this.priorities.find(p => p.id === task.priority) : null;

        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
        const hasActivity = (task.history?.length > 1) || (task.comments?.length > 0);

        card.innerHTML = `
            <div class="task-card-header">
                <div class="task-category-badge" style="background-color: ${category.color}">
                    <i class="fas ${category.icon}"></i> ${category.name}
                </div>
                ${priority ? `<span class="task-priority-badge" style="background-color: ${priority.color}">${priority.name}</span>` : ''}
            </div>
            <div class="task-title">${this.escapeHtml(task.title)}</div>
            ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
            ${task.module ? `<div class="task-module"><i class="fas fa-file-code"></i> ${task.module}</div>` : ''}
            <div class="task-meta">
                ${language ? `<span class="task-language"><i class="fas fa-globe"></i> ${language.name}</span>` : ''}
                ${task.assignee ? `<span class="task-assignee"><i class="fas fa-user"></i> ${this.escapeHtml(task.assignee)}</span>` : ''}
                ${task.dueDate ? `<span class="task-due ${isOverdue ? 'overdue' : ''}"><i class="fas fa-calendar"></i> ${this.formatDate(task.dueDate)}</span>` : ''}
            </div>
            <div class="task-card-footer">
                ${hasActivity ? `<span class="task-activity"><i class="fas fa-history"></i> ${task.history?.length || 0} <i class="fas fa-comment"></i> ${task.comments?.length || 0}</span>` : ''}
                <button class="task-details-btn" title="View Details"><i class="fas fa-expand-alt"></i></button>
            </div>
        `;

        // Click card to edit
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.task-details-btn')) {
                this.openTaskModal(task);
            }
        });

        // Click details button to view history/comments
        card.querySelector('.task-details-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openTaskDetailModal(task);
        });

        return card;
    }

    updateColumnCounts() {
        this.columns.forEach(status => {
            const count = this.tasks.filter(t => {
                if (t.status !== status) return false;
                if (this.currentProjectId && t.projectId !== this.currentProjectId) return false;
                if (this.currentSprintId && t.sprintId !== this.currentSprintId) return false;
                if (this.filters.category && t.category !== this.filters.category) return false;
                if (this.filters.language && t.language !== this.filters.language) return false;
                if (this.filters.assignee && t.assignee !== this.filters.assignee) return false;
                return true;
            }).length;

            const countEl = document.getElementById(`${status}Count`);
            if (countEl) countEl.textContent = count;
        });
    }

    updateProgress() {
        let tasks = this.tasks;
        if (this.currentProjectId) {
            tasks = tasks.filter(t => t.projectId === this.currentProjectId);
        }
        if (this.currentSprintId) {
            tasks = tasks.filter(t => t.sprintId === this.currentSprintId);
        }

        const total = tasks.length;
        const done = tasks.filter(t => t.status === 'done').length;
        const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

        const fill = document.getElementById('sprintProgressFill');
        const text = document.getElementById('sprintProgressText');

        if (fill) fill.style.width = `${percentage}%`;
        if (text) text.textContent = `${percentage}% (${done}/${total})`;
    }

    toggleBugFields(show) {
        const bugFields = document.getElementById('bugFields');
        if (bugFields) {
            bugFields.classList.toggle('hidden', !show);
        }
    }

    openTaskModal(task = null) {
        const modal = document.getElementById('taskModal');
        const title = document.getElementById('taskModalTitle');
        const deleteBtn = document.getElementById('deleteTaskBtn');

        // Reset form
        document.getElementById('taskTitle').value = task?.title || '';
        document.getElementById('taskDescription').value = task?.description || '';
        document.getElementById('taskCategory').value = task?.category || 'dev';
        document.getElementById('taskLanguage').value = task?.language || 'all';
        document.getElementById('taskAssignee').value = task?.assignee || '';
        document.getElementById('taskDueDate').value = task?.dueDate || '';
        document.getElementById('taskProject').value = task?.projectId || this.currentProjectId || (this.projects.length > 0 ? this.projects[0].id : '');
        document.getElementById('taskSprint').value = task?.sprintId || this.currentSprintId || '';

        // Bug-specific fields
        document.getElementById('taskPriority').value = task?.priority || 'medium';
        document.getElementById('taskSeverity').value = task?.severity || 'minor';
        document.getElementById('taskModule').value = task?.module || '';

        // Show/hide bug fields based on category
        this.toggleBugFields(task?.category === 'bug' || (!task && document.getElementById('taskCategory').value === 'bug'));

        if (task) {
            title.textContent = 'Edit Task';
            deleteBtn.classList.remove('hidden');
            modal.dataset.taskId = task.id;
        } else {
            title.textContent = 'Add Task';
            deleteBtn.classList.add('hidden');
            delete modal.dataset.taskId;
        }

        modal.classList.remove('hidden');
        document.getElementById('taskTitle').focus();
    }

    saveTask() {
        const modal = document.getElementById('taskModal');
        const taskId = modal.dataset.taskId;

        const title = document.getElementById('taskTitle').value.trim();
        const description = document.getElementById('taskDescription').value.trim();
        const category = document.getElementById('taskCategory').value;
        const language = document.getElementById('taskLanguage').value;
        const assignee = document.getElementById('taskAssignee').value.trim();
        const dueDate = document.getElementById('taskDueDate').value;
        const projectId = document.getElementById('taskProject').value ? parseInt(document.getElementById('taskProject').value) : (this.projects.length > 0 ? this.projects[0].id : null);
        const sprintId = document.getElementById('taskSprint').value ? parseInt(document.getElementById('taskSprint').value) : null;

        // Bug-specific fields
        const priority = document.getElementById('taskPriority').value;
        const severity = document.getElementById('taskSeverity').value;
        const module = document.getElementById('taskModule').value;

        if (!title) {
            toastManager?.show('Please enter a task title', 'error');
            return;
        }

        const currentUser = authManager?.username || 'Unknown';
        const now = new Date().toISOString();

        if (taskId) {
            // Update existing task
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                // Track changes in history
                const changes = [];
                if (task.title !== title) changes.push(`Title changed`);
                if (task.status !== task.status) changes.push(`Status: ${task.status} → ${task.status}`);
                if (task.category !== category) changes.push(`Category changed to ${category}`);
                if (task.assignee !== assignee) changes.push(`Assignee: ${task.assignee || 'none'} → ${assignee || 'none'}`);
                if (category === 'bug') {
                    if (task.priority !== priority) changes.push(`Priority: ${task.priority || 'none'} → ${priority}`);
                    if (task.severity !== severity) changes.push(`Severity: ${task.severity || 'none'} → ${severity}`);
                }

                // Initialize history array if needed
                if (!task.history) task.history = [];
                if (!task.comments) task.comments = [];

                // Add history entry if there were changes
                if (changes.length > 0) {
                    task.history.push({
                        date: now,
                        user: currentUser,
                        action: 'Updated',
                        details: changes.join('; ')
                    });
                }

                task.title = title;
                task.description = description;
                task.category = category;
                task.language = language;
                task.assignee = assignee;
                task.dueDate = dueDate;
                task.projectId = projectId;
                task.sprintId = sprintId;
                task.updatedAt = now;

                // Bug fields
                if (category === 'bug') {
                    task.priority = priority;
                    task.severity = severity;
                    task.module = module;
                }
            }
            toastManager?.show('Task updated', 'success');
        } else {
            // Create new task
            const newTask = {
                id: 'task-' + Date.now(),
                title,
                description,
                category,
                language,
                assignee,
                dueDate,
                projectId,
                sprintId,
                status: 'todo',
                createdAt: now,
                createdBy: currentUser,
                history: [{
                    date: now,
                    user: currentUser,
                    action: 'Created',
                    details: `Task created as ${category}`
                }],
                comments: []
            };

            // Bug fields
            if (category === 'bug') {
                newTask.priority = priority;
                newTask.severity = severity;
                newTask.module = module;
            }

            this.tasks.push(newTask);
            toastManager?.show('Task created', 'success');
        }

        this.saveData();
        this.renderTasks();
        this.updateProgress();
        this.updateAssigneeFilter();
        modal.classList.add('hidden');
    }

    deleteTask() {
        const modal = document.getElementById('taskModal');
        const taskId = modal.dataset.taskId;

        if (taskId && confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveData();
            this.renderTasks();
            this.updateProgress();
            this.updateAssigneeFilter();
            modal.classList.add('hidden');
            toastManager?.show('Task deleted', 'success');
        }
    }

    renderSprintList() {
        const container = document.getElementById('sprintList');
        if (!container) return;

        if (this.sprints.length === 0) {
            container.innerHTML = '<p class="no-sprints">No sprints created yet.</p>';
            return;
        }

        container.innerHTML = this.sprints.map(sprint => `
            <div class="sprint-item" data-sprint-id="${sprint.id}">
                <div class="sprint-item-info">
                    <strong>${this.escapeHtml(sprint.name)}</strong>
                    <span>${this.formatDate(sprint.startDate)} - ${this.formatDate(sprint.endDate)}</span>
                </div>
                <button class="kanban-btn-icon delete-sprint" data-sprint-id="${sprint.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');

        // Add delete handlers
        container.querySelectorAll('.delete-sprint').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteSprint(parseInt(btn.dataset.sprintId));
            });
        });
    }

    addSprint() {
        const nameInput = document.getElementById('sprintName');
        const startInput = document.getElementById('sprintStartDate');
        const endInput = document.getElementById('sprintEndDate');

        const name = nameInput.value.trim();
        const startDate = startInput.value;
        const endDate = endInput.value;

        if (!name || !startDate || !endDate) {
            toastManager?.show('Please fill in all sprint fields', 'error');
            return;
        }

        if (new Date(endDate) < new Date(startDate)) {
            toastManager?.show('End date must be after start date', 'error');
            return;
        }

        const newSprint = {
            id: Math.max(0, ...this.sprints.map(s => s.id)) + 1,
            name,
            startDate,
            endDate,
            projectId: this.currentProjectId || (this.projects.length > 0 ? this.projects[0].id : null)
        };

        this.sprints.push(newSprint);
        this.saveData();
        this.populateSprintDropdowns();
        toastManager?.show('Sprint added', 'success');

        // Clear form
        nameInput.value = '';
        startInput.value = '';
        endInput.value = '';
    }

    deleteSprint(sprintId) {
        const tasksInSprint = this.tasks.filter(t => t.sprintId === sprintId).length;

        if (tasksInSprint > 0) {
            if (!confirm(`This sprint has ${tasksInSprint} task(s). Delete anyway? Tasks will be moved to "No Sprint".`)) {
                return;
            }
            // Move tasks out of sprint
            this.tasks.forEach(t => {
                if (t.sprintId === sprintId) t.sprintId = null;
            });
        }

        this.sprints = this.sprints.filter(s => s.id !== sprintId);

        // Reset current sprint if deleted
        if (this.currentSprintId === sprintId) {
            this.currentSprintId = this.sprints.length > 0 ? this.sprints[0].id : null;
        }

        this.saveData();
        this.populateSprintDropdowns();
        this.renderTasks();
        toastManager?.show('Sprint deleted', 'success');
    }

    openTaskDetailModal(task) {
        const modal = document.getElementById('taskDetailModal');
        const titleEl = document.getElementById('detailModalTitle');
        const contentEl = document.getElementById('taskDetailContent');

        const category = this.categories.find(c => c.id === task.category);
        const priority = this.priorities.find(p => p.id === task.priority);
        const severity = this.severities.find(s => s.id === task.severity);

        titleEl.textContent = task.title;

        contentEl.innerHTML = `
            <div class="task-detail-info">
                <div class="detail-badges">
                    <span class="task-category-badge" style="background-color: ${category?.color || '#666'}">
                        <i class="fas ${category?.icon || 'fa-tasks'}"></i> ${category?.name || task.category}
                    </span>
                    ${task.category === 'bug' && priority ? `<span class="task-priority-badge" style="background-color: ${priority.color}">${priority.name}</span>` : ''}
                    ${task.category === 'bug' && severity ? `<span class="task-severity-badge">${severity.name}</span>` : ''}
                </div>
                ${task.description ? `<p class="task-detail-desc">${this.escapeHtml(task.description)}</p>` : ''}
                ${task.module ? `<p class="task-detail-module"><i class="fas fa-file-code"></i> ${task.module}</p>` : ''}
                <div class="task-detail-meta">
                    ${task.assignee ? `<span><i class="fas fa-user"></i> ${this.escapeHtml(task.assignee)}</span>` : ''}
                    ${task.dueDate ? `<span><i class="fas fa-calendar"></i> ${this.formatDate(task.dueDate)}</span>` : ''}
                    <span><i class="fas fa-clock"></i> Created ${this.formatDateTime(task.createdAt)}</span>
                </div>
            </div>

            <!-- Comments Section -->
            <div class="task-detail-section">
                <h4><i class="fas fa-comments"></i> Comments (${task.comments?.length || 0})</h4>
                <div class="comment-form">
                    <textarea id="newComment" class="kanban-textarea" placeholder="Add a comment..." rows="2"></textarea>
                    <button id="addCommentBtn" class="kanban-btn kanban-btn-primary kanban-btn-sm">
                        <i class="fas fa-paper-plane"></i> Add Comment
                    </button>
                </div>
                <div class="comments-list" id="commentsList">
                    ${this.renderComments(task.comments || [])}
                </div>
            </div>

            <!-- History Section -->
            <div class="task-detail-section">
                <h4><i class="fas fa-history"></i> History (${task.history?.length || 0})</h4>
                <div class="history-list">
                    ${this.renderHistory(task.history || [])}
                </div>
            </div>

            <div class="task-detail-actions">
                <button id="editFromDetailBtn" class="kanban-btn kanban-btn-secondary">
                    <i class="fas fa-edit"></i> Edit Task
                </button>
            </div>
        `;

        // Store task id for adding comments
        modal.dataset.taskId = task.id;

        // Add comment handler
        contentEl.querySelector('#addCommentBtn')?.addEventListener('click', () => {
            this.addComment(task.id);
        });

        // Edit button handler
        contentEl.querySelector('#editFromDetailBtn')?.addEventListener('click', () => {
            modal.classList.add('hidden');
            this.openTaskModal(task);
        });

        modal.classList.remove('hidden');
    }

    renderComments(comments) {
        if (!comments || comments.length === 0) {
            return '<p class="no-items">No comments yet.</p>';
        }

        return comments.slice().reverse().map(comment => `
            <div class="comment-item">
                <div class="comment-header">
                    <span class="comment-user"><i class="fas fa-user-circle"></i> ${this.escapeHtml(comment.user)}</span>
                    <span class="comment-date">${this.formatDateTime(comment.date)}</span>
                </div>
                <div class="comment-text">${this.escapeHtml(comment.text)}</div>
            </div>
        `).join('');
    }

    renderHistory(history) {
        if (!history || history.length === 0) {
            return '<p class="no-items">No history yet.</p>';
        }

        return history.slice().reverse().map(entry => `
            <div class="history-item">
                <div class="history-icon"><i class="fas fa-circle"></i></div>
                <div class="history-content">
                    <span class="history-action">${entry.action}</span>
                    <span class="history-details">${this.escapeHtml(entry.details)}</span>
                    <span class="history-meta">by ${this.escapeHtml(entry.user)} · ${this.formatDateTime(entry.date)}</span>
                </div>
            </div>
        `).join('');
    }

    addComment(taskId) {
        const textarea = document.getElementById('newComment');
        const text = textarea?.value.trim();

        if (!text) {
            toastManager?.show('Please enter a comment', 'error');
            return;
        }

        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        if (!task.comments) task.comments = [];

        const currentUser = authManager?.username || 'Unknown';
        const now = new Date().toISOString();

        task.comments.push({
            date: now,
            user: currentUser,
            text: text
        });

        // Also add to history
        if (!task.history) task.history = [];
        task.history.push({
            date: now,
            user: currentUser,
            action: 'Commented',
            details: text.substring(0, 50) + (text.length > 50 ? '...' : '')
        });

        this.saveData();

        // Refresh the comments list
        const commentsList = document.getElementById('commentsList');
        if (commentsList) {
            commentsList.innerHTML = this.renderComments(task.comments);
        }

        // Clear textarea
        textarea.value = '';
        toastManager?.show('Comment added', 'success');

        // Re-render tasks to update activity indicators
        this.renderTasks();
    }

    // =========================================
    // VIEW MODE METHODS (Week/Month/Quarter)
    // =========================================

    setViewMode(mode) {
        this.viewMode = mode;

        // Update button states
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // Show/hide appropriate UI elements
        const sprintSelector = document.getElementById('sprintSelectorContainer');
        const periodNavigator = document.getElementById('periodNavigator');
        const kanbanBoard = document.getElementById('kanbanBoard');
        const accordion = document.getElementById('sprintAccordion');

        if (mode === 'week') {
            sprintSelector?.classList.remove('hidden');
            periodNavigator?.classList.add('hidden');
            kanbanBoard?.classList.remove('hidden');
            accordion?.classList.add('hidden');
            this.renderTasks();
            this.updateProgress();
        } else {
            sprintSelector?.classList.add('hidden');
            periodNavigator?.classList.remove('hidden');
            kanbanBoard?.classList.add('hidden');
            accordion?.classList.remove('hidden');
            this.updatePeriodLabel();
            this.renderAccordionView();
        }
    }

    navigatePeriod(direction) {
        if (this.viewMode === 'month') {
            this.selectedMonth = new Date(
                this.selectedMonth.getFullYear(),
                this.selectedMonth.getMonth() + direction,
                1
            );
        } else if (this.viewMode === 'quarter') {
            let newQuarter = this.selectedQuarter.quarter + direction;
            let newYear = this.selectedQuarter.year;

            if (newQuarter > 4) {
                newQuarter = 1;
                newYear++;
            } else if (newQuarter < 1) {
                newQuarter = 4;
                newYear--;
            }

            this.selectedQuarter = { year: newYear, quarter: newQuarter };
        }

        this.updatePeriodLabel();
        this.renderAccordionView();
    }

    updatePeriodLabel() {
        const label = document.getElementById('periodLabel');
        if (!label) return;

        if (this.viewMode === 'month') {
            label.textContent = this.selectedMonth.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
            });
        } else if (this.viewMode === 'quarter') {
            label.textContent = `Q${this.selectedQuarter.quarter} ${this.selectedQuarter.year}`;
        }
    }

    getSprintsInMonth(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);

        return this.sprints.filter(sprint => {
            const sprintStart = new Date(sprint.startDate + 'T00:00:00');
            const sprintEnd = new Date(sprint.endDate + 'T23:59:59');
            // Sprint overlaps with month if sprint starts before month ends AND sprint ends after month starts
            return sprintStart <= monthEnd && sprintEnd >= monthStart;
        }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    }

    getSprintsInQuarter(year, quarter) {
        const quarterStartMonth = (quarter - 1) * 3;
        const quarterStart = new Date(year, quarterStartMonth, 1);
        const quarterEnd = new Date(year, quarterStartMonth + 3, 0);

        return this.sprints.filter(sprint => {
            const sprintStart = new Date(sprint.startDate + 'T00:00:00');
            const sprintEnd = new Date(sprint.endDate + 'T23:59:59');
            return sprintStart <= quarterEnd && sprintEnd >= quarterStart;
        }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    }

    getTasksForSprint(sprintId) {
        return this.tasks.filter(task => {
            if (task.sprintId !== sprintId) return false;
            if (this.filters.category && task.category !== this.filters.category) return false;
            if (this.filters.language && task.language !== this.filters.language) return false;
            if (this.filters.assignee && task.assignee !== this.filters.assignee) return false;
            return true;
        });
    }

    getSprintProgress(sprintId) {
        const tasks = this.getTasksForSprint(sprintId);
        const total = tasks.length;
        const done = tasks.filter(t => t.status === 'done').length;
        return { total, done, percentage: total > 0 ? Math.round((done / total) * 100) : 0 };
    }

    getPeriodProgress() {
        let sprints;
        if (this.viewMode === 'month') {
            sprints = this.getSprintsInMonth(this.selectedMonth);
        } else {
            sprints = this.getSprintsInQuarter(this.selectedQuarter.year, this.selectedQuarter.quarter);
        }

        let totalTasks = 0;
        let doneTasks = 0;

        sprints.forEach(sprint => {
            const progress = this.getSprintProgress(sprint.id);
            totalTasks += progress.total;
            doneTasks += progress.done;
        });

        return {
            total: totalTasks,
            done: doneTasks,
            percentage: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
        };
    }

    renderAccordionView() {
        const container = document.getElementById('sprintAccordion');
        if (!container) return;

        let sprints;
        let periodTitle;

        if (this.viewMode === 'month') {
            sprints = this.getSprintsInMonth(this.selectedMonth);
            periodTitle = this.selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } else {
            sprints = this.getSprintsInQuarter(this.selectedQuarter.year, this.selectedQuarter.quarter);
            periodTitle = `Q${this.selectedQuarter.quarter} ${this.selectedQuarter.year}`;
        }

        // Update overall progress
        const periodProgress = this.getPeriodProgress();
        const nameEl = document.getElementById('sprintName');
        const datesEl = document.getElementById('sprintDates');
        const fillEl = document.getElementById('sprintProgressFill');
        const textEl = document.getElementById('sprintProgressText');

        if (nameEl) nameEl.textContent = periodTitle;
        if (datesEl) datesEl.textContent = `${sprints.length} sprint${sprints.length !== 1 ? 's' : ''}`;
        if (fillEl) fillEl.style.width = `${periodProgress.percentage}%`;
        if (textEl) textEl.textContent = `${periodProgress.percentage}% (${periodProgress.done}/${periodProgress.total})`;

        if (sprints.length === 0) {
            container.innerHTML = `
                <div class="accordion-empty">
                    <i class="fas fa-calendar-times"></i>
                    <p>No sprints in this ${this.viewMode}.</p>
                    <button class="kanban-btn kanban-btn-secondary" id="createSprintForPeriodBtn">
                        <i class="fas fa-plus"></i> Create Sprint
                    </button>
                </div>
            `;
            container.querySelector('#createSprintForPeriodBtn')?.addEventListener('click', () => {
                document.getElementById('sprintModal').classList.remove('hidden');
            });
            return;
        }

        container.innerHTML = sprints.map(sprint => this.renderAccordionSprint(sprint)).join('');

        // Setup accordion toggle handlers
        container.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (!e.target.closest('.accordion-edit-btn')) {
                    const sprintId = parseInt(header.dataset.sprintId);
                    this.toggleSprintAccordion(sprintId);
                }
            });
        });

        // Setup edit buttons
        container.querySelectorAll('.accordion-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sprintId = parseInt(btn.dataset.sprintId);
                this.currentSprintId = sprintId;
                document.getElementById('sprintSelect').value = sprintId;
                this.setViewMode('week');
            });
        });

        // Setup task card click handlers
        container.querySelectorAll('.task-card').forEach(card => {
            const taskId = card.dataset.taskId;
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                card.addEventListener('click', (e) => {
                    if (!e.target.closest('.task-details-btn')) {
                        this.openTaskModal(task);
                    }
                });
                card.querySelector('.task-details-btn')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openTaskDetailModal(task);
                });
            }
        });

        // Re-init drag and drop for expanded sprints
        this.initAccordionDragDrop();
    }

    renderAccordionSprint(sprint) {
        const isExpanded = this.expandedSprints.has(sprint.id);
        const progress = this.getSprintProgress(sprint.id);
        const tasks = this.getTasksForSprint(sprint.id);

        const tasksByStatus = {
            'todo': tasks.filter(t => t.status === 'todo'),
            'in-progress': tasks.filter(t => t.status === 'in-progress'),
            'review': tasks.filter(t => t.status === 'review'),
            'done': tasks.filter(t => t.status === 'done')
        };

        return `
            <div class="accordion-sprint ${isExpanded ? 'expanded' : ''}" data-sprint-id="${sprint.id}">
                <div class="accordion-header" data-sprint-id="${sprint.id}">
                    <div class="accordion-toggle">
                        <i class="fas fa-chevron-${isExpanded ? 'down' : 'right'}"></i>
                    </div>
                    <div class="accordion-sprint-info">
                        <span class="accordion-sprint-name">${this.escapeHtml(sprint.name)}</span>
                        <span class="accordion-sprint-dates">${this.formatDate(sprint.startDate)} - ${this.formatDate(sprint.endDate)}</span>
                    </div>
                    <div class="accordion-progress">
                        <div class="accordion-progress-bar">
                            <div class="accordion-progress-fill" style="width: ${progress.percentage}%"></div>
                        </div>
                        <span class="accordion-progress-text">${progress.percentage}%</span>
                    </div>
                    <div class="accordion-task-counts">
                        <span class="count-todo" title="To Do">${tasksByStatus['todo'].length}</span>
                        <span class="count-progress" title="In Progress">${tasksByStatus['in-progress'].length}</span>
                        <span class="count-review" title="Review">${tasksByStatus['review'].length}</span>
                        <span class="count-done" title="Done">${tasksByStatus['done'].length}</span>
                    </div>
                    <button class="accordion-edit-btn kanban-btn-icon" data-sprint-id="${sprint.id}" title="Open in Week View">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                </div>
                ${isExpanded ? `
                    <div class="accordion-content">
                        <div class="accordion-kanban">
                            <div class="accordion-column" data-status="todo" data-sprint-id="${sprint.id}">
                                <div class="accordion-column-header">
                                    <span>To Do</span>
                                    <span class="column-count">${tasksByStatus['todo'].length}</span>
                                </div>
                                <div class="accordion-column-tasks" data-status="todo" data-sprint-id="${sprint.id}">
                                    ${tasksByStatus['todo'].map(t => this.renderAccordionTaskCard(t)).join('')}
                                </div>
                            </div>
                            <div class="accordion-column" data-status="in-progress" data-sprint-id="${sprint.id}">
                                <div class="accordion-column-header">
                                    <span>In Progress</span>
                                    <span class="column-count">${tasksByStatus['in-progress'].length}</span>
                                </div>
                                <div class="accordion-column-tasks" data-status="in-progress" data-sprint-id="${sprint.id}">
                                    ${tasksByStatus['in-progress'].map(t => this.renderAccordionTaskCard(t)).join('')}
                                </div>
                            </div>
                            <div class="accordion-column" data-status="review" data-sprint-id="${sprint.id}">
                                <div class="accordion-column-header">
                                    <span>Review</span>
                                    <span class="column-count">${tasksByStatus['review'].length}</span>
                                </div>
                                <div class="accordion-column-tasks" data-status="review" data-sprint-id="${sprint.id}">
                                    ${tasksByStatus['review'].map(t => this.renderAccordionTaskCard(t)).join('')}
                                </div>
                            </div>
                            <div class="accordion-column" data-status="done" data-sprint-id="${sprint.id}">
                                <div class="accordion-column-header">
                                    <span>Done</span>
                                    <span class="column-count">${tasksByStatus['done'].length}</span>
                                </div>
                                <div class="accordion-column-tasks" data-status="done" data-sprint-id="${sprint.id}">
                                    ${tasksByStatus['done'].map(t => this.renderAccordionTaskCard(t)).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderAccordionTaskCard(task) {
        const category = this.categories.find(c => c.id === task.category) || this.categories[0];
        const priority = task.category === 'bug' ? this.priorities.find(p => p.id === task.priority) : null;
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

        return `
            <div class="task-card accordion-task-card" data-task-id="${task.id}">
                <div class="task-card-header">
                    <div class="task-category-badge" style="background-color: ${category.color}">
                        <i class="fas ${category.icon}"></i>
                    </div>
                    ${priority ? `<span class="task-priority-badge" style="background-color: ${priority.color}">${priority.name}</span>` : ''}
                </div>
                <div class="task-title">${this.escapeHtml(task.title)}</div>
                <div class="task-meta">
                    ${task.assignee ? `<span><i class="fas fa-user"></i> ${this.escapeHtml(task.assignee)}</span>` : ''}
                    ${task.dueDate ? `<span class="${isOverdue ? 'overdue' : ''}"><i class="fas fa-calendar"></i> ${this.formatDate(task.dueDate)}</span>` : ''}
                </div>
                <div class="task-card-footer">
                    <button class="task-details-btn" title="View Details"><i class="fas fa-expand-alt"></i></button>
                </div>
            </div>
        `;
    }

    toggleSprintAccordion(sprintId) {
        if (this.expandedSprints.has(sprintId)) {
            this.expandedSprints.delete(sprintId);
        } else {
            this.expandedSprints.add(sprintId);
        }
        this.renderAccordionView();
    }

    initAccordionDragDrop() {
        if (typeof Sortable === 'undefined') return;

        document.querySelectorAll('.accordion-column-tasks').forEach(container => {
            new Sortable(container, {
                group: 'accordion-kanban',
                animation: 150,
                ghostClass: 'task-ghost',
                chosenClass: 'task-chosen',
                dragClass: 'task-drag',
                onEnd: (evt) => {
                    const taskId = evt.item.dataset.taskId;
                    const newStatus = evt.to.dataset.status;
                    this.moveTask(taskId, newStatus);
                    // Re-render to update counts
                    this.renderAccordionView();
                }
            });
        });
    }

    formatDateTime(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    destroy() {
        // Clean up if needed
        debugLogger?.log(2, 'Kanban Tracker destroyed');
    }
}
