package com.transmute.erp.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {
    }

    /** The signed-in account, as shown in the app header. */
    public record Me(String username, String displayName, String role) {
    }

    private final AuthenticationManager authenticationManager;
    private final AppUserRepository users;
    private final LoginThrottle throttle;
    private final HttpSessionSecurityContextRepository sessions = new HttpSessionSecurityContextRepository();

    public AuthController(AuthenticationManager authenticationManager, AppUserRepository users,
                          LoginThrottle throttle) {
        this.authenticationManager = authenticationManager;
        this.users = users;
        this.throttle = throttle;
    }

    @PostMapping("/login")
    public ResponseEntity<Object> login(@Valid @RequestBody LoginRequest body,
                                        HttpServletRequest request, HttpServletResponse response) {
        String userKey = "user:" + body.username().toLowerCase(Locale.ROOT);
        String ipKey = "ip:" + request.getRemoteAddr();
        if (throttle.isBlocked(userKey) || throttle.isBlocked(ipKey)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("status", 429,
                            "message", "Too many sign-in attempts. Wait 15 minutes and try again."));
        }
        Authentication auth;
        try {
            auth = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(body.username(), body.password()));
        } catch (BadCredentialsException | UsernameNotFoundException e) {
            throttle.recordFailure(userKey);
            throttle.recordFailure(ipKey);
            // Same answer for a wrong password and an unknown account, so usernames are not revealed.
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("status", 401, "message", "Wrong username or password"));
        }
        throttle.reset(userKey);
        if (request.getSession(false) != null) {
            request.changeSessionId();
        }
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        sessions.saveContext(context, request, response);
        return ResponseEntity.ok(me(auth.getName()));
    }

    @GetMapping("/me")
    public Me current(Authentication auth) {
        return me(auth.getName());
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request) {
        SecurityContextHolder.clearContext();
        if (request.getSession(false) != null) {
            request.getSession(false).invalidate();
        }
    }

    private Me me(String username) {
        AppUser account = users.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not signed in"));
        return new Me(account.getUsername(), account.getDisplayName(), account.getRole());
    }
}
