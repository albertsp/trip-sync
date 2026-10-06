package com.albertsp.tripsync.backend.config;

import com.albertsp.tripsync.backend.service.llm.DisabledLlmClient;
import com.albertsp.tripsync.backend.service.llm.FakeLlmClient;
import com.albertsp.tripsync.backend.service.llm.LlmClient;
import com.albertsp.tripsync.backend.service.llm.LlmProperties;
import com.albertsp.tripsync.backend.service.llm.OpenAiCompatibleClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Locale;

@Configuration
@EnableConfigurationProperties(LlmProperties.class)
public class LlmConfig {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Logger log = LoggerFactory.getLogger(LlmConfig.class);

    @Bean
    public LlmClient llmClient(LlmProperties properties) {
        String provider = properties.provider() == null ? "" : properties.provider().trim().toLowerCase(Locale.ROOT);

        return switch (provider) {
            case "fake" -> {
                log.warn("LLM_PROVIDER=fake: proposals are canned data, not for real users");
                yield new FakeLlmClient();
            }
            case "openai-compatible" -> {
                if (properties.apiKey() == null || properties.apiKey().isBlank()) {
                    log.warn("LLM_API_KEY is empty: AI generation is disabled");
                    yield new DisabledLlmClient("La generación con IA no está configurada");
                }
                log.info("LLM provider: {} model {}", properties.baseUrl(), properties.model());
                yield new OpenAiCompatibleClient(RestClient.builder().requestFactory(requestFactory(properties)), properties);
            }
            default -> {
                log.warn("Unknown LLM_PROVIDER '{}': AI generation is disabled", provider);
                yield new DisabledLlmClient("Proveedor de IA no soportado");
            }
        };
    }

    /** Fails fast on connection (5 s) and bounds the wait for the model by app.llm.timeout-ms. */
    private static JdkClientHttpRequestFactory requestFactory(LlmProperties properties) {
        HttpClient httpClient = HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofMillis(properties.timeoutMs()));
        return factory;
    }
}
