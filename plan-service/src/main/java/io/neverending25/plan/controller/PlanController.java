package io.neverending25.plan.controller;

import io.neverending25.plan.model.Plan;
import io.neverending25.plan.service.PlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PlanController {
    private final PlanService planService;

    @GetMapping("/plans")
    public Page<Plan> getPlansPage(
        @RequestParam(defaultValue = "0") Integer page,
        @RequestParam(defaultValue = "10") Integer size
    ) {
        return planService.getPlansPage(page, size);
    }

    @PostMapping("/plans")
    public String save(@RequestBody Plan plan) {
        planService.save(plan);

        return """
                {
                    "status": "ok""
                }
                """;
    }
}