package com.albertsp.tripsync.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

@Configuration
public class TimeConfig {

    /** Injected wherever "now" matters (cooldowns, daily caps) so tests can control it. */
    @Bean
    public Clock clock() {
        return Clock.systemDefaultZone();
    }
}
