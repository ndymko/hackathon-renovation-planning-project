package io.neverending25.api.service;

import io.neverending25.api.client.PlanClient;
import io.neverending25.api.dto.PageResponse;
import io.neverending25.api.dto.PlanResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class PlanService {
    private final PlanClient planClient;

    public PageResponse<PlanResponse> getPlans(Integer page, Integer size) {
        return planClient.getPlans(page, size);
    }

    public String createPlan(Map<String, Object> plan) {
        return planClient.createPlan(plan);
    }
}