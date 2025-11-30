package io.neverending25.plan.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "plan")
public class Plan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "plan_data", nullable = false)
    private String planData;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public Plan(String planData) {
        this.planData = planData;
        this.createdAt = LocalDateTime.now();
    }

    public Plan() {

    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPlanData() {
        return planData;
    }

    public void setPlanData(String planData) {
        this.planData = planData;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}