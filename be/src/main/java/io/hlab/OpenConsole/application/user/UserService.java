package io.hlab.OpenConsole.application.user;

import io.hlab.OpenConsole.common.exception.ErrorCode;
import io.hlab.OpenConsole.domain.user.User;
import io.hlab.OpenConsole.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class UserService {
    private final UserRepository userRepository;

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

