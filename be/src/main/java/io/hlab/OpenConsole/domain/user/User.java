package io.hlab.OpenConsole.domain.user;

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

    @Column(nullable = false)
    private String subject; // IAM에서 넘겨준 고유 식별자 (sub)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IamProvider provider;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false, length = 50)
    private String name;

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

    public static User create(String email, String name, IamProvider provider, String subject) {
        return User.builder()
                .email(email)
                .name(name)
                .provider(provider)
                .subject(subject)
                .build();
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public void setProvider(IamProvider provider) {
        this.provider = provider;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void updateName(String name) {
        this.name = name;
    }
}

