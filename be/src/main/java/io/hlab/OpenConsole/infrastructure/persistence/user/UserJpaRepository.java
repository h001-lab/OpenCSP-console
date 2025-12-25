package io.hlab.OpenConsole.infrastructure.persistence.user;

import io.hlab.OpenConsole.domain.user.IamProvider;
import io.hlab.OpenConsole.domain.user.User;
import io.hlab.OpenConsole.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class UserJpaRepository implements UserRepository {
    private final SpringDataUserRepository springDataUserRepository;

    @Override
    public User save(User user) {
        return springDataUserRepository.save(user);
    }

    @Override
    public Optional<User> findById(Long id) {
        return springDataUserRepository.findById(id);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return springDataUserRepository.findByEmail(email);
    }

    @Override
    public Optional<User> findByProviderAndSubject(IamProvider provider, String subject) {
        return springDataUserRepository.findByProviderAndSubject(provider, subject);
    }

    @Override
    public boolean existsByEmail(String email) {
        return springDataUserRepository.existsByEmail(email);
    }

    @Override
    public void deleteById(Long id) {
        springDataUserRepository.deleteById(id);
    }
}

