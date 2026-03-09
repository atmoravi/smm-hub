# WordPress Plugin Development Standards
## Universal Guidelines for Professional Plugin Development

**Version:** 1.2.0
**Last Updated:** 2026-03-08
**Applicable to:** All WordPress plugins, especially those handling scale (100+ users/recipients)

---

## Table of Contents
1. [Core Philosophy](#core-philosophy)
2. [AI Agent Workflow](#ai-agent-workflow)
3. [Architecture Principles](#architecture-principles)
4. [Admin UI Tabs Architecture](#admin-ui-tabs-architecture)
5. [Security First](#security-first)
6. [Performance at Scale](#performance-at-scale)
7. [Context-Aware Loading](#context-aware-loading)
8. [Code Organization](#code-organization)
9. [WordPress Standards](#wordpress-standards)
10. [Database Guidelines](#database-guidelines)
11. [Error Handling](#error-handling)
12. [Documentation](#documentation)
13. [Testing & Validation](#testing--validation)

---

## Core Philosophy

### The 90/10 Rule
**Deliver 90% of the value with 10% of the complexity.**

- Simple solutions over complex abstractions
- WordPress-native approaches over custom implementations
- Minimal overhead, maximum benefit
- Avoid over-engineering for hypothetical future requirements

### Scale-First Thinking
**Every decision must consider scale from day one.**

- Will this work with 500+ records?
- Will this create database bloat?
- What's the performance impact per request?
- Can this be cached or use transients instead of DB queries?

### Production-Ready Code
**Write code as if it's going to production tomorrow.**

- Proper error handling (no silent failures)
- Security by default (sanitize, validate, escape)
- Clean architecture (maintainable, testable)
- Comprehensive documentation

### No Laziness
**Find root causes. No temporary fixes. Senior developer standards.**

- Investigate before patching — symptoms point to causes
- Never paper over a bug with a workaround that obscures it
- If the fix feels wrong, it probably is — find the right fix

### Minimal Impact
**Touch only what is necessary to accomplish the task.**

- A bug fix should not refactor surrounding code
- A new feature should not restructure unrelated files
- Fewer changed lines = fewer introduced bugs

---

## AI Agent Workflow

These rules govern how the AI agent operates during development sessions. They are process standards, not code standards — they define how work is planned, executed, and verified.

---

### 1. Plan Before You Code

**Rule:** Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions).

- Write the plan to `tasks/todo.md` with checkable items before touching code
- Verify the plan with the user before starting implementation
- If something goes sideways mid-task, STOP and re-plan — do not keep pushing
- Use plan mode for verification steps, not just building

```
tasks/todo.md format:
## Task: [Description]

### Plan
- [ ] Step 1: ...
- [ ] Step 2: ...
- [ ] Step 3: ...

### Review
- Outcome: ...
- Lessons: ...
```

---

### 2. Track Progress Explicitly

**Rule:** Mark tasks complete as you go. Explain changes at each step.

- Mark each `tasks/todo.md` item complete immediately after finishing it
- Do not batch completions — mark done when done
- Provide a high-level summary at each natural milestone
- Add a review section to `tasks/todo.md` after the task is fully done

---

### 3. Capture Lessons After Corrections

**Rule:** After ANY correction from the user, update `tasks/lessons.md` with the pattern.

- Write a rule for yourself that prevents the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review `tasks/lessons.md` at the start of sessions for relevant patterns

```
tasks/lessons.md format:
## Lesson: [Short title]
**Mistake:** What went wrong
**Correct pattern:** What to do instead
**Trigger:** When this applies
```

---

### 4. Verify Before Declaring Done

**Rule:** Never mark a task complete without proving it works.

- Run syntax checks, tests, or demonstrate correctness in logs
- Diff behavior between `main` and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Do not claim a bug is fixed without evidence it is fixed

---

### 5. Use Subagents to Stay Focused

**Rule:** Keep the main context window clean. Offload research and parallel analysis to subagents.

- One task per subagent for focused execution
- Use subagents for: exploration, research, reading large codebases, parallel analysis
- Do not duplicate in the main thread work already delegated to a subagent
- For complex problems, throw more compute at it via subagents rather than expanding main context

---

### 6. Check for Elegance Before Presenting Work

**Rule:** For non-trivial changes, pause and ask "is there a more elegant way?"

- If a fix feels hacky: step back and implement the clean solution
- If you know more now than when you started, apply that knowledge
- Skip this for simple, obvious fixes — do not over-engineer

**Skip this check for:** one-line fixes, obvious renames, direct user instructions

---

### 7. Fix Bugs Autonomously

**Rule:** When given a bug report, investigate and fix it. Do not ask for hand-holding.

- Use logs, errors, and failing tests to locate the root cause
- Resolve the issue without requiring the user to guide each step
- If CI is failing, go fix it — do not wait to be told how
- If blocked, surface the specific blocker — not a general request for direction

---

## The Vanguard Standard (Tier 1 Compliance)

**Vanguard Compliance** is the official audit-pass state for FNL Pulse plugins. A plugin is only considered Vanguard-compliant when it achieves the four pillars of "Stealth & Speed":

1.  **Zero-Blocking Performance:** Synchronous database writes or heavy lookups are entirely removed from critical paths (like checkout or page load). Transients and Object Caching are the primary data sources.
2.  **Dormant Footprint (Context-Aware):** Through strict "Rule 1-7" implementation, the plugin consumes zero PHP memory on unrelated requests. It remains dormant until its specific context (Admin, Webhook, or API) is triggered.
3.  **Defense-in-Depth Security:** Security is not left to WordPress defaults. It includes explicit nonce verification, capability scoping at the menu level, and strict input/output sanitization.
4.  **Architectural Purity (SRP-300):** Every class has a single, documented responsibility and is kept under 300 lines. Logic is delegated to specialized handlers rather than monolithic controllers.

---

## Architecture Principles

### 1. Single Responsibility Principle (SRP)

**Rule:** Each class should have ONE clear purpose, max 300 lines.

```php
// ❌ BAD: Monolithic Admin class (900+ lines)
class Admin {
    public function handle_campaigns() { }
    public function handle_settings() { }
    public function handle_woocommerce() { }
    public function enqueue_assets() { }
    // ... 900 more lines
}

// ✅ GOOD: Focused, single-purpose classes
class AdminCore {
    // Only: menu registration, asset enqueuing, hook registration
}

class AjaxCampaignHandler {
    // Only: campaign AJAX operations
}

class AjaxSettingsHandler {
    // Only: settings AJAX operations
}
```

### 2. DRY (Don't Repeat Yourself)

**Rule:** If you write the same code twice, create an abstraction.

```php
// ❌ BAD: Duplicated filter logic
class WooCommerce {
    public function apply_filter($data) {
        if (!isset($data['action'])) $data['action'] = 'include';
        if (!isset($data['match_type'])) $data['match_type'] = 'products';
        // ... validation logic
    }
}

class Memberlux {
    public function apply_filter($data) {
        if (!isset($data['action'])) $data['action'] = 'include';
        if (!isset($data['match_type'])) $data['match_type'] = 'active';
        // ... same validation logic
    }
}

// ✅ GOOD: Shared parent class
abstract class FilterBase {
    protected function validate_filter_data(array $data): array {
        // Shared validation logic
    }
}

class WooCommerce extends FilterBase { }
class Memberlux extends FilterBase { }
```

### 3. Separation of Concerns

**Rule:** Keep business logic, data access, and presentation separate.

```php
// ✅ GOOD: Clear separation
class Campaign {
    // Data access layer - interacts with database
    public static function create(array $data): ?int { }
    public static function get(int $id): ?object { }
}

class CampaignPreparation {
    // Business logic - prepares campaign for sending
    public static function prepare_campaign(int $id): bool { }
}

class AjaxCampaignHandler {
    // Controller - handles HTTP requests/responses
    public static function ajax_create_campaign(): void { }
}
```

### 4. Dependency Management

**Rule:** Use WordPress native functions; avoid external dependencies unless absolutely necessary.

```php
// ✅ GOOD: WordPress native
set_transient('my_data', $data, HOUR_IN_SECONDS);
get_option('my_settings');
wp_schedule_event(time(), 'hourly', 'my_cron');

// ❌ BAD: External dependency for something WordPress provides
require 'vendor/cache-library/cache.php';
$cache = new ExternalCache();
```

---

## Admin UI Tabs Architecture

Any violation of these principles is an architectural defect.

### 1. Core Architecture Principles (Non-Negotiable)

1. The plugin admin UI is one page, one runtime.
2. Tabs are isolated views, not independent applications.
3. JavaScript initializes once per page load.
4. No tab may assume another tab is loaded, visible, or initialized.
5. All cross-tab effects must flow through persisted state.

---

### 2. Tab Isolation Rules

#### 2.1 What a Tab Is

A tab is:

- A self-contained UI view
- Owning its own DOM, logic, and local state
- Initialized lazily and only once

A tab is not:

- Allowed to mutate other tabs
- Allowed to share mutable in-memory state
- Allowed to re-render global containers

---

#### 2.2 DOM Rules

- All tab containers are rendered at page load
- Tab switching is CSS visibility only
- No tab container is replaced at runtime

---

### 3. JavaScript Structure Rules

#### 3.1 Entry Point

- Exactly one admin JavaScript entry point is enqueued
- The entry point:
- Bootstraps the tab system
- Registers delegated events
- Contains no tab-specific logic

---

#### 3.2 Modular Codebase

- JavaScript is split into:
- Core modules (tabs, ajax, store)
- One module per tab
- Tab modules export a single init() function
- Tab modules must not auto-execute code on import

---

#### 3.3 Event Handling

- Event delegation only
- No direct bindings to elements
- No per-tab document.ready

This ensures stability after AJAX updates and refactors.

---

### 4. State Model (Critical)

#### 4.1 Two Types of State

Local (Draft) State:

- Exists only in the browser
- Used for immediate UI feedback
- Owned by a single tab
- Lost on reload

Persisted State:

- Saved to database via AJAX
- Shared across tabs
- Source of truth for all cross-tab behavior

---

#### 4.2 State Boundary Rule

Tabs may freely mutate local draft state. Only persisted state may affect other tabs.

No exceptions.

---

### 5. Save Changes Rule (Mandatory)

#### 5.1 When Save Is Required

Any tab that:

- Creates data
- Modifies data
- Changes plugin behavior

Must provide a "Save Changes" action or an equivalent auto-save mechanism.

---

#### 5.2 Meaning of Save

- "Save" commits draft state to persistent storage
- Only after save may:
- Other tabs reflect the change
- The change be considered real

---

#### 5.3 UX Clarification

- Immediate UI updates inside a tab are allowed
- Cross-tab visibility requires saved state
- Unsaved changes must be clearly indicated

---

### 6. Cross-Tab Communication Rules

1. Tabs must never directly communicate with each other.
2. Tabs must never read another tab's draft state.
3. Tabs may only react to:
- Saved settings
- Explicit documented events
4. Persisted state is the single source of truth.

---

### 7. AJAX Rules

- AJAX endpoints return JSON only
- No HTML fragments
- No inline scripts
- Each tab owns its own endpoints
- AJAX calls must be idempotent and scoped

---

### 8. Rendering Rules

Tabs may:

- Update input values
- Toggle classes
- Append small UI fragments

Tabs may not:

- Replace parent containers
- Re-render the full tab
- Inject executable code

---

### 9. Performance Guarantees

Each tab must satisfy:

- Initializes once
- No duplicate event listeners
- No repeated AJAX calls on tab switching
- Instant tab switching (CSS only)

Performance regressions are treated as bugs.

---

### 10. Error Isolation

- Errors must be logged with tab context
- A failing tab must not affect others
- No global exception handling inside tab modules

---

### 11. AI Refactoring Protocol (Mandatory)

When refactoring or creating a tab, the AI agent must:

1. Work on one tab at a time
2. Preserve tab isolation
3. Remove inline JavaScript
4. Ensure delegated events
5. Introduce explicit Save Changes if state mutates
6. Convert implicit state to persisted state
7. Avoid touching sibling tabs

---

### 12. Definition of Done (Per Tab)

A tab is considered complete when:

- It initializes once
- It survives repeated tab switching
- It does not affect other tabs
- Its behavior depends only on persisted state
- All mutations require Save Changes

---

### 13. Forbidden Patterns (Never Allowed)

- Hidden cross-tab dependencies
- Shared mutable JS objects
- Re-render-everything strategies
- Per-tab script enqueues
- Implicit state propagation
- "Magic" UI updates without persistence

---

### Final Rule (Must Be Understood)

Local state is for speed. Persisted state is for truth. Tabs only trust the truth.

---

## Security First

### 1. Input Validation & Sanitization

**Rule:** NEVER trust user input. Sanitize everything.

```php
// ✅ GOOD: Comprehensive validation
public static function ajax_create_campaign(): void {
    // 1. Nonce verification
    check_ajax_referer('nfnl_admin_nonce', 'nonce');

    // 2. Capability check
    if (!current_user_can('manage_options')) {
        wp_send_json_error(['message' => 'Permission denied']);
    }

    // 3. Sanitize inputs
    $name = sanitize_text_field($_POST['name'] ?? '');
    $channel = sanitize_text_field($_POST['channel'] ?? '');
    $message = wp_kses_post($_POST['message'] ?? '');

    // 4. Validate against allowed values
    $allowed_channels = ['telegram', 'instagram', 'tiktok'];
    if (!in_array($channel, $allowed_channels, true)) {
        wp_send_json_error(['message' => 'Invalid channel']);
    }

    // 5. Enhanced validation (SQL injection, XSS detection)
    $validation = Security::validate_campaign_data([
        'name' => $name,
        'message_template' => $message
    ]);

    if (!$validation['valid']) {
        wp_send_json_error(['message' => implode(' ', $validation['errors'])]);
    }
}
```

### 2. Output Escaping

**Rule:** Escape ALL output based on context.

```php
// ✅ GOOD: Context-appropriate escaping
<h1><?php echo esc_html($campaign->name); ?></h1>
<a href="<?php echo esc_url($campaign->url); ?>">Link</a>
<div><?php echo wp_kses_post($campaign->message); ?></div>
<input value="<?php echo esc_attr($campaign->tag); ?>">
```

### 3. SQL Injection Prevention

**Rule:** ALWAYS use prepared statements. NEVER concatenate user input into SQL.

```php
// ❌ BAD: SQL injection vulnerability
$id = $_GET['id'];
$wpdb->query("DELETE FROM campaigns WHERE id = $id");

// ✅ GOOD: Prepared statement
$id = absint($_GET['id']);
$wpdb->query($wpdb->prepare(
    "DELETE FROM {$wpdb->prefix}campaigns WHERE id = %d",
    $id
));

// ✅ BETTER: Use constants for table names
$wpdb->query($wpdb->prepare(
    "DELETE FROM " . Constants::get_table(Constants::TABLE_CAMPAIGNS) . " WHERE id = %d",
    $id
));
```

### 4. CSRF Protection

**Rule:** Use nonces for ALL state-changing operations.

```php
// ✅ GOOD: Nonce in forms
<form method="post">
    <?php wp_nonce_field('nfnl_create_campaign', 'nfnl_nonce'); ?>
    <input type="text" name="campaign_name">
    <button type="submit">Create</button>
</form>

// ✅ GOOD: Nonce verification
if (!wp_verify_nonce($_POST['nfnl_nonce'], 'nfnl_create_campaign')) {
    wp_die('Security check failed');
}

// ✅ GOOD: AJAX nonce
check_ajax_referer('nfnl_admin_nonce', 'nonce');
```

### 5. Rate Limiting

**Rule:** Protect against abuse with smart rate limiting.

```php
// ✅ GOOD: Rate limiting before expensive operations
if (!Security::check_smart_rate_limit('campaign_send', 10)) {
    wp_send_json_error(['message' => 'Too many requests. Please wait.']);
}

// Use WordPress transients (auto-cleanup)
public static function check_smart_rate_limit(string $action, int $limit): bool {
    $key = 'rate_' . $action . '_' . get_current_user_id();
    $count = (int)get_transient($key);

    if ($count >= $limit) {
        return false;
    }

    set_transient($key, $count + 1, HOUR_IN_SECONDS);
    return true;
}
```

---

## Performance at Scale

### 1. Avoid Database Bloat

**Rule:** NEVER log routine operations to database at scale.

```php
// ❌ BAD: Creates 500+ log rows per 500-recipient campaign
foreach ($recipients as $recipient) {
    $wpdb->insert('logs', [
        'event' => 'message_sent',
        'recipient_id' => $recipient->id
    ]);
}

// ✅ GOOD: Log only critical security events to error_log
if ($is_suspicious) {
    error_log('SECURITY: Suspicious activity detected');
}

// ✅ GOOD: Use aggregate metrics in wp_options
update_option('campaign_stats', [
    'total_sent' => 500,
    'last_send' => current_time('mysql')
]);
```

### 2. Use Transients for Temporary Data

**Rule:** Use WordPress transients instead of custom caching tables.

```php
// ✅ GOOD: Transients for rate limiting
set_transient('rate_limit_' . $user_id, $count, HOUR_IN_SECONDS);

// ✅ GOOD: Transients for IP blocking
set_transient('ip_blocked_' . md5($ip), $reason, DAY_IN_SECONDS);

// ✅ GOOD: Auto-cleanup, no manual maintenance
```

### 3. Optimize Database Queries

**Rule:** Minimize queries; use indexes; avoid N+1 problems.

```php
// ❌ BAD: N+1 query problem
$campaigns = Campaign::get_all();
foreach ($campaigns as $campaign) {
    $stats = Campaign::get_stats($campaign->id); // Query per campaign!
}

// ✅ GOOD: Single query with JOIN
SELECT c.*,
       COUNT(CASE WHEN m.status = 'sent' THEN 1 END) as sent_count,
       COUNT(CASE WHEN m.status = 'failed' THEN 1 END) as failed_count
FROM campaigns c
LEFT JOIN messages m ON c.id = m.campaign_id
GROUP BY c.id
```

### 4. Batch Processing

**Rule:** Process large datasets in chunks to avoid memory issues.

```php
// ✅ GOOD: Chunk processing
$chunks = array_chunk($contact_ids, 1000);
foreach ($chunks as $chunk) {
    // Process 1000 at a time
    $this->process_chunk($chunk);
}

// ✅ GOOD: Background queue processing
// Process 50 messages per cron run (every minute)
const BATCH_SIZE = 50;
```

---

## Context-Aware Loading

> **Lesson learned (v7.5.5–7.5.6):** Every class file being loaded unconditionally caused 16 PHP files parsed + 6 redundant `get_option()` calls + 9 uncached `SHOW TABLES` queries on every single page load — including the WordPress "Add New Page" screen which has nothing to do with this plugin. This section codifies the rules that prevent this pattern from recurring.

### The Four Request Contexts

Every request falls into exactly one of these categories. Know which context you are in before writing any loading, instantiation, or hook registration code.

| Context | When it fires | What this plugin needs |
|---------|--------------|----------------------|
| `frontend` | Public page view | UTM capture, pixel enqueue, visit/consent/event AJAX handlers |
| `admin_plugin` | WP-Admin on a plugin page | Everything |
| `admin_other` | WP-Admin on any other page (posts, media, etc.) | Nothing except schema version guard |
| `ajax_frontend` | `wp-admin/admin-ajax.php`, non-logged-in or frontend origin | Visit, consent, event handlers only |
| `ajax_admin` | `wp-admin/admin-ajax.php`, logged-in admin origin | All admin AJAX handlers |
| `rest` | REST API request | Webhook route handlers, CAPI classes |
| `cron` | WP-Cron | Statistics aggregator, data cleaner only |

### Rule 1 — Never `require_once` unconditionally at file scope

Every class file loaded at plugin boot is PHP memory and parse time spent on **every request**. Gate class loading behind context.

```php
// ❌ BAD — always loads admin analytics, TikTok settings, etc. on frontend pages
require_once UTM_HANDLER_PATH . 'includes/class-analytics.php';
require_once UTM_HANDLER_PATH . 'includes/class-statistics-aggregator.php';
require_once UTM_HANDLER_PATH . 'includes/class-tiktok-settings.php';

// ✅ GOOD — admin/cron classes only load in admin or cron context
$is_cron             = defined('DOING_CRON') && DOING_CRON;
$is_admin_or_ajax    = is_admin() || ( defined('DOING_AJAX') && DOING_AJAX && is_admin() );

if ( $is_admin_or_ajax || $is_cron ) {
    require_once UTM_HANDLER_PATH . 'includes/class-analytics.php';
    require_once UTM_HANDLER_PATH . 'includes/class-statistics-aggregator.php';
    require_once UTM_HANDLER_PATH . 'includes/class-tiktok-settings.php';
}
```

**Categorise every class file as one of:**
- **Always** — e.g. Logger, DatabaseManager (needed in all contexts)
- **Non-cron** — e.g. CAPI classes, pixel integrations (not needed during WP-Cron)
- **Admin/Cron** — e.g. Settings, Analytics, StatisticsAggregator (never needed on public frontend)

### Rule 2 — Never instantiate classes unconditionally at file scope or in `plugins_loaded`

Class instantiation runs constructors which call `get_option()`, register hooks, and set up internal state. Instantiating admin-only classes on every frontend request wastes all of that.

```php
// ❌ BAD — constructor runs on every page load, calling get_option() and registering hooks
add_action('init', function() {
    new GrabFNLAnalytics();              // Admin-only class
    new GrabFNL_Statistics_Aggregator(); // Admin-only class
    MetaPixelIntegration::init();        // Frontend-only class
});

// ✅ GOOD — instantiate in the right context only
add_action('init', function() {
    if ( is_admin() ) {
        new GrabFNLAnalytics();
        GrabFNL_Statistics_Aggregator::init();
    }
    if ( ! is_admin() ) {
        MetaPixelIntegration::init();
    }
}, 15);
```

### Rule 3 — Never register admin-only AJAX handlers on frontend requests

`add_action('wp_ajax_*')` calls are cheap individually, but every call adds a PHP closure to the global hook table for the lifetime of the request. Admin dashboard actions — analytics data, test CAPI, manual purchase, traffic quality — have no reason to exist in the hook table on a public landing page.

```php
// ❌ BAD — admin AJAX handlers registered on every frontend page load
public static function register(): void {
    add_action('wp_ajax_utm_handler_get_visits',          [...]);
    add_action('wp_ajax_utm_test_capi',                   [...]);
    add_action('wp_ajax_utm_handler_manual_purchase',     [...]);
    add_action('wp_ajax_nopriv_fp_grabfnl_update_consent', [...]);  // frontend: OK
}

// ✅ GOOD — split by who needs them
public static function register(): void {
    // These fire for both logged-in and non-logged-in users (frontend AJAX)
    add_action('wp_ajax_nopriv_fp_grabfnl_update_consent', [...]);
    add_action('wp_ajax_fp_grabfnl_update_consent',        [...]);
    add_action('wp_ajax_nopriv_fp_grabfnl_update_fbp',    [...]);
    add_action('wp_ajax_fp_grabfnl_update_fbp',           [...]);
    add_action('wp_ajax_nopriv_utm_track_event',          [...]);
    add_action('wp_ajax_utm_track_event',                 [...]);

    // Admin-only — skip entirely when not in admin context
    if ( ! is_admin() && ! ( defined('DOING_AJAX') && DOING_AJAX && is_admin() ) ) {
        return;
    }

    add_action('wp_ajax_utm_handler_get_visits',          [...]);
    add_action('wp_ajax_utm_test_capi',                   [...]);
    // ... all other admin-only handlers
}
```

### Rule 4 — Never register the same hook twice

Duplicate `add_action()` / `add_filter()` calls for the same action cause the callback to fire twice per event. This is always a bug. It typically happens when a legacy class and a new dispatcher both try to own the same endpoint.

```php
// ❌ BAD — both of these register the same action
// Dispatcher.php line 42:
add_action('wp_ajax_utm_handler_get_nonce', [UtilityHandler::class, 'get_nonce']);
// class-advanced-utm-handler.php line 52 (legacy):
add_action('wp_ajax_utm_handler_get_nonce', [$this, 'handle_get_nonce']);
```

**Rule:** When a new handler owns an action, remove the registration from the legacy class. Do not leave both in place "just in case".

Search for duplicate registrations before shipping:
```bash
grep -r "add_action\|add_filter" includes/ src/ --include="*.php" \
  | grep -oP "'[^']+'" | sort | uniq -d
```

### Rule 5 — Never call `get_option()` more than once per request for the same option

WordPress object-caches `get_option()` results, so repeated calls don't hit the database. But PHP-level function call overhead and array deserialisation still occur. With 6 classes each calling `get_option('utm_handler_options')` independently, the same array is deserialised 6 times per page load.

Use a static PHP cache:

```php
// ✅ GOOD — GrabFNL\Core\Options (src/Core/Options.php)
class Options {
    private static ?array $main = null;

    public static function main(): array {
        if ( self::$main === null ) {
            self::$main = get_option('utm_handler_options', []);
        }
        return self::$main;
    }

    public static function flush(): void {
        self::$main = null; // Call after saving options
    }
}
```

```php
// ❌ BAD — 6 separate calls across 6 classes
$options = get_option('utm_handler_options', []);

// ✅ GOOD — single PHP-level fetch, shared across all callers
$options = \GrabFNL\Core\Options::main();
```

### Rule 6 — Never run schema/migration checks on every frontend page

`Schema::create_tables()` and `DatabaseManager::create_table()` run `SHOW TABLES` and `SHOW COLUMNS` queries. These checks are only meaningful in admin or AJAX contexts where a logged-in user might have just installed or upgraded the plugin.

```php
// ❌ BAD — schema check runs on every public page load
add_action('init', [Schema::class, 'create_tables'], 5);

// ✅ GOOD — only runs where it matters
if ( is_admin() || ( defined('DOING_AJAX') && DOING_AJAX ) ) {
    add_action('init', [Schema::class, 'create_tables'], 5);
}

// ✅ GOOD — version guard prevents migration queries when no upgrade pending
if ( version_compare( get_option('grabfnl_migrations_version', '0.0'), GRABFNL_VERSION, '<' ) ) {
    \DatabaseManager::create_table();
}
```

### Rule 7 — Never register admin utility hooks on non-plugin admin pages

Hooks like `admin_init` → `register_settings()`, `admin_head` → `add_help_tab()`, and `admin_enqueue_scripts` → enqueue plugin assets should only do real work on plugin-owned pages. Guard callbacks at the registration level where possible; fall back to an early return with `get_current_screen()` inside the callback.

```php
// ❌ BAD — register_settings() runs on Add New Post, Media Library, every admin page
add_action('admin_init', [$this, 'register_settings']);

// ✅ GOOD — only registers on plugin pages or when saving plugin options
add_action('admin_init', function() {
    $on_plugin_page  = \GrabFNL\Core\Context::is_plugin_admin_page();
    $saving_options  = isset($_POST['option_page'])
                       && strpos($_POST['option_page'], 'utm_handler') !== false;
    if ( $on_plugin_page || $saving_options ) {
        $this->register_settings();
    }
});
```

### Context-Aware Loading Checklist

Add these to every code review for any hook, class load, or instantiation:

- [ ] **Which context does this code serve?** (frontend / admin_plugin / admin_other / ajax / cron / rest)
- [ ] **Is this class file loaded only when its context is active?** (Rule 1)
- [ ] **Is this class instantiated only in the context it serves?** (Rule 2)
- [ ] **Are admin-only AJAX handlers skipped on frontend requests?** (Rule 3)
- [ ] **Is this hook already registered elsewhere?** (`grep` for duplicates — Rule 4)
- [ ] **Does this call `get_option()`?** If yes, use `Options::main()` instead (Rule 5)
- [ ] **Does this run a DB query (`SHOW TABLES`, `SHOW COLUMNS`, schema check) on every request?** Add a context or version guard (Rule 6)
- [ ] **Does this admin hook need to run on non-plugin admin pages?** Add a screen guard (Rule 7)

---

## Code Organization

### 1. File Structure

**Standard WordPress plugin structure:**

```
plugin-root/
├── plugin-name.php              # Main plugin file (bootstrapper only)
├── CODING-STANDARDS.md          # This file
├── README.md                    # User-facing documentation
├── .claude/
│   └── instructions.md          # AI agent instructions
├── includes/
│   ├── class-constants.php      # All constants in one place
│   ├── class-database.php       # Database schema & migrations
│   ├── class-security.php       # Security utilities
│   ├── class-{feature}.php      # Feature classes
│   ├── admin/
│   │   ├── class-admin-core.php
│   │   └── class-ajax-{feature}-handler.php
│   └── {module}/
│       └── class-{module}-component.php
├── templates/
│   └── {feature}-{page}.php     # HTML templates
├── assets/
│   ├── css/
│   ├── js/
│   └── images/
└── tests/                       # Unit/integration tests
```

### 2. Naming Conventions

```php
// Classes: PascalCase
class AjaxCampaignHandler { }

// Constants: SCREAMING_SNAKE_CASE
const TABLE_CAMPAIGNS = 'campaigns';
const RATE_LIMIT_SEND = 10;

// Functions/Methods: snake_case
public static function ajax_create_campaign() { }

// Variables: snake_case
$campaign_id = 123;
$recipient_count = 500;

// Private methods: prefix with underscore (optional)
private static function _validate_internal_data() { }

// Transient keys: prefix with plugin slug
set_transient('nfnl_rate_limit_' . $action, $count, 3600);

// Option keys: prefix with plugin slug
update_option('nfnl_security_stats', $metrics);

// Database tables: prefix with wp_prefix + plugin slug
$wpdb->prefix . 'nfnl_campaigns'
```

### 3. Class Organization

**Standard method order within a class:**

```php
class ExampleClass {
    // 1. Constants
    const RATE_LIMIT = 10;

    // 2. Static properties
    private static $instance = null;

    // 3. Instance properties
    private $data = [];

    // 4. Constructor
    private function __construct() { }

    // 5. Public static methods (factories, singletons)
    public static function instance(): self { }

    // 6. Public methods (alphabetically)
    public function create() { }
    public function delete() { }
    public function get() { }
    public function update() { }

    // 7. Protected methods (alphabetically)
    protected function validate() { }

    // 8. Private methods (alphabetically)
    private function sanitize_data() { }
}
```

---

## WordPress Standards

### 1. WordPress Coding Standards

Follow WordPress PHP Coding Standards: https://developer.wordpress.org/coding-standards/wordpress-coding-standards/php/

**Key points:**
- Use tabs for indentation (not spaces)
- Yoda conditions: `if ( 'value' === $variable )`
- Braces on same line: `if ( $condition ) {`
- Space after keywords: `if ( condition )` not `if(condition)`

### 2. WordPress Functions First

**Rule:** Use WordPress functions instead of PHP natives when available.

```php
// ✅ GOOD: WordPress functions
wp_json_encode($data);        // instead of json_encode()
wp_parse_args($args, $defaults);  // instead of array_merge()
wp_unslash($_POST['data']);   // instead of stripslashes()
sanitize_text_field($input);  // instead of trim(strip_tags())

// ✅ GOOD: WordPress constants
HOUR_IN_SECONDS   // instead of 3600
DAY_IN_SECONDS    // instead of 86400
WEEK_IN_SECONDS   // instead of 604800
```

### 3. Hooks & Filters

**Rule:** Use appropriate hooks; don't bypass WordPress lifecycle.

```php
// ✅ GOOD: Use WordPress hooks
add_action('plugins_loaded', [$this, 'init']);
add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
add_filter('cron_schedules', [$this, 'add_custom_schedule']);

// ✅ GOOD: Provide hooks for extensibility
do_action('nfnl_before_send_campaign', $campaign_id);
$recipients = apply_filters('nfnl_campaign_recipients', $recipients, $campaign_id);
```

---

## Database Guidelines

### 1. Table Creation

**Rule:** Use dbDelta() for table creation; include proper indexes.

```php
public static function create_campaigns_table(): void {
    global $wpdb;

    $table_name = Constants::get_table(Constants::TABLE_CAMPAIGNS);
    $charset_collate = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE {$table_name} (
        id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        name varchar(255) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'draft',
        total_recipients int(11) DEFAULT 0,
        created_at datetime NOT NULL,
        PRIMARY KEY  (id),
        KEY status (status),
        KEY created_at (created_at)
    ) {$charset_collate};";

    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
}
```

### 2. Data Types

**Rule:** Use appropriate data types to save space.

```php
// ✅ GOOD: Appropriate data types
id BIGINT(20) UNSIGNED           // Large, unique IDs
user_id BIGINT(20) UNSIGNED      // WordPress user IDs
count INT(11)                    // Counts, quantities
status VARCHAR(20)               // Known limited values (use ENUM sparingly)
created_at DATETIME              // Timestamps
message_template LONGTEXT        // Large text content
is_active TINYINT(1)            // Boolean flags
```

### 3. Indexes

**Rule:** Add indexes to columns used in WHERE, JOIN, ORDER BY clauses.

```php
// ✅ GOOD: Indexed for common queries
KEY status (status)                    // WHERE status = 'draft'
KEY campaign_id (campaign_id)          // JOIN ON campaign_id
KEY created_at (created_at)            // ORDER BY created_at DESC
KEY status_created (status, created_at) // WHERE status = 'x' ORDER BY created_at
```

---

## Error Handling

### 1. Logging Strategy

**Rule:** Use WordPress error_log for debugging; don't bloat database.

```php
// ✅ GOOD: Error logging
public static function error(string $message, array $context = []): void {
    $safe_context = self::sanitize_event_data($context);
    error_log('PluginName ERROR: ' . $message . ' ' . wp_json_encode($safe_context));
}

// ✅ GOOD: Debug logging (only in WP_DEBUG mode)
public static function debug(string $message, array $context = []): void {
    if (!defined('WP_DEBUG') || !WP_DEBUG) {
        return;
    }
    error_log('PluginName DEBUG: ' . $message . ' ' . wp_json_encode($context));
}
```

### 2. User-Facing Errors

**Rule:** Return helpful error messages; don't expose sensitive data.

```php
// ✅ GOOD: User-friendly error
if (!$campaign_id) {
    wp_send_json_error([
        'message' => 'Campaign creation failed. Please try again.'
    ]);
}

// ❌ BAD: Exposing internal details
wp_send_json_error([
    'message' => 'MySQL error: ' . $wpdb->last_error,
    'query' => $wpdb->last_query
]);
```

### 3. Graceful Degradation

**Rule:** Handle missing dependencies gracefully.

```php
// ✅ GOOD: Graceful degradation
if (!class_exists('WooCommerce')) {
    return []; // Return empty instead of fatal error
}

if (!function_exists('memberlux_get_levels')) {
    add_action('admin_notices', function() {
        echo '<div class="notice notice-warning">';
        echo '<p>Memberlux integration requires Memberlux plugin v2.0+</p>';
        echo '</div>';
    });
    return;
}
```

---

## Documentation

### 1. PHPDoc Standards

**Rule:** Document ALL public methods with PHPDoc.

```php
/**
 * Create a new campaign
 *
 * @param array $data Campaign data including name, tag, channel, message_template
 * @return int|null Campaign ID on success, null on failure
 */
public static function create(array $data): ?int {
    // Implementation
}

/**
 * Send campaign to recipients
 *
 * @param int $campaign_id Campaign ID to send
 * @param bool $confirmed Whether user confirmed safety warnings
 * @return bool|array True on success, array with error details on failure
 */
public static function send(int $campaign_id, bool $confirmed = false) {
    // Implementation
}
```

### 2. Inline Comments

**Rule:** Explain WHY, not WHAT. Code should be self-explanatory.

```php
// ❌ BAD: Obvious comment
// Set campaign status to sending
$campaign->status = 'sending';

// ✅ GOOD: Explains reasoning
// Mark as sending BEFORE queue creation to prevent duplicate sends
// if user clicks "Send" multiple times rapidly
$campaign->status = 'sending';

// ✅ GOOD: Explains non-obvious decision
// Use chunks of 1000 to balance memory usage vs. number of queries.
// Testing showed 1000 is optimal for 500-5000 recipient campaigns.
$chunks = array_chunk($contact_ids, 1000);
```

### 3. README & Documentation Files

**Rule:** Maintain up-to-date documentation.

```
README.md              # User-facing: features, installation, usage
CODING-STANDARDS.md    # Developer-facing: this file
CHANGELOG.md           # Version history, breaking changes
PHASE-X-COMPLETE.md    # Implementation documentation
```

---

## Testing & Validation

### 1. Pre-Commit Checklist

**Before every commit, verify:**

- [ ] No PHP syntax errors (`php -l file.php`)
- [ ] All user inputs sanitized
- [ ] All outputs escaped
- [ ] All database queries use prepared statements
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Error handling in place
- [ ] PHPDoc comments on public methods
- [ ] No hardcoded credentials or secrets
- [ ] Admin tabs render at page load (no HTML fragments over AJAX)
- [ ] Tabs switch via CSS only (no tab HTML re-render)
- [ ] Per-tab JS initializes once (no duplicate listeners)
- [ ] New class file is gated behind the correct context (not unconditional require_once)
- [ ] New class instantiation is guarded by `is_admin()` / `!is_admin()` where appropriate
- [ ] New AJAX handlers split: frontend handlers always, admin-only handlers behind `is_admin()` guard
- [ ] No duplicate `add_action()` for same hook in multiple files (grep to verify)
- [ ] `get_option('utm_handler_options')` uses `Options::main()` not a direct call
- [ ] Schema / `SHOW TABLES` queries wrapped in admin/AJAX context guard
- [ ] Admin utility hooks (`register_settings`, `admin_head`) guarded to plugin pages only
- [ ] Version number updated (if applicable)
- [ ] Commit message explains WHY, not just WHAT

### 2. Manual Testing

**Test these scenarios:**

- [ ] Happy path (normal operation)
- [ ] Empty inputs / missing data
- [ ] Very large inputs (>1000 records)
- [ ] Concurrent operations (race conditions)
- [ ] Permission denied scenarios
- [ ] Missing dependencies (WooCommerce disabled, etc.)
- [ ] Fresh installation
- [ ] Plugin update/migration

### 3. Performance Testing

**For scale-sensitive features:**

- [ ] Test with 500+ recipients
- [ ] Monitor database query count
- [ ] Check memory usage
- [ ] Verify no N+1 query problems
- [ ] Ensure transients auto-cleanup
- [ ] Confirm <2% overhead for new features

---

## Version Control

### 1. Commit Messages

**Format:**
```
Short summary (50 chars max)

Detailed explanation of:
- WHAT changed
- WHY it changed (most important)
- HOW it was implemented (if non-obvious)

Fixes: #123 (if applicable)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Example:**
```
Phase 3A: Core Security - Minimal Implementation

Implemented lightweight security features optimized for 500+ recipient scale:
- Smart rate limiting (transient-based, no DB bloat)
- Enhanced input validation (in-memory, no DB writes)
- IP-based auto-blocking (transient-based)
- Campaign safety checks (prevents accidental mass sends)

Performance Impact: <2% overhead, zero database bloat
Security Benefit: 90% of value for 30% of effort

Version bumped to 1.2.0
```

### 2. Branching Strategy

**Simple workflow:**
- `main` - Production-ready code
- `feature/phase-X` - Feature branches
- Tag releases: `v1.0.0`, `v1.1.0`, `v1.2.0`

---

## Quick Reference Checklist

### Starting a New Plugin

- [ ] Create proper file structure (see Code Organization)
- [ ] Copy CODING-STANDARDS.md to plugin root
- [ ] Create .claude/instructions.md referencing this file
- [ ] Set up Constants class for all constants
- [ ] Set up Security class for validation/sanitization
- [ ] Set up Database class for schema management
- [ ] Plan for scale (500+ records) from day one

### Refactoring Existing Plugin

- [ ] Read entire codebase first
- [ ] Identify monolithic classes (>300 lines)
- [ ] Extract constants to Constants class
- [ ] Implement consistent error logging
- [ ] Eliminate code duplication (create base classes)
- [ ] Split large classes by responsibility
- [ ] Add security hardening (rate limiting, validation, IP blocking)
- [ ] Test at scale (500+ records)
- [ ] Document changes in PHASE-X-COMPLETE.md

### Before Every Commit

- [ ] Run syntax check: `php -l file.php`
- [ ] Verify all inputs sanitized
- [ ] Verify all outputs escaped
- [ ] Verify all SQL uses prepared statements
- [ ] Update version if needed
- [ ] Write meaningful commit message

---

## Enforcement

**This is not optional.** These standards exist because:

1. **Security:** Prevents vulnerabilities that could compromise user data
2. **Performance:** Ensures plugins work at scale (500+ records)
3. **Maintainability:** Makes code understandable 6 months from now
4. **Professionalism:** Delivers production-ready, enterprise-grade code

When in doubt, ask: "Would I be comfortable deploying this to production tomorrow?"

If the answer is no, it doesn't meet these standards.

---

## Updates & Feedback

This document evolves. Update it when you discover better patterns or WordPress releases new best practices.

**Last reviewed:** 2026-03-08 — Added AI Agent Workflow section + No Laziness/Minimal Impact to Core Philosophy (v1.2.0)
**Next review:** 2026-09-08 (or when WordPress core updates significantly)
