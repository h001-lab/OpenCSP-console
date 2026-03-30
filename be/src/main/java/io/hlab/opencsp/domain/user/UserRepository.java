package io.hlab.opencsp.domain.user;

import java.util.List;
import java.util.Optional;

public interface UserRepository {
    User save(User user);

    Optional<User> findById(Long id);

    Optional<User> findByEmail(String email);

    Optional<User> findByIamSubject(String iamSubject);

    List<User> findAll();

    boolean existsById(Long id);

    boolean existsByEmail(String email);

    void deleteById(Long id);
}

