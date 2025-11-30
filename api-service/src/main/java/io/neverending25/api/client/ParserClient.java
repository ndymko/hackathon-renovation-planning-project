package io.neverending25.api.client;

import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.PostExchange;

import java.util.Map;

public interface ParserClient {
    @PostExchange("/raster-to-vector-base64")
    Map<String, Object> parse(@RequestParam("file") String imageBase64);
}