-- Accounts that can sign in to the ERP. Passwords are stored as BCrypt hashes only.
create table app_users (
    id varchar(255) not null,
    username varchar(100) not null,
    password_hash varchar(100) not null,
    display_name varchar(255) not null,
    role varchar(50) not null,
    primary key (id),
    constraint uk_app_users_username unique (username)
);
