package io.hlab.opencsp.domain.config;

/**
 * 설정 카테고리.
 * <p>
 * - IAM       : 인증/인가 공급자 설정 (Zitadel, Teleport 등)
 * - K8S       : Kubernetes / FluxCD / tofu-controller 설정
 * - AI        : AI 모델 연동 설정 (OpenAI 호환, Vertex AI 등)
 * - SEMAPHORE : Ansible Semaphore 연동 설정 (post-provisioning 자동화)
 * - PROVISION : 프로비저닝 동작 설정 (이력 보관 기간 등)
 * - GENERAL   : 앱 전반 설정 (배너, 공지 등)
 */
public enum ConfigCategory {
    IAM,
    K8S,
    AI,
    SEMAPHORE,
    PROVISION,
    GENERAL
}
