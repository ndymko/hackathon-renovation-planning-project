package io.neverending25.plan.repository;

import io.neverending25.plan.model.Plan;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;


public interface PlanRepository extends JpaRepository<Plan, Long> {
    Page<Plan> findAll(Pageable pageable);
}