package io.hlab.OpenConsole.application.user;

import io.hlab.OpenConsole.common.exception.ErrorCode;
import io.hlab.OpenConsole.domain.user.User;
import io.hlab.OpenConsole.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class UserService {
    private final UserRepository userRepository;

    /**
     * 사용자 생성
     * 
     * @param email 이메일
     * @param name 이름
     * @return 생성된 사용자 ID
     */
    public Long createUser(String email, String name) {
        if (userRepository.existsByEmail(email)) {
            throw ErrorCode.USER_ALREADY_EXISTS.toException();
        }

        User user = User.create(email, name);
        User savedUser = userRepository.save(user);
        log.info("User created: id={}, email={}", savedUser.getId(), savedUser.getEmail());
        return savedUser.getId();
    }

    @Transactional(readOnly = true)
    public User getUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> ErrorCode.USER_NOT_FOUND.toException());
    }

    @Transactional(readOnly = true)
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> ErrorCode.USER_NOT_FOUND.toException());
    }

    @Transactional(readOnly = true)
    public Optional<User> findUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    @Transactional(readOnly = true)
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    /**
     * 사용자 생성 (엔티티 직접 저장)
     * 
     * @param user User 엔티티
     * @return 저장된 User 엔티티
     */
    public User createUser(User user) {
        User savedUser = userRepository.save(user);
        log.info("User created: id={}, email={}", savedUser.getId(), savedUser.getEmail());
        return savedUser;
    }

    public void updateUser(Long id, String name) {
        User user = getUser(id);
        user.updateName(name);
        log.info("User updated: id={}, name={}", id, name);
    }

    public void deleteUser(Long id) {
        if (!userRepository.findById(id).isPresent()) {
            throw ErrorCode.USER_NOT_FOUND.toException();
        }
        userRepository.deleteById(id);
        log.info("User deleted: id={}", id);
    }
}

