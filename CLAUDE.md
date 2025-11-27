# WSOL - Claude Code Instructions

## Project Overview

This is the Bob and Mariel Ward School of Filipino Languages learning platform - a web app for teaching Cebuano, Maranao, and Sinama to English speakers.

## Critical: Documentation Sync Requirement

**After ANY code changes, you MUST check and update these three documentation files:**

### 1. USER_GUIDE.md
**Audience:** Students and teachers
**Update when you change:**
- Any UI element (buttons, menus, dialogs)
- User workflows or procedures
- Feature behavior that users interact with
- Error messages or help text
- Keyboard shortcuts or accessibility features

### 2. FUNCTIONAL_GUIDE.md
**Audience:** Administrators and programmers
**Update when you change:**
- System architecture or data flow
- Admin features or tools
- Module interactions
- Configuration options
- How data is stored or processed

### 3. AI_DEVELOPER_GUIDE.md
**Audience:** AI developers and coding assistants
**Update when you change:**
- API endpoints or signatures
- Class structures or inheritance
- Data structures or schemas
- File organization
- Naming conventions
- Module interfaces

## Documentation Update Workflow

1. After completing code changes, READ each of the three files
2. IDENTIFY sections affected by your changes
3. UPDATE the documentation to match the new code state
4. INCLUDE documentation updates in the same commit

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

## Before Committing

Always verify:
- [ ] Code changes are complete and tested
- [ ] USER_GUIDE.md checked/updated
- [ ] FUNCTIONAL_GUIDE.md checked/updated
- [ ] AI_DEVELOPER_GUIDE.md checked/updated
