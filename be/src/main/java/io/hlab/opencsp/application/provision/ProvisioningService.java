package io.hlab.opencsp.application.provision;

import com.jcraft.jsch.JSch;
import com.jcraft.jsch.KeyPair;
import io.hlab.opencsp.domain.provision.Provision;
import io.hlab.opencsp.domain.provision.ProvisionHistory;
import io.hlab.opencsp.domain.provision.ProvisionHistoryRepository;
import io.hlab.opencsp.domain.provision.ProvisionOutput;
import io.hlab.opencsp.domain.provision.ProvisionOutputRepository;
import io.hlab.opencsp.domain.provision.ProvisionRepository;
import io.hlab.opencsp.domain.provision.ProvisionStatus;
import io.hlab.opencsp.domain.provision.SemaphoreStatus;
import io.hlab.opencsp.application.billing.BillingService;
import io.hlab.opencsp.infrastructure.k8s.ProvisionRequest;
import io.hlab.opencsp.infrastructure.k8s.ProvisioningClient;
import io.hlab.opencsp.infrastructure.semaphore.SemaphoreClient;
import java.io.ByteArrayOutputStream;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProvisioningService {

    public record SyncResult(int total, int created, int skipped) {}

    private final ProvisioningClient provisioningClient;
    private final ProvisionRepository provisionRepository;
    private final ProvisionOutputRepository provisionOutputRepository;
    private final ProvisionHistoryRepository provisionHistoryRepository;
    private final SemaphoreClient semaphoreClient;
    private final BillingService billingService;

    private static final Map<String, String> DEFAULT_MODULE_PATHS = Map.of(
            "proxmox-vm",      "./bootstrap/terraform/provisions/proxmox-vm",
            "proxmox-network", "./bootstrap/terraform/provisions/proxmox-network",
            "proxmox-storage", "./bootstrap/terraform/provisions/proxmox-storage"
    );

    @Value("${app.k8s.flux.namespace:flux-system}")
    private String fluxNamespace;

    @Value("#{${app.k8s.flux.module-paths:{}}}")
    private Map<String, String> customModulePaths;

    /** DESTROYING 상태가 이 시간(분) 이상 지속되면 finalizer를 강제 제거한다. */
    @Value("${app.provision.destroy-timeout-minutes:10}")
    private long destroyTimeoutMinutes;

    /** 이 값 미만의 VM ID는 할당하지 않는다 (시스템/수동 예약 범위). */
    @Value("${app.provision.vm-id-min:100000000}")
    private long vmIdMin;

    @Transactional
    public String provision(String userId, String moduleType, String gitRepositoryName,
                            String requestedCrName, Map<String, Object> vars) {
        String modulePath = resolveModulePath(moduleType);
        String crName = (requestedCrName != null && !requestedCrName.isBlank())
                ? sanitizeCrName(requestedCrName)
                : buildCrName(moduleType, userId);

        MDC.put("cr_name", crName);
        try {
            // 빈 문자열 var는 Terraform에서 null 체크를 우회할 수 있으므로 제거
            Map<String, Object> sanitizedVars = new HashMap<>(vars.entrySet().stream()
                    .filter(e -> e.getValue() != null && !e.getValue().toString().isBlank())
                    .collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue)));

            // opencsp_ansible_public_key 미제공 시 BE에서 RSA 키 쌍 생성 — private key는 ProvisionOutput에 저장
            // vm_ssh_public_key는 terraform-secrets(Flux 관리)에서 오는 runner 키이므로 건드리지 않음
            String generatedPrivateKey = null;
            if (!sanitizedVars.containsKey("opencsp_ansible_public_key")) {
                try {
                    SshKeyPair pair = generateSshKeyPair(crName);
                    sanitizedVars.put("opencsp_ansible_public_key", pair.publicKey());
                    generatedPrivateKey = pair.privateKey();
                    log.atInfo().log("Ansible SSH 키 쌍 생성");
                } catch (Exception e) {
                    log.atWarn().addKeyValue("error", e.getMessage()).setCause(e).log("Ansible SSH 키 쌍 생성 실패, 키 없이 진행");
                }
            }

            ProvisionRequest request = ProvisionRequest.builder()
                    .moduleType(moduleType)
                    .modulePath(modulePath)
                    .gitRepositoryName(gitRepositoryName)
                    .userId(userId)
                    .crName(crName)
                    .vars(sanitizedVars)
                    .build();

            provisioningClient.provision(request);

            // DB에 provision 레코드 저장 (vm_id, proxmox_node, vm_name은 vars에서 추출)
            Long vmId = Optional.ofNullable(sanitizedVars.get("vm_id"))
                    .map(v -> Long.parseLong(v.toString()))
                    .orElse(null);
            String proxmoxNode = Optional.ofNullable(sanitizedVars.get("proxmox_node"))
                    .map(Object::toString)
                    .orElse(null);
            String vmHostname = Optional.ofNullable(sanitizedVars.get("vm_name"))
                    .map(Object::toString)
                    .orElse(null);
            Provision saved = provisionRepository.save(Provision.create(crName, moduleType, fluxNamespace, gitRepositoryName, userId, vmId, proxmoxNode, vmHostname));
            provisionHistoryRepository.save(ProvisionHistory.created(saved));

            MDC.put("task_id", saved.getProvisionTaskId());
            log.atInfo()
                    .addKeyValue("user_id", userId)
                    .addKeyValue("vm_id", vmId)
                    .addKeyValue("proxmox_node", proxmoxNode)
                    .addKeyValue("vm_hostname", vmHostname)
                    .log("Provision 저장");

            // 생성한 private key를 ProvisionOutput에 sensitive로 저장
            if (generatedPrivateKey != null) {
                provisionOutputRepository.save(
                        ProvisionOutput.of(crName, "vm_ssh_private_key", generatedPrivateKey, "string", true));
            }

            billingService.recordVmProvisioned(userId, crName, moduleType);

            return crName;
        } finally {
            MDC.remove("task_id");
            MDC.remove("cr_name");
        }
    }

    @Transactional
    public void destroy(String crName) {
        MDC.put("cr_name", crName);
        try {
            try {
                provisioningClient.destroy(crName);
            } catch (Exception e) {
                // CR이 k8s에 존재하지 않는 경우 (provision 실패로 미생성 등) — DB만 정리
                log.atWarn()
                        .addKeyValue("error", e.getMessage())
                        .log("CR 삭제 실패, k8s에 없을 수 있음");
                Optional<Provision> opt = provisionRepository.findByCrName(crName);
                if (opt.isPresent()) {
                    MDC.put("task_id", opt.get().getProvisionTaskId());
                    handleDestroyed(opt.get(), e.getMessage());
                }
                return;
            }
            Optional<Provision> opt = provisionRepository.findByCrName(crName);
            if (opt.isPresent()) {
                Provision p = opt.get();
                MDC.put("task_id", p.getProvisionTaskId());
                ProvisionStatus prev = p.getStatus();
                p.updateStatus(ProvisionStatus.DESTROYING);
                provisionRepository.save(p);
                provisionHistoryRepository.save(ProvisionHistory.statusChanged(p, prev, ProvisionStatus.DESTROYING));
            }
        } finally {
            MDC.remove("task_id");
            MDC.remove("cr_name");
        }
    }

    public Map<String, Object> getStatus(String crName) {
        return provisioningClient.getStatus(crName);
    }

    /**
     * 다음 사용 가능한 VM ID를 반환한다.
     * vmIdMin 미만은 시스템 예약 범위로 할당하지 않는다.
     */
    public long nextVmId() {
        long maxUsed = provisionRepository.findMaxVmId().orElse(vmIdMin - 1);
        return Math.max(maxUsed + 1, vmIdMin);
    }

    /**
     * 특정 유저의 DB 레코드 목록 + k8s 실시간 상태를 합쳐서 반환한다.
     */
    public List<ProvisionSummary> listByUserId(String userId) {
        List<Provision> records = provisionRepository.findByUserId(userId);
        if (records.isEmpty()) return List.of();

        Map<String, Map<String, Object>> liveStatuses;
        try {
            liveStatuses = provisioningClient.listAllStatus(fluxNamespace);
        } catch (Exception e) {
            log.atWarn().addKeyValue("error", e.getMessage()).log("k8s 상태 조회 실패, DB 상태만 반환");
            liveStatuses = Map.of();
        }

        Map<String, Map<String, Object>> finalLiveStatuses = liveStatuses;
        return records.stream()
                .map(p -> ProvisionSummary.of(p, finalLiveStatuses.get(p.getCrName())))
                .toList();
    }

    /**
     * DB 레코드 목록 + k8s 실시간 상태를 합쳐서 반환한다. (전체, admin 전용)
     */
    public List<ProvisionSummary> listAll() {
        List<Provision> records = provisionRepository.findAll();
        if (records.isEmpty()) return List.of();

        // k8s에서 전체 상태 일괄 조회 (N+1 방지)
        Map<String, Map<String, Object>> liveStatuses;
        try {
            liveStatuses = provisioningClient.listAllStatus(fluxNamespace);
        } catch (Exception e) {
            log.atWarn().addKeyValue("error", e.getMessage()).log("k8s 상태 조회 실패, DB 상태만 반환");
            liveStatuses = Map.of();
        }

        Map<String, Map<String, Object>> finalLiveStatuses = liveStatuses;
        return records.stream()
                .map(p -> ProvisionSummary.of(p, finalLiveStatuses.get(p.getCrName())))
                .toList();
    }

    /**
     * k8s 클러스터의 Terraform CR을 DB에 재구성한다.
     * DB가 유실된 경우 클러스터 실제 상태를 기준으로 레코드를 복원한다.
     * <p>
     * - k8s에는 있지만 DB에 없는 CR → 임포트 (라벨에서 userId/moduleType 추출)
     * - 이미 DB에 있는 CR → 스킵 (상태 동기화는 기존 syncStatus에서 처리)
     *
     * @return SyncResult(total=k8s CR 수, created=임포트된 수, updated=이미 존재하여 스킵된 수)
     */
    @Transactional
    public SyncResult syncFromCluster() {
        List<ProvisioningClient.CrMeta> crMetas;
        try {
            crMetas = provisioningClient.listAllCrMeta(fluxNamespace);
        } catch (Exception e) {
            log.atError().addKeyValue("error", e.getMessage()).setCause(e).log("ClusterSync k8s CR 목록 조회 실패");
            throw new RuntimeException("클러스터 CR 조회 실패: " + e.getMessage(), e);
        }

        Set<String> existingCrNames = provisionRepository.findAll().stream()
                .map(Provision::getCrName)
                .collect(Collectors.toSet());

        int created = 0;
        int skipped = 0;

        for (ProvisioningClient.CrMeta cr : crMetas) {
            if (existingCrNames.contains(cr.crName())) {
                skipped++;
                continue;
            }
            MDC.put("cr_name", cr.crName());
            try {
                ProvisionStatus initialStatus = resolveStatus(cr.statusMap());
                Provision newProvision = Provision.create(
                                cr.crName(), cr.moduleType(), fluxNamespace,
                                cr.gitRepositoryName(), cr.userId(),
                                null, null, null
                        );
                newProvision.updateStatus(initialStatus);
                provisionRepository.save(newProvision);
                log.atInfo()
                        .addKeyValue("user_id", cr.userId())
                        .addKeyValue("module_type", cr.moduleType())
                        .addKeyValue("status", initialStatus)
                        .log("ClusterSync CR 임포트");

                // APPLIED 상태면 outputs 복원 및 Semaphore 재트리거 (DB 유실 복구)
                if (initialStatus == ProvisionStatus.APPLIED) {
                    MDC.put("task_id", newProvision.getProvisionTaskId());
                    try {
                        onApplied(newProvision);
                    } catch (Exception e) {
                        log.atWarn()
                                .addKeyValue("error", e.getMessage())
                                .log("ClusterSync APPLIED outputs 복원 실패, 무시");
                    } finally {
                        MDC.remove("task_id");
                    }
                }

                created++;
            } finally {
                MDC.remove("cr_name");
            }
        }

        log.atInfo()
                .addKeyValue("total", crMetas.size())
                .addKeyValue("imported", created)
                .addKeyValue("skipped", skipped)
                .log("ClusterSync 완료");
        return new SyncResult(crMetas.size(), created, skipped);
    }

    /**
     * 진행 중인 provision의 k8s 상태를 확인하여 DB 상태를 동기화한다.
     * ProvisionStatusSyncer(스케줄러)에서 주기적으로 호출한다.
     */
    @Transactional
    public void syncStatus() {

        List<Provision> active = new ArrayList<>();
        active.addAll(provisionRepository.findByStatus(ProvisionStatus.PENDING));
        active.addAll(provisionRepository.findByStatus(ProvisionStatus.APPLYING));
        active.addAll(provisionRepository.findByStatus(ProvisionStatus.APPLIED));
        active.addAll(provisionRepository.findByStatus(ProvisionStatus.FAILED));
        active.addAll(provisionRepository.findByStatus(ProvisionStatus.DESTROYING));
        if (active.isEmpty()) return;

        // k8s API 단 1회 호출로 전체 상태를 일괄 조회 (N+1 방지)
        Map<String, Map<String, Object>> liveStatuses;
        try {
            liveStatuses = provisioningClient.listAllStatus(fluxNamespace);
        } catch (Exception e) {
            log.atWarn().addKeyValue("error", e.getMessage()).log("k8s 일괄 상태 조회 실패, syncStatus 스킵");
            return;
        }

        for (Provision provision : active) {
            MDC.put("task_id", provision.getProvisionTaskId());
            MDC.put("cr_name", provision.getCrName());
            try {
                Map<String, Object> status = liveStatuses.get(provision.getCrName());

                ProvisionStatus next;
                if (provision.getStatus() == ProvisionStatus.DESTROYING) {
                    if (status == null) {
                        // CR이 k8s에서 사라짐 → destroy 완료
                        next = ProvisionStatus.DESTROYED;
                    } else {
                        // CR이 아직 존재 — stuck 여부 확인
                        Duration stuck = Duration.between(provision.getUpdatedAt(), LocalDateTime.now());
                        if (stuck.toMinutes() >= destroyTimeoutMinutes) {
                            log.atWarn()
                                    .addKeyValue("timeout_minutes", destroyTimeoutMinutes)
                                    .log("Destroy timeout 초과, finalizer 강제 제거");
                            provisioningClient.forceDelete(provision.getCrName());
                        }
                        next = ProvisionStatus.DESTROYING;
                    }
                } else {
                    next = resolveStatus(status);
                }

                if (next != provision.getStatus()) {
                    ProvisionStatus prev = provision.getStatus();
                    log.atInfo()
                            .addKeyValue("status_prev", prev)
                            .addKeyValue("status_next", next)
                            .log("Provision 상태 동기화");

                    if (next == ProvisionStatus.DESTROYED) {
                        handleDestroyed(provision, null);
                    } else {
                        provision.updateStatus(next);
                        provisionRepository.save(provision);
                        provisionHistoryRepository.save(ProvisionHistory.statusChanged(provision, prev, next));

                        if (next == ProvisionStatus.APPLIED) {
                            onApplied(provision);
                        }
                    }
                }
            } catch (Exception e) {
                log.atWarn()
                        .addKeyValue("error", e.getMessage())
                        .log("상태 동기화 실패, 무시");
            } finally {
                MDC.remove("task_id");
                MDC.remove("cr_name");
            }
        }

        // Semaphore RUNNING 상태인 provision의 task 완료 여부 폴링
        if (semaphoreClient.isConfigured()) {
            syncSemaphoreStatus();
        }
    }

    /**
     * semaphore_status = RUNNING 인 provision에 대해 Semaphore API를 폴링하여 완료 여부를 반영한다.
     * syncStatus()에서 호출된다.
     */
    private void syncSemaphoreStatus() {
        List<Provision> running = provisionRepository.findBySemaphoreStatus(SemaphoreStatus.RUNNING);
        for (Provision provision : running) {
            if (provision.getSemaphoreTaskId() == null) continue;
            MDC.put("task_id", provision.getProvisionTaskId());
            MDC.put("cr_name", provision.getCrName());
            try {
                SemaphoreClient.TaskResult result = semaphoreClient.getTaskResult(provision.getSemaphoreTaskId());
                SemaphoreStatus next = switch (result.status()) {
                    case "success" -> SemaphoreStatus.SUCCESS;
                    case "error", "failed" -> SemaphoreStatus.FAILED;
                    default -> SemaphoreStatus.RUNNING; // waiting, running
                };
                if (next != SemaphoreStatus.RUNNING) {
                    provision.updateSemaphoreStatus(next);
                    provisionRepository.save(provision);
                    log.atInfo()
                            .addKeyValue("semaphore_task_id", provision.getSemaphoreTaskId())
                            .addKeyValue("semaphore_status", next)
                            .log("Semaphore 완료");
                }
            } catch (Exception e) {
                log.atWarn()
                        .addKeyValue("semaphore_task_id", provision.getSemaphoreTaskId())
                        .addKeyValue("error", e.getMessage())
                        .log("Semaphore 상태 폴링 실패, 무시");
            } finally {
                MDC.remove("task_id");
                MDC.remove("cr_name");
            }
        }
    }

    /**
     * Terraform apply 완료 시 훅 — outputs를 DB에 저장하고 Semaphore post-provisioning을 트리거한다.
     * syncStatus() 루프 안에서 호출되므로 MDC(task_id, cr_name)는 호출자가 이미 설정한다.
     */
    @Transactional
    protected void onApplied(Provision provision) {
        String crName = provision.getCrName();

        // 이미 Semaphore 리소스가 생성된 경우 중복 트리거 방지
        if (provision.getSemaphoreTaskId() != null) {
            log.atInfo()
                    .addKeyValue("semaphore_task_id", provision.getSemaphoreTaskId())
                    .log("Semaphore 이미 실행됨, 스킵");
            return;
        }

        log.atInfo()
                .addKeyValue("module_type", provision.getModuleType())
                .log("Terraform apply 완료");

        // 1. tofu-controller CR에서 Terraform outputs 조회
        Map<String, ProvisioningClient.OutputEntry> outputs;
        try {
            outputs = provisioningClient.getOutputs(crName);
        } catch (Exception e) {
            log.atWarn()
                    .addKeyValue("error", e.getMessage())
                    .log("outputs 조회 실패, post-provisioning 스킵");
            return;
        }

        // 2. outputs → DB 저장 (기존 outputs 교체, provision()에서 저장한 sensitive 키는 보존)
        // delete 전에 먼저 읽어야 함
        String savedPrivateKey = provisionOutputRepository
                .findByCrNameAndOutputKey(crName, "vm_ssh_private_key")
                .map(o -> o.getOutputValue())
                .orElse(null);

        if (outputs.isEmpty()) {
            log.atWarn()
                    .log("Terraform outputs 없음, output 블록이 정의되어 있는지 확인하세요");
        } else {
            provisionOutputRepository.deleteByCrName(crName);
            List<ProvisionOutput> records = outputs.entrySet().stream()
                    .map(e -> ProvisionOutput.of(
                            crName,
                            e.getKey(),
                            e.getValue().value(),
                            e.getValue().type(),
                            e.getValue().sensitive()))
                    .collect(Collectors.toList());
            // provision()에서 저장한 private key 복원
            if (savedPrivateKey != null) {
                records.add(ProvisionOutput.of(crName, "vm_ssh_private_key", savedPrivateKey, "string", true));
            }
            provisionOutputRepository.saveAll(records);
            log.atInfo()
                    .addKeyValue("output_count", records.size())
                    .addKeyValue("output_keys", outputs.keySet())
                    .log("outputs 저장");
        }

        // 3. vm_hostname output이 있으면 Provision 엔티티에도 반영
        String vmHostnameFromOutput = outputs.containsKey("vm_hostname")
                ? outputs.get("vm_hostname").value()
                : outputs.containsKey("vm_name") ? outputs.get("vm_name").value() : null;
        if (vmHostnameFromOutput != null && !vmHostnameFromOutput.isBlank()) {
            provision.updateVmHostname(vmHostnameFromOutput);
            provisionRepository.save(provision);
        }

        // 4. Semaphore post-provisioning 트리거 (설정된 경우에만)
        if (!semaphoreClient.isConfigured()) {
            log.atInfo().log("Semaphore 미설정, post-provisioning 스킵");
            return;
        }
        Map<String, String> outputsAsStrings = new HashMap<>(outputs.entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().value() != null ? e.getValue().value() : "")));

        // provision() 시 생성한 private key 추가 (terraform sensitive output 제한 우회)
        if (savedPrivateKey != null) {
            outputsAsStrings.put("vm_ssh_private_key", savedPrivateKey);
        }

        try {
            SemaphoreClient.PostProvisionResult result = semaphoreClient.triggerPostProvisionJob(crName, outputsAsStrings);
            provision.assignSemaphoreIds(result.sshKeyId(), result.inventoryId(), result.templateId(), result.taskId(), result.environmentId());
            provisionRepository.save(provision);
            log.atInfo()
                    .addKeyValue("semaphore_task_id", result.taskId())
                    .addKeyValue("semaphore_ssh_key_id", result.sshKeyId())
                    .addKeyValue("semaphore_inventory_id", result.inventoryId())
                    .addKeyValue("semaphore_template_id", result.templateId())
                    .addKeyValue("semaphore_environment_id", result.environmentId())
                    .log("Semaphore Task 실행됨");
        } catch (Exception e) {
            log.atError()
                    .addKeyValue("error", e.getMessage())
                    .setCause(e)
                    .log("Semaphore 트리거 실패, 프로비저닝은 완료");
        }
    }

    // -------------------------------------------------------------------------
    // 내부 헬퍼
    // -------------------------------------------------------------------------

    /**
     * DESTROYED 상태 처리: Semaphore 리소스 정리 → 히스토리 저장 → DB에서 삭제.
     * syncStatus() 루프 또는 destroy()에서 호출되므로 MDC(task_id, cr_name)는 호출자가 설정한다.
     *
     * @param detail 오류 메시지 등 부가 정보 (없으면 null)
     */
    @Transactional
    protected void handleDestroyed(Provision provision, String detail) {
        // Semaphore 리소스 정리 (생성했던 template + inventory 삭제)
        if (semaphoreClient.isConfigured()
                && provision.getSemaphoreTemplateId() != null
                && provision.getSemaphoreInventoryId() != null) {
            try {
                int sshKeyId = provision.getSemaphoreSshKeyId() != null ? provision.getSemaphoreSshKeyId() : -1;
                int environmentId = provision.getSemaphoreEnvironmentId() != null ? provision.getSemaphoreEnvironmentId() : -1;
                semaphoreClient.cleanupPostProvision(sshKeyId, provision.getSemaphoreTemplateId(), provision.getSemaphoreInventoryId(), environmentId);
                log.atInfo()
                        .addKeyValue("semaphore_ssh_key_id", sshKeyId)
                        .addKeyValue("semaphore_template_id", provision.getSemaphoreTemplateId())
                        .addKeyValue("semaphore_inventory_id", provision.getSemaphoreInventoryId())
                        .log("Semaphore 리소스 정리 완료");
            } catch (Exception e) {
                log.atWarn()
                        .addKeyValue("error", e.getMessage())
                        .log("Semaphore 리소스 정리 실패, 무시");
            }
        }

        // tfstate Secret 삭제
        try {
            provisioningClient.deleteTfStateSecret(provision.getCrName());
        } catch (Exception e) {
            log.atWarn()
                    .addKeyValue("error", e.getMessage())
                    .log("tfstate Secret 삭제 실패, 무시");
        }

        ProvisionStatus prev = provision.getStatus();
        provisionHistoryRepository.save(ProvisionHistory.statusChanged(provision, prev, ProvisionStatus.DESTROYED, detail));
        provisionOutputRepository.deleteByCrName(provision.getCrName());
        provisionRepository.deleteByCrName(provision.getCrName());
        log.atInfo()
                .addKeyValue("status_prev", prev)
                .log("Provision 삭제 완료 (DESTROYED)");

        try {
            billingService.recordVmDestroyed(provision);
        } catch (Exception e) {
            log.atWarn().setCause(e).log("VM 파기 과금 기록 실패 (무시)");
        }
    }

    /**
     * tofu-controller status 필드에서 BE ProvisionStatus로 매핑한다.
     * conditions[].type=Ready, status=True 이면 APPLIED로 간주한다.
     */
    @SuppressWarnings("unchecked")
    private ProvisionStatus resolveStatus(Map<String, Object> k8sStatus) {
        if (k8sStatus == null || k8sStatus.isEmpty()) return ProvisionStatus.PENDING;

        Object conditions = k8sStatus.get("conditions");
        if (conditions instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> cond) {
                    String type = (String) cond.get("type");
                    String status = (String) cond.get("status");
                    String reason = (String) cond.get("reason");
                    if ("Ready".equals(type)) {
                        if ("True".equals(status)) return ProvisionStatus.APPLIED;
                        if ("False".equals(status)) {
                            if ("TerraformPlannedWithChanges".equals(reason) ||
                                "TerraformApplying".equals(reason)) return ProvisionStatus.APPLYING;
                            return ProvisionStatus.FAILED;
                        }
                    }
                }
            }
        }
        return ProvisionStatus.APPLYING;
    }

    private String resolveModulePath(String moduleType) {
        if (customModulePaths != null && customModulePaths.containsKey(moduleType)) {
            return customModulePaths.get(moduleType);
        }
        String path = DEFAULT_MODULE_PATHS.get(moduleType);
        if (path == null) {
            throw new IllegalArgumentException("Unknown moduleType: " + moduleType +
                    ". Supported: " + DEFAULT_MODULE_PATHS.keySet());
        }
        return path;
    }

    private String buildCrName(String moduleType, String userId) {
        String safeUserId = userId.replaceAll("[^a-z0-9]", "-").toLowerCase();
        long epoch = Instant.now().getEpochSecond();
        return moduleType + "-" + safeUserId + "-" + epoch;
    }

    private String sanitizeCrName(String name) {
        return name.toLowerCase().replaceAll("[^a-z0-9-]", "-").replaceAll("-+", "-").replaceAll("^-|-$", "");
    }

    private record SshKeyPair(String publicKey, String privateKey) {}

    private SshKeyPair generateSshKeyPair(String comment) throws Exception {
        JSch jsch = new JSch();
        KeyPair kpair = KeyPair.genKeyPair(jsch, KeyPair.RSA, 4096);

        ByteArrayOutputStream pubOut = new ByteArrayOutputStream();
        kpair.writePublicKey(pubOut, "opencsp-" + comment);

        ByteArrayOutputStream privOut = new ByteArrayOutputStream();
        kpair.writePrivateKey(privOut);

        kpair.dispose();
        return new SshKeyPair(pubOut.toString().trim(), privOut.toString().trim());
    }
}
