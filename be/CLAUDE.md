# Backend (be/) — Claude Guidance

## Logging Strategy

### Format

Spring Boot ECS structured logging (`logging.structured.format.console: ecs`) is enabled.  
All log output is JSON — do not use plain-text `log.info("field={}", value)` style.

### SLF4J 2.x Fluent API (Standard Pattern)

Use the fluent API so contextual fields become **top-level JSON fields** in ECS output,  
not embedded strings inside `message`.

```java
// CORRECT
log.atInfo()
        .addKeyValue("cr_name", crName)
        .addKeyValue("semaphore_task_id", taskId)
        .log("SSH 키 등록");

// WRONG — fields are buried inside the message string
log.info("[Semaphore] SSH 키 등록: crName={}, taskId={}", crName, taskId);
```

For exceptions, chain `.setCause(e)` instead of passing the exception as a positional arg:

```java
log.atError()
        .addKeyValue("http_status", e.getStatusCode().value())
        .addKeyValue("response_body", e.getResponseBodyAsString())
        .setCause(e)
        .log("SSH 키 등록 실패");
```

### MDC — Trace Context Propagation

MDC (Mapped Diagnostic Context) is SLF4J's thread-local key-value store.  
Spring Boot ECS format automatically elevates MDC values to **top-level JSON fields**.

Use MDC for IDs that must appear in **every log line** across a task's lifetime.  
Use `addKeyValue()` for fields that are specific to a single log statement.

| Field | Scope | How |
|---|---|---|
| `iam_session_id` | every HTTP request | MDC (set by `MdcContextFilter`) |
| `console_session_id` | WebSocket console session lifecycle | MDC (set by `ConsoleWebSocketHandler`) |
| `task_id` | full provisioning task lifecycle | MDC |
| `cr_name` | full provisioning task lifecycle | MDC |
| `semaphore_task_id` | per-statement | `addKeyValue()` |
| `http_status`, `response_body` | per-statement | `addKeyValue()` |
| `status_prev`, `status_next` | per-statement | `addKeyValue()` |

#### session_id — HTTP Request Scope

`MdcContextFilter` (registered in `SecurityConfig`) sets `session_id` automatically for every request.  
No manual MDC work needed — the value propagates to all log calls within the request thread.

- **zitadel 모드**: JWT `jti` 클레임을 `iam_session_id`로 사용 (토큰이 살아 있는 동안 동일)
- **none 모드 / jti 없음**: UUID를 요청마다 생성

Scheduled tasks (`@Scheduled`) run outside HTTP threads so `iam_session_id` is not set — this is expected.

`console_session_id` (WebSocket 세션 UUID)은 `afterConnectionEstablished`에서 relay 스레드 MDC에 추가되며,
`tsh-stderr` 스레드로도 MDC 스냅샷이 전달된다.

**주의**: relay 스레드가 `closeQuietly`를 호출하면 `afterConnectionClosed`가 동일 스레드에서 동기적으로 실행된다.  
이 때 MDC에 이미 `console_session_id`가 있으므로, `afterConnectionClosed`나 그 호출 체인 안의 메소드  
(`BillingService.recordConsoleSessionEnded` 등)는 `addKeyValue("console_session_id", ...)` 를 사용하면 안 된다 —  
Spring Boot ECS 포맷이 MDC와 `addKeyValue` 중복을 `IllegalStateException`으로 처리하기 때문이다.

```java
// ConsoleWebSocketHandler — relay 스레드 MDC 전파 패턴
Map<String, String> mdc = MDC.getCopyOfContextMap();
relayExecutor.submit(() -> {
    if (mdc != null) MDC.setContextMap(mdc);
    MDC.put("console_session_id", consoleSessionId);
    try {
        // ...
    } finally {
        MDC.clear();
    }
});
```

#### MDC Pattern

Set MDC at the entry point of each task scope. Always clean up in `finally`:

```java
MDC.put("cr_name", crName);
try {
    // ... logic ...
    MDC.put("task_id", saved.getProvisionTaskId()); // set once ID is known
    log.atInfo()
            .addKeyValue("user_id", userId)
            .log("Provision 저장");
    // cr_name and task_id come from MDC automatically
} finally {
    MDC.remove("task_id");
    MDC.remove("cr_name");
}
```

For loop-scoped MDC (e.g. `syncStatus` scheduler):

```java
for (Provision provision : active) {
    MDC.put("task_id", provision.getProvisionTaskId());
    MDC.put("cr_name", provision.getCrName());
    try {
        // all log calls inside this block — including downstream methods —
        // automatically include task_id and cr_name
    } catch (Exception e) {
        log.atWarn().addKeyValue("error", e.getMessage()).log("상태 동기화 실패, 무시");
    } finally {
        MDC.remove("task_id");
        MDC.remove("cr_name");
    }
}
```

Methods called within an MDC scope (e.g. `onApplied()`, `handleDestroyed()`,  
`SemaphoreHttpClient` calls) do **not** need to set MDC themselves — they inherit it.  
Document this with a Javadoc note on those methods:

```java
/**
 * ...
 * MDC context (task_id, cr_name) must be set by the caller.
 */
private void onApplied(Provision provision) { ... }
```

### Field Naming Convention

All key names use **snake_case**:

- `session_id`
- `task_id`, `cr_name`
- `semaphore_task_id`, `semaphore_ssh_key_id`, `semaphore_inventory_id`
- `semaphore_env_id`, `semaphore_template_id`
- `http_status`, `response_body`
- `env_source` (values: `"static"` / `"dynamic"`)
- `status_prev`, `status_next`
- `user_id`, `vm_id`, `proxmox_node`, `vm_hostname`

### Do Not Use

- `[ClassName]` or `[Module]` bracket prefixes in message strings
- `log.info("field={}", value)` positional-arg style
- Redundant `addKeyValue("task_id", ...)` inside methods already covered by MDC

### Temporal Migration Note

MDC has no architectural coupling to the current `task_id` source (a self-generated UUID).  
When Temporal is introduced, only the **source** of `task_id` changes:

```java
// now
MDC.put("task_id", UUID.randomUUID().toString());

// after Temporal
MDC.put("task_id", workflowCtx.getInfo().getWorkflowId());
```

Log structure, field names, and all downstream code remain unchanged.
