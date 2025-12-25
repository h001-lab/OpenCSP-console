package io.hlab.OpenConsole.domain.user;

import java.util.Optional;

public interface UserRepository {
    User save(User user);

    Optional<User> findById(Long id);

    Optional<User> findByEmail(String email);

    Optional<User> findByProviderAndSubject(IamProvider provider, String subject);

    boolean existsByEmail(String email);

    void deleteById(Long id);
}

