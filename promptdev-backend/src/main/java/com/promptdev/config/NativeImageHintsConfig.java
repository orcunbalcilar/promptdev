package com.promptdev.config;

import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;
import org.springframework.aot.hint.TypeReference;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.ImportRuntimeHints;

/**
 * Registers GraalVM native-image reflection hints required for running
 * the application as a native executable.
 *
 * <p>Hibernate 7.2.x introduced {@code MultiIdEntityLoaderArrayParam} which
 * uses {@code Array.newInstance(UUID.class, n)} at runtime. The GraalVM
 * reachability-metadata repository has coverage only up to Hibernate 7.2.0,
 * so {@code java.util.UUID[]} is not automatically registered. This class
 * closes that gap using Spring Boot's first-class AOT hint mechanism.</p>
 */
@Configuration(proxyBeanMethods = false)
@ImportRuntimeHints(NativeImageHintsConfig.HibernateHints.class)
public class NativeImageHintsConfig { // NOSONAR: @Configuration classes require a public constructor

    public static class HibernateHints implements RuntimeHintsRegistrar { // NOSONAR: @Configuration classes require a public constructor

        @Override
        public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
            // Hibernate 7.2.1+ MultiIdEntityLoaderArrayParam needs to
            // reflectively create UUID[] when a session factory initialises.
            hints.reflection().registerType(TypeReference.of("java.util.UUID[]"));
        }
    }
}
