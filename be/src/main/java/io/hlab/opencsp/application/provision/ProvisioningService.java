package io.hlab.opencsp.application.provision;

import io.hlab.opencsp.domain.provision.Provision;
import io.hlab.opencsp.domain.provision.ProvisionHistory;
import io.hlab.opencsp.domain.provision.ProvisionHistoryRepository;
import io.hlab.opencsp.domain.provision.ProvisionOutput;
import io.hlab.opencsp.domain.provision.ProvisionOutputRepository;
import io.hlab.opencsp.domain.provision.ProvisionRepository;
import io.hlab.opencsp.domain.provision.ProvisionStatus;
import io.hlab.opencsp.infrastructure.k8s.ProvisionRequest;
import io.hlab.opencsp.infrastructure.k8s.ProvisioningClient;
import io.hlab.opencsp.infrastructure.semaphore.SemaphoreClient;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

        // 빈 문자열 var는 Terraform에서 null 체크를 우회할 수 있으므로 제거
        Map<String, Object> sanitizedVars = vars.entrySet().stream()
                .filter(e -> e.getValue() != null && !e.getValue().toString().isBlank())
                .collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

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
        log.info("Provision 저장: crName={}, userId={}, vmId={}, proxmoxNode={}, vmHostname={}",
                crName, userId, vmId, proxmoxNode, vmHostname);
        Provision saved = provisionRepository.save(Provision.create(crName, moduleType, fluxNamespace, gitRepositoryName, userId, vmId, proxmoxNode, vmHostname));
        provisionHistoryRepository.save(ProvisionHistory.created(saved));

        return crName;
    }

    @Transactional
    public void destroy(String crName) {
        try {
            provisioningClient.destroy(crName);
        } catch (Exception e) {
            // CR이 k8s에 존재하지 않는 경우 (provision 실패로 미생성 등) — DB만 정리
            log.warn("CR 삭제 실패 (k8s에 없을 수 있음): crName={}, error={}", crName, e.getMessage());
            provisionRepository.findByCrName(crName).ifPresent(p -> handleDestroyed(p, e.getMessage()));
            return;
        }
        provisionRepository.findByCrName(crName).ifPresent(p -> {
            ProvisionStatus prev = p.getStatus();
            p.updateStatus(ProvisionStatus.DESTROYING);
            provisionRepository.save(p);
            provisionHistoryRepository.save(ProvisionHistory.statusChanged(p, prev, ProvisionStatus.DESTROYING));
        });
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
            log.warn("k8s 상태 조회 실패, DB 상태만 반환: {}", e.getMessage());
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
            log.warn("k8s 상태 조회 실패, DB 상태만 반환: {}", e.getMessage());
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
            log.error("[ClusterSync] k8s CR 목록 조회 실패: {}", e.getMessage(), e);
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
            ProvisionStatus initialStatus = resolveStatus(cr.statusMap());
            Provision newProvision = Provision.create(
                            cr.crName(), cr.moduleType(), fluxNamespace,
                            cr.gitRepositoryName(), cr.userId(),
                            null, null, null
                    );
            newProvision.updateStatus(initialStatus);
            provisionRepository.save(newProvision);
            log.info("[ClusterSync] CR 임포트: crName={}, userId={}, moduleType={}, status={}",
                    cr.crName(), cr.userId(), cr.moduleType(), initialStatus);
            created++;
        }

        log.info("[ClusterSync] 완료: total={}, imported={}, skipped={}", crMetas.size(), created, skipped);
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
            log.warn("k8s 일괄 상태 조회 실패, syncStatus 스킵: {}", e.getMessage());
            return;
        }

        for (Provision provision : active) {
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
                            log.warn("Destroy timeout({}m) 초과, finalizer 강제 제거: crName={}", destroyTimeoutMinutes, provision.getCrName());
                            provisioningClient.forceDelete(provision.getCrName());
                        }
                        next = ProvisionStatus.DESTROYING;
                    }
                } else {
                    next = resolveStatus(status);
                }

                if (next != provision.getStatus()) {
                    ProvisionStatus prev = provision.getStatus();
                    log.info("Provision 상태 동기화: crName={}, {} → {}", provision.getCrName(), prev, next);

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
                log.warn("상태 동기화 실패 (무시): crName={}, error={}", provision.getCrName(), e.getMessage());
            }
        }
    }

    /**
     * Terraform apply 완료 시 훅 — outputs를 DB에 저장하고 Semaphore post-provisioning을 트리거한다.
     */
    @Transactional
    protected void onApplied(Provision provision) {
        String crName = provision.getCrName();
        log.info("Terraform apply 완료: crName={}, moduleType={}", crName, provision.getModuleType());

        // 1. tofu-controller CR에서 Terraform outputs 조회
        Map<String, ProvisioningClient.OutputEntry> outputs;
        try {
            outputs = provisioningClient.getOutputs(crName);
        } catch (Exception e) {
            log.warn("[onApplied] outputs 조회 실패, post-provisioning 스킵: crName={}, error={}", crName, e.getMessage());
            return;
        }

        // 2. outputs → DB 저장 (기존 outputs 교체)
        if (outputs.isEmpty()) {
            log.warn("[onApplied] Terraform outputs 없음 — Terraform 모듈에 output 블록이 정의되어 있는지 확인하세요: crName={}", crName);
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
            provisionOutputRepository.saveAll(records);
            log.info("[onApplied] outputs {}개 저장: crName={}, keys={}", records.size(), crName, outputs.keySet());
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
            log.info("[onApplied] Semaphore 미설정 — post-provisioning 스킵: crName={}", crName);
            return;
        }
        Map<String, String> outputsAsStrings = outputs.entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().value() != null ? e.getValue().value() : ""));
        try {
            int taskId = semaphoreClient.triggerPostProvisionJob(crName, outputsAsStrings);
            log.info("[onApplied] Semaphore Task 실행됨: crName={}, taskId={}", crName, taskId);
        } catch (Exception e) {
            log.error("[onApplied] Semaphore 트리거 실패 (프로비저닝은 완료): crName={}, error={}", crName, e.getMessage(), e);
        }
    }

    // -------------------------------------------------------------------------
    // 내부 헬퍼
    // -------------------------------------------------------------------------

    /**
     * DESTROYED 상태 처리: 히스토리 저장 후 provisions + outputs 테이블에서 삭제.
     * @param detail 오류 메시지 등 부가 정보 (없으면 null)
     */
    @Transactional
    protected void handleDestroyed(Provision provision, String detail) {
        ProvisionStatus prev = provision.getStatus();
        provisionHistoryRepository.save(ProvisionHistory.statusChanged(provision, prev, ProvisionStatus.DESTROYED, detail));
        provisionOutputRepository.deleteByCrName(provision.getCrName());
        provisionRepository.deleteByCrName(provision.getCrName());
        log.info("Provision 삭제 완료 (DESTROYED): crName={}, prevStatus={}", provision.getCrName(), prev);
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
}
