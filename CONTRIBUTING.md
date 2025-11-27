# Contributing to WSOL

Thank you for contributing to the Bob and Mariel Ward School of Filipino Languages platform!

## Documentation Requirements

### Mandatory Documentation Sync

This project enforces a **documentation-first** policy. All code changes must include corresponding documentation updates.

#### The Three Documentation Files

| File | Purpose | Audience |
|------|---------|----------|
| `USER_GUIDE.md` | How to use the application | Students, teachers, end users |
| `FUNCTIONAL_GUIDE.md` | How the system works | Administrators, programmers |
| `AI_DEVELOPER_GUIDE.md` | Technical implementation details | AI coding assistants, developers |

#### Before Every Commit

You MUST:

1. **Check USER_GUIDE.md** - Did you change anything users interact with?
   - New buttons, menus, or UI elements
   - Changed workflows or procedures
   - New features or removed features
   - Error messages or help text

2. **Check FUNCTIONAL_GUIDE.md** - Did you change how the system works?
   - New modules or components
   - Changed data flow or architecture
   - Admin functionality changes
   - Configuration changes

3. **Check AI_DEVELOPER_GUIDE.md** - Did you change the code structure?
   - New or modified APIs
   - Changed data structures
   - New classes or modules
   - Modified file organization
   - Changed naming conventions

#### Commit Message Guidelines

When documentation is updated, note it in your commit message:

```
feat: Add voice speed control slider

- Added speed slider to voice practice module
- Updated USER_GUIDE.md with new control instructions
- Updated AI_DEVELOPER_GUIDE.md with VoicePractice API changes
```

## Code Style

- Use ES6+ JavaScript
- Follow existing naming conventions (see AI_DEVELOPER_GUIDE.md)
- Extend `LearningModule` base class for new learning modules
- Use CSS custom properties for theming

## Pull Request Checklist

- [ ] Code follows existing style conventions
- [ ] USER_GUIDE.md updated (if user-facing changes)
- [ ] FUNCTIONAL_GUIDE.md updated (if system behavior changes)
- [ ] AI_DEVELOPER_GUIDE.md updated (if code structure changes)
- [ ] Tested in multiple browsers (Chrome, Firefox, Safari)
- [ ] No console errors or warnings

## Questions?

If you're unsure whether documentation needs updating, err on the side of updating it. Clear documentation helps everyone!
