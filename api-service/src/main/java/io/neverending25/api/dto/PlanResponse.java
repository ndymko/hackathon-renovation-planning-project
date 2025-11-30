package io.neverending25.api.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PlanResponse {
    private Long id;
    private String planData;
    private LocalDateTime createdAt;
}