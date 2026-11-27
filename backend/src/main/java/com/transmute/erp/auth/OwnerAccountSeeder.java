package com.transmute.erp.auth;

import com.transmute.erp.common.Ids;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Creates the owner account on first start from OWNER_USERNAME and OWNER_PASSWORD. If the
 * account already exists, nothing is changed. Without both values, nobody can sign in.
 */
@Component
public class OwnerAccountSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(OwnerAccountSeeder.class);

    private final AppUserRepository users;
    private final PasswordEncoder encoder;
    private final String username;
    private final String password;

    public OwnerAccountSeeder(AppUserRepository users, PasswordEncoder encoder,
                              @Value("${transmute.auth.owner-username:}") String username,
                              @Value("${transmute.auth.owner-password:}") String password) {
        this.users = users;
        this.encoder = encoder;
        this.username = username == null ? "" : username.trim();
        this.password = password == null ? "" : password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (username.isEmpty() || password.isEmpty()) {
            log.warn("No owner account configured. Set OWNER_USERNAME and OWNER_PASSWORD to enable sign-in.");
            return;
        }
        if (users.findByUsername(username).isPresent()) {
            return;
        }
        AppUser owner = new AppUser();
        owner.setId(Ids.next("USR"));
        owner.setUsername(username);
        owner.setPasswordHash(encoder.encode(password));
        owner.setDisplayName("Owner");
        owner.setRole("OWNER");
        users.save(owner);
        log.info("Created owner account '{}'.", username);
    }
}
