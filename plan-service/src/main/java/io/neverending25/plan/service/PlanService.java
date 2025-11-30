package io.neverending25.plan.service;

import io.neverending25.plan.model.Plan;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PlanService {
    private final JpaRepository<Plan, Long> repository;

    public Page<Plan> getPlansPage(Integer page, Integer size) {
        Pageable pageable = PageRequest.of(page, size);

        return repository.findAll(pageable);
    }

    public void save(Plan plan) {
        repository.save(plan);
    }
}