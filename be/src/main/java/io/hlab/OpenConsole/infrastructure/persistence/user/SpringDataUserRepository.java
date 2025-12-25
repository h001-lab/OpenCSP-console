package io.hlab.OpenConsole.infrastructure.persistence.user;

import io.hlab.OpenConsole.domain.user.IamProvider;
import io.hlab.OpenConsole.domain.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SpringDataUserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    Optional<User> findByProviderAndSubject(IamProvider provider, String subject);
    
    boolean existsByEmail(String email);
}

