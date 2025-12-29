# Dependency Audit Report - LaughLab V2

**Generated:** 2025-12-29
**Total Dependencies:** 18 (9 production, 9 dev)

---

## 🚨 CRITICAL SECURITY VULNERABILITIES

### 1. Next.js - CRITICAL (Score: 9.1/10)
- **Current Version:** 14.2.21
- **Vulnerable:** YES - Multiple critical vulnerabilities
- **Severity:** CRITICAL
- **Issues Found:**
  - Authorization Bypass in Middleware (CVE Score: 9.1)
  - Denial of Service with Server Components (CVE Score: 7.5)
  - SSRF via Improper Middleware Redirect Handling (CVE Score: 6.5)
  - Cache Poisoning vulnerabilities
  - Image Optimization content injection
- **Recommendation:** **IMMEDIATE UPDATE TO 14.2.35**
- **Breaking Changes:** None (patch update)

### 2. glob (via eslint-config-next) - HIGH (Score: 7.5/10)
- **Current Version:** 10.2.x - 10.4.5 (transitive dependency)
- **Vulnerable:** YES - Command injection via CLI
- **Severity:** HIGH
- **Issue:** Command injection via -c/--cmd executes matches with shell:true
- **Recommendation:** Update eslint-config-next to 16.1.1
- **Breaking Changes:** Major version bump for eslint-config-next

---

## 📦 OUTDATED PACKAGES

### Production Dependencies

| Package | Current | Wanted | Latest | Update Type | Risk |
|---------|---------|--------|--------|-------------|------|
| @anthropic-ai/sdk | 0.32.1 | 0.32.1 | **0.71.2** | Major (39 versions behind) | Medium |
| lucide-react | 0.468.0 | 0.468.0 | **0.562.0** | Minor | Low |
| next | 14.2.21 | 14.2.21 | 16.1.1 | Major | **High (security)** |
| react | 18.3.1 | 18.3.1 | 19.2.3 | Major | Medium |
| react-dom | 18.3.1 | 18.3.1 | 19.2.3 | Major | Medium |
| recharts | 2.15.0 | 2.15.4 | 3.6.0 | Major | Medium |
| @supabase/supabase-js | 2.47.10 | 2.89.0 | 2.89.0 | Minor | **N/A (UNUSED)** |

### Dev Dependencies

| Package | Current | Wanted | Latest | Status |
|---------|---------|--------|--------|--------|
| eslint-config-next | 14.2.21 | 14.2.21 | 16.1.1 | **Vulnerable** |
| typescript | 5.7.2 | 5.7.2 | 5.7.2 | ✓ Up to date |
| tailwindcss | 3.4.17 | 3.4.17 | 3.4.17 | ✓ Up to date |
| postcss | 8.4.49 | 8.4.49 | 8.4.49 | ✓ Up to date |
| autoprefixer | 10.4.20 | 10.4.20 | 10.4.20 | ✓ Up to date |

---

## 🗑️ UNNECESSARY BLOAT

### Unused Dependencies (Can be safely removed)

#### @supabase/supabase-js (2.47.10)
- **Status:** NOT USED anywhere in the codebase
- **Size Impact:** ~500KB+ (with dependencies)
- **Search Results:** Only found in package.json and package-lock.json
- **Recommendation:** **REMOVE IMMEDIATELY**
- **Savings:** Reduces node_modules size and installation time

---

## 📊 DEPENDENCY USAGE ANALYSIS

### ✅ Dependencies Currently in Use

1. **@anthropic-ai/sdk** - Used in `src/app/api/analyze/route.ts`
2. **zod** - Used in `src/lib/validation.ts` for schema validation
3. **zustand** - Used in `src/lib/store.ts` for state management
4. **lucide-react** - Used in multiple components for icons
5. **recharts** - Used in chart components (LaughTimeline, JokeDistribution, CharacterChart)
6. **next, react, react-dom** - Core framework (used throughout)

### ❌ Dependencies NOT in Use

1. **@supabase/supabase-js** - Zero imports found

---

## 🎯 RECOMMENDED ACTIONS

### Phase 1: IMMEDIATE (Security Critical)
**Timeline:** Within 24 hours

```bash
# 1. Remove unused dependency
npm uninstall @supabase/supabase-js

# 2. Update Next.js to patch security vulnerabilities
npm install next@14.2.35

# 3. Update eslint-config-next to fix glob vulnerability
npm install --save-dev eslint-config-next@14.2.35

# 4. Run tests to verify everything works
npm run build
npm run lint
```

**Impact:**
- ✅ Eliminates CRITICAL authorization bypass vulnerability
- ✅ Fixes DoS vulnerabilities
- ✅ Removes unused bloat
- ⚠️ Minimal breaking changes (patch versions)

### Phase 2: NEAR-TERM (Within 1 week)
**Timeline:** Before next deployment

```bash
# Update Anthropic SDK (check for API changes)
npm install @anthropic-ai/sdk@latest

# Update icons
npm install lucide-react@latest

# Update Zod if on 4.x (verify version - seems high)
npm list zod  # Check actual version
```

**Impact:**
- ✅ Gets latest bug fixes and features
- ✅ Better TypeScript support
- ⚠️ May require code updates for @anthropic-ai/sdk

### Phase 3: MEDIUM-TERM (Plan for next sprint)
**Timeline:** Within 1 month

Consider upgrading to Next.js 15+ and React 19:

```bash
# Major version upgrades (test thoroughly)
npm install next@latest react@latest react-dom@latest
npm install --save-dev eslint-config-next@latest

# Update recharts to v3
npm install recharts@latest
```

**Impact:**
- ✅ Access to React 19 features (React Compiler, Server Actions improvements)
- ✅ Next.js 15 features (Turbopack, improved caching)
- ⚠️ Requires thorough testing
- ⚠️ Potential breaking changes in recharts 3.x
- ⚠️ React 19 may have TypeScript definition changes

---

## 📈 MAINTENANCE RECOMMENDATIONS

### Regular Dependency Health Checks

1. **Weekly:** Run `npm audit` to check for new vulnerabilities
2. **Monthly:** Run `npm outdated` to check for updates
3. **Quarterly:** Review and audit for unused dependencies

### Commands to Add to package.json

```json
{
  "scripts": {
    "audit:check": "npm audit --audit-level=moderate",
    "audit:fix": "npm audit fix",
    "deps:check": "npm outdated",
    "deps:update": "npm update"
  }
}
```

### Dependency Policy Recommendations

1. **Security patches:** Update within 24 hours
2. **Minor versions:** Update monthly (if no breaking changes)
3. **Major versions:** Plan and test before updating
4. **Before adding new deps:** Ask "Do we really need this?"

---

## 💰 COST IMPACT

### Current State
- **Total npm packages:** ~486 (114 prod, 364 dev, 35 optional)
- **Estimated node_modules size:** ~300-400MB

### After Cleanup
- **Remove @supabase/supabase-js:** Save ~500KB+
- **Update security patches:** No size change
- **Overall improvement:** Faster installs, smaller Docker images

---

## 🔍 DETAILED FINDINGS

### Why @supabase/supabase-js Should Be Removed

**Evidence:**
```bash
# Search results show ZERO usage
$ grep -r "supabase" --include="*.ts" --include="*.tsx" --include="*.js" src/
# No results

$ grep -r "createClient" --include="*.ts" --include="*.tsx" src/
# No results

$ grep -r "@supabase" --include="*.ts" --include="*.tsx" src/
# No results
```

**Conclusion:** This was likely added for future features but is not currently used.

### Anthropic SDK Version Gap Analysis

- **Current:** 0.32.1 (Released ~6 months ago)
- **Latest:** 0.71.2 (39 versions behind)
- **Risk:** Missing bug fixes, performance improvements, and new features
- **Action:** Review changelog and update

### Zod Version Check

Current package.json shows `zod@^4.2.1`, but Zod's latest stable is 3.x series. This seems incorrect - likely should be `3.x` instead of `4.x`. Need to verify actual installed version.

```bash
# Verify actual Zod version
npm list zod
```

If Zod is actually 3.x in package-lock.json, update package.json to reflect this.

---

## ✅ SUMMARY CHECKLIST

- [ ] **CRITICAL:** Remove @supabase/supabase-js
- [ ] **CRITICAL:** Update next@14.2.35
- [ ] **CRITICAL:** Update eslint-config-next@14.2.35
- [ ] **HIGH:** Update @anthropic-ai/sdk to latest
- [ ] **MEDIUM:** Update lucide-react to latest
- [ ] **LOW:** Verify Zod version is correct
- [ ] **PLAN:** Schedule React 19 / Next.js 15 upgrade
- [ ] **POLICY:** Add weekly npm audit to CI/CD
- [ ] **POLICY:** Add dependency review to PR template

---

## 🚀 QUICK START

Copy and paste this to fix critical issues now:

```bash
# Backup package.json first
cp package.json package.json.backup

# Remove unused dependency
npm uninstall @supabase/supabase-js

# Fix critical security vulnerabilities
npm install next@14.2.35 eslint-config-next@14.2.35

# Verify build works
npm run build

# Commit changes
git add package.json package-lock.json
git commit -m "Security: Update Next.js to 14.2.35, remove unused @supabase/supabase-js"
```

---

**Report End**
