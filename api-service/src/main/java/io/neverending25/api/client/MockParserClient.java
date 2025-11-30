package io.neverending25.api.client;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.io.InputStream;
import java.util.Map;

@Component
@Profile("demo")
@RequiredArgsConstructor
public class MockParserClient implements ParserClient {
    private final ObjectMapper objectMapper;

    @Override
    public Map<String, Object> parse(String imageBase64) {
        try (InputStream is = getClass().getResourceAsStream("/demo/mock-floorplan.json")) {
            return objectMapper.readValue(is, new TypeReference<Map<String, Object>>() {});
        }
        catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}