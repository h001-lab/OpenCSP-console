package io.hlab.opencsp.infrastructure.persistence.user;

import io.hlab.opencsp.domain.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SpringDataUserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByIamSubject(String iamSubject);
    boolean existsByEmail(String email);
}

