## [ERR-20260717-001] powershell_reserved_variable

**Logged**: 2026-07-17T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
Inspection command attempted to assign to PowerShell's read-only `$HOME` variable.

### Error
```
Cannot overwrite variable HOME because it is read-only or constant.
```

### Context
- A temporary `$home` variable was used while reading `src/pages/HomePage.vue`.

### Suggested Fix
Use task-specific names such as `$homepage` for shell variables.

### Metadata
- Reproducible: yes
- Related Files: src/pages/HomePage.vue

### Resolution
- **Resolved**: 2026-07-17T00:00:00+08:00
- **Notes**: Subsequent inspection uses `$homepage`.

---

## [ERR-20260717-003] ripgrep_no_match_exit_code

**Logged**: 2026-07-17T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
A read-only icon inspection command returned a non-zero exit code because a follow-up `rg` query found no matches.

### Error
```
Exit code: 1
```

### Context
- The command combined `Get-Content` with an optional `rg` search.

### Suggested Fix
Run required file reads separately from optional no-match searches.

### Metadata
- Reproducible: yes
- Related Files: src/components/Icon.vue

### Resolution
- **Resolved**: 2026-07-17T00:00:00+08:00
- **Notes**: The icon file was re-read with a direct command.

---

## [ERR-20260717-002] vue_template_empty_binding

**Logged**: 2026-07-17T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
Vue template compilation rejects an empty bound attribute expression.

### Error
```
TS1003: Identifier expected.
```

### Context
- `src/pages/MinePage.vue` used `:alt=""` for a decorative image.

### Suggested Fix
Use the static empty attribute `alt=""` when no dynamic value is required.

### Metadata
- Reproducible: yes
- Related Files: src/pages/MinePage.vue

### Resolution
- **Resolved**: 2026-07-17T00:00:00+08:00
- **Notes**: Replaced the empty Vue binding with a static attribute.

---
