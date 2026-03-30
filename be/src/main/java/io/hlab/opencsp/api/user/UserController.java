package io.hlab.opencsp.api.user;

import io.hlab.opencsp.api.user.dto.UserCreateRequest;
import io.hlab.opencsp.api.user.dto.UserResponse;
import io.hlab.opencsp.api.user.dto.UserUpdateRequest;
import io.hlab.opencsp.application.user.UserService;
import io.hlab.opencsp.common.dto.ApiResponse;
import io.hlab.opencsp.common.web.RequestUtils;
import io.hlab.opencsp.domain.user.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    @GetMapping("/me")
    public ApiResponse<UserResponse> getMyInfo(Authentication authentication, HttpServletRequest httpRequest) {
        if (!(authentication instanceof JwtAuthenticationToken jwtAuth)) {
            return ApiResponse.error("UNAUTHORIZED", "로그인되지 않았습니다.");
        }

        Jwt jwt = (Jwt) jwtAuth.getPrincipal();
        String email = jwt.getClaimAsString("email");
        if (email == null) {
            return ApiResponse.error("UNAUTHORIZED", "이메일 정보를 가져올 수 없습니다.");
        }

        Optional<User> user = userService.findUserByEmail(email);
        if (user.isEmpty()) {
            return ApiResponse.error("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.");
        }

        return ApiResponse.success("사용자 정보를 조회했습니다.",
                UserResponse.from(user.get(), RequestUtils.getBaseUrl(httpRequest), RequestUtils.getResourcePath(httpRequest)));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<UserResponse> createUser(
            @RequestBody @Valid UserCreateRequest request,
            HttpServletRequest httpRequest) {
        User user = userService.createUser(request.getEmail(), request.getName());
        return ApiResponse.success("사용자가 생성되었습니다.",
                UserResponse.from(user, RequestUtils.getBaseUrl(httpRequest), RequestUtils.getResourcePath(httpRequest)));
    }

    @GetMapping("/{id}")
    public ApiResponse<UserResponse> getUser(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {
        User user = userService.getUser(id);
        return ApiResponse.success(UserResponse.from(user, RequestUtils.getBaseUrl(httpRequest), RequestUtils.getResourcePath(httpRequest)));
    }

    @PutMapping("/{id}")
    public ApiResponse<UserResponse> updateUser(
            @PathVariable Long id,
            @RequestBody @Valid UserUpdateRequest request,
            HttpServletRequest httpRequest) {
        userService.updateUser(id, request.getName());
        User user = userService.getUser(id);
        return ApiResponse.success("사용자 정보가 수정되었습니다.",
                UserResponse.from(user, RequestUtils.getBaseUrl(httpRequest), RequestUtils.getResourcePath(httpRequest)));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
    }
}
