# WSOL - GitHub Copilot Instructions

## Project Context

This is the Bob and Mariel Ward School of Filipino Languages - a language learning web application for teaching Filipino languages (Cebuano, Maranao, Sinama) to English speakers.

## CRITICAL: Documentation Sync Requirement

**After ANY code changes, you MUST check and update these documentation files:**

### Required Documentation Files

| File | Audience | Update When... |
|------|----------|----------------|
| `USER_GUIDE.md` | Students & Teachers | User-facing features, UI, or workflows change |
| `FUNCTIONAL_GUIDE.md` | Admins & Programmers | System behavior, architecture, or admin features change |
| `AI_DEVELOPER_GUIDE.md` | AI Developers | APIs, modules, data structures, or code patterns change |

### Documentation Workflow

1. **After completing code changes**, read each of the three documentation files
2. **Identify** sections that may be affected by your changes
3. **Update** any documentation that no longer matches the code
4. **Include** documentation updates in the same commit/PR

### What Triggers Each File Update

**USER_GUIDE.md:**
- New or changed UI elements (buttons, menus, dialogs)
- Modified user workflows or procedures
- New features or removed features
- Changed error messages or help text

**FUNCTIONAL_GUIDE.md:**
- Architecture or data flow changes
- Admin feature modifications
- Configuration changes
- Module interaction changes

**AI_DEVELOPER_GUIDE.md:**
- New or modified API endpoints
- Class structure changes
- Data structure modifications
- File organization changes
- Naming convention updates

## Technology Stack

- **Frontend:** Pure JavaScript (ES6+), CSS3 with custom properties
- **Backend:** PHP with MySQL database
- **Architecture:** Class-based modules extending `LearningModule` base class

## Key Directories

```
/js/modules/     - Learning module classes
/js/admin/       - Admin tool classes
/css/            - Stylesheets
/php/            - Backend API endpoints
/assets/         - Images and audio files
```

## Code Style Guidelines

- Use ES6+ JavaScript features
- Follow existing naming conventions documented in AI_DEVELOPER_GUIDE.md
- Extend `LearningModule` base class for new learning modules
- Use CSS custom properties for theming
- No external framework dependencies

## Commit Checklist

Before committing, verify:
- [ ] Code changes are complete and tested
- [ ] USER_GUIDE.md reviewed and updated if needed
- [ ] FUNCTIONAL_GUIDE.md reviewed and updated if needed
- [ ] AI_DEVELOPER_GUIDE.md reviewed and updated if needed
