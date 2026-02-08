package com.promptdev.repository;

import com.promptdev.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByProviderAndProviderAccountId(String provider, String providerAccountId);

    Optional<User> findByEmail(String email);
}
