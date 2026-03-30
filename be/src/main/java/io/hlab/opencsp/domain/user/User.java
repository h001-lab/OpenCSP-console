package io.hlab.opencsp.domain.user;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 테넌트 ID (Zitadel 조직 ID 등). null = 시스템 계정 */
    @Column(name = "tenant_id", length = 255)
    private String tenantId;

    /** Zitadel user ID (sub). null = 로컬 생성 사용자 */
    @Column(name = "iam_subject", unique = true, length = 255)
    private String iamSubject;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false, length = 100)
    private String name;

    /** 쉼표 구분 역할 목록. 예: "admin,userA" */
    @Column(name = "roles", length = 500)
    private String roles;

    /** IAM 상태. 예: ACTIVE, INACTIVE, LOCKED */
    @Column(name = "iam_status", length = 50)
    private String iamStatus;

    /** 마지막 IAM 동기화 시각 */
    @Column(name = "synced_at")
    private LocalDateTime syncedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * 사용자 생성
     * IAM 정보(subject, provider)는 저장하지 않음 (IAM이 SSOT)
     * 
     * @param email 이메일
     * @param name 이름
     * @return User 엔티티
     */
    public static User create(String email, String name) {
        return User.builder()
                .email(email)
                .name(name)
                .build();
    }

    public static User fromIam(String iamSubject, String email, String name, String roles, String iamStatus) {
        return User.builder()
                .iamSubject(iamSubject)
                .email(email)
                .name(name)
                .roles(roles)
                .iamStatus(iamStatus)
                .syncedAt(java.time.LocalDateTime.now())
                .build();
    }

    public void syncFromIam(String email, String name, String roles, String iamStatus) {
        this.email = email;
        this.name = name;
        this.roles = roles;
        this.iamStatus = iamStatus;
        this.syncedAt = java.time.LocalDateTime.now();
        this.updatedAt = java.time.LocalDateTime.now();
    }

    public void updateName(String name) {
        this.name = name;
    }

    public void assignTenant(String tenantId) {
        this.tenantId = tenantId;
    }
}

